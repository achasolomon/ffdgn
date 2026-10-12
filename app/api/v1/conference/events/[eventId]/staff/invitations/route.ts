import { Prisma } from "@prisma/client";
import { db, ok, failFrom } from "@/app/api/v1/_lib";
import { conferenceAuth, conferenceError, mutationGuard, problem, readBody, transactionalAudit } from "@/lib/conference/server";
import { newStaffInvitation } from "@/lib/conference/staff-invitations";
import { decryptSecret, encryptSecret } from "@/lib/conference/credentials";
import { emailReadiness } from "@/lib/conference/email-worker";

export async function POST(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params, { auth } = await conferenceAuth(eventId, "settings"); await mutationGuard(req, auth);
    if (!["super_admin", "secretariat_admin"].includes(auth.user.role)) problem(403, "FORBIDDEN", "Only administrators can resend staff invitations.");
    const body = await readBody(req), key = req.headers.get("idempotency-key");
    if (!key || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key) || typeof body.userId !== "string") problem(422, "VALIDATION", "Choose a staff member and supply a request key.");
    const userId = body.userId, requestKey = `staff-resend:${eventId}:${key.toLowerCase()}`;
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
      const current = await conferenceAuth(eventId, "settings", tx);
      if (!["super_admin", "secretariat_admin"].includes(current.auth.user.role)) problem(403, "FORBIDDEN", "Only administrators can resend staff invitations.");
      const prior = await tx.conferenceDispatch.findUnique({ where: { requestKey } });
      if (prior) { if (prior.actorId !== auth.user.id || prior.fingerprint !== userId) problem(409, "IDEMPOTENCY_CONFLICT", "This request was used for another staff member."); return prior.result; }
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const invitation = await tx.conferenceStaffInvitation.findUnique({ where: { userId }, include: { user: true } });
      const assigned = await tx.conferenceStaffAssignment.findUnique({ where: { eventId_userId: { eventId, userId } } });
      if (!invitation || !assigned || invitation.user.role !== "guest_desk" || !invitation.user.isActive || invitation.consumedAt) problem(409, "INVITATION", "Only staff who have not created their password can receive a new setup link.");
      if (invitation.state === "Processing") problem(409, "PROCESSING", "The current email is being sent. Wait a moment before resending.");
      const setup = newStaffInvitation();
      const envelope = encryptSecret(decryptSecret(setup.credentialEnvelope, `staff:${setup.id}`), `staff:${invitation.id}`);
      await tx.conferenceStaffInvitation.update({ where: { id: invitation.id }, data: { tokenHash: setup.tokenHash, credentialEnvelope: envelope, expiresAt: setup.expiresAt, eventId, state: "Queued", attempts: 0, availableAt: new Date(), leaseOwner: null, leaseUntil: null, errorCode: null } });
      await transactionalAudit(tx, auth, eventId, "conference.staff.invitation.resend", `user=${userId}; previous link invalidated`);
      const result = { invitation: "Queued", emailConfigured: emailReadiness() };
      await tx.conferenceDispatch.create({ data: { eventId, actorId: auth.user.id, requestKey, fingerprint: userId, result } }); return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    const response = ok(result); response.headers.set("Cache-Control", "private, no-store"); return response;
  } catch (error) { const response = failFrom(conferenceError(error)); response.headers.set("Cache-Control", "private, no-store"); return response; }
}
