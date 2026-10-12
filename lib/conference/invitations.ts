import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/server-auth";
import { activeInvitation, credentialKey, encryptSecret, hashCredential, invitationOrigin, newCredentials } from "./credentials";
export { activeInvitation } from "./credentials";
import { lockConfig, problem, transactionalAudit } from "./server";

export type InvitationAction = "issue" | "resend" | "regenerate" | "revoke";
const ACTIONS: InvitationAction[] = ["issue", "resend", "regenerate", "revoke"];
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function dispatchInput(body: Record<string, unknown>, key: string | null) {
  if (!key || !uuid.test(key)) problem(422, "IDEMPOTENCY", "Supply a UUID Idempotency-Key.");
  if (!Array.isArray(body.registrationIds) || body.registrationIds.length < 1 || body.registrationIds.length > 100 || body.registrationIds.some(id => typeof id !== "string" || !uuid.test(id))) problem(422, "VALIDATION", "Choose between 1 and 100 registrations.");
  if (!ACTIONS.includes(body.action as InvitationAction)) problem(422, "VALIDATION", "Choose issue, resend, regenerate or revoke.");
  let expiresAt: Date | undefined;
  if (body.expiresAt !== undefined) {
    if (typeof body.expiresAt !== "string") problem(422, "VALIDATION", "Use an ISO expiry timestamp.");
    expiresAt = new Date(body.expiresAt as string);
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() < Date.now() + 60_000 || expiresAt.getTime() > Date.now() + 365 * 86400_000) problem(422, "VALIDATION", "Expiry must be in the future and no more than one year away.");
    if (body.action !== "issue" && body.action !== "regenerate") problem(422, "VALIDATION", "Expiry can only be set when issuing or regenerating.");
  }
  return { registrationIds: [...new Set(body.registrationIds as string[])].sort(), action: body.action as InvitationAction, key, expiresAt };
}

// Call under the event config lock; the request result is committed atomically with credentials/jobs.
export async function dispatchInvitations(eventId: string, auth: AuthContext, input: ReturnType<typeof dispatchInput>, authorize?: (tx: Prisma.TransactionClient) => Promise<unknown>) {
  if (input.action !== "revoke") { try { credentialKey(); invitationOrigin(); } catch { problem(503, "CREDENTIAL_CONFIG", "Invitation encryption key and HTTPS application origin must be configured."); } }
  const requestKey = `${eventId}:${input.key}`;
  const fingerprint = hashCredential(JSON.stringify({ ids: input.registrationIds, action: input.action, expiry: input.expiresAt?.toISOString() ?? null }));
  return db.$transaction(async tx => {
    await lockConfig(tx, eventId); if (authorize) await authorize(tx);
    const prior = await tx.conferenceDispatch.findUnique({ where: { requestKey } });
    if (prior) {
      if (prior.actorId !== auth.user.id || prior.fingerprint !== fingerprint) problem(409, "IDEMPOTENCY_CONFLICT", "This request key was already used for a different operation.");
      return prior.result;
    }
    const event = await tx.forumEvent.findUniqueOrThrow({ where: { id: eventId } });
    if (event.status === "Past" && input.action !== "revoke") problem(422, "EVENT_CLOSED", "Invitations cannot be issued for a past event.");
    const expiry = input.expiresAt ?? new Date(event.endDate.getTime() + 2 * 86400_000);
    const result = { issued: 0, regenerated: 0, queued: 0, revoked: 0, skipped: 0 };
    for (const registrationId of input.registrationIds) {
      await tx.$queryRaw`SELECT id FROM event_registrations WHERE id = ${registrationId} AND event_id = ${eventId} FOR UPDATE`;
      const registration = await tx.eventRegistration.findFirst({ where: { id: registrationId, eventId }, include: { attendee: true, user: { select: { email: true, name: true } }, invitation: true } });
      if (!registration) problem(404, "NOT_FOUND", "A selected registration does not belong to this event.");
      let invitation = registration.invitation;
      if (input.action === "revoke") {
        if (!invitation || invitation.revokedAt) { result.skipped++; continue; }
        await tx.conferenceInvitation.update({ where: { id: invitation.id }, data: { revokedAt: new Date(), credentialEnvelope: null } });
        await tx.conferenceEmailJob.updateMany({ where: { invitationId: invitation.id, state: { in: ["Queued", "Processing"] } }, data: { state: "Cancelled", leaseOwner: null, leaseUntil: null, errorCode: "INVITATION_REVOKED" } });
        result.revoked++; continue;
      }
      if (registration.status !== "Registered") problem(409, "CANCELLED", "A selected guest's registration is cancelled.");
      const email = registration.attendee?.email ?? registration.user?.email;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problem(422, "EMAIL", "Every selected guest needs a valid email address.");
      if (input.action === "issue" && invitation) {
        if (!activeInvitation(invitation, registration.status, true)) problem(409, "INACTIVE", "Regenerate an expired or revoked invitation before sending it.");
        if (await tx.conferenceEmailJob.count({ where: { invitationId: invitation.id, generation: invitation.generation } })) { result.skipped++; continue; }
      }
      if (input.action === "resend" && !activeInvitation(invitation, registration.status, true)) problem(409, "INACTIVE", "Regenerate an expired or revoked invitation before sending it.");
      if (input.action === "regenerate" || !invitation) {
        if (expiry <= new Date()) problem(422, "EXPIRY", "This event needs an explicit future invitation expiry.");
        const id = invitation?.id ?? randomUUID(), generation = (invitation?.generation ?? 0) + 1, credentials = newCredentials();
        const data = { generation, qrHash: hashCredential(credentials.qrToken), rsvpHash: hashCredential(credentials.rsvpToken), credentialEnvelope: encryptSecret(credentials, `invitation:${id}:${generation}`), expiresAt: expiry, revokedAt: null };
        if (invitation) {
          await tx.conferenceEmailJob.updateMany({ where: { invitationId: id, state: { in: ["Queued", "Processing"] } }, data: { state: "Cancelled", leaseOwner: null, leaseUntil: null, errorCode: "INVITATION_REPLACED" } });
          invitation = await tx.conferenceInvitation.update({ where: { id }, data }); result.regenerated++;
        } else { invitation = await tx.conferenceInvitation.create({ data: { id, registrationId, ...data } }); result.issued++; }
      }
      if (!invitation) problem(409, "INACTIVE", "Invitation is unavailable.");
      const pending = await tx.conferenceEmailJob.count({ where: { invitationId: invitation.id, generation: invitation.generation, state: { in: ["Queued", "Processing"] } } });
      if (pending) { result.skipped++; continue; }
      await tx.conferenceEmailJob.create({ data: { invitationId: invitation.id, generation: invitation.generation, recipient: email } }); result.queued++;
    }
    await transactionalAudit(tx, auth, eventId, `conference.invitations.${input.action}`, JSON.stringify(result));
    await tx.conferenceDispatch.create({ data: { eventId, actorId: auth.user.id, requestKey, fingerprint, result } });
    return result;
  }, { timeout: 30_000 });
}
