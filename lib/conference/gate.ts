import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/server-auth";
import { activeInvitation, hashCredential } from "./credentials";
import { conferenceAuth, lockConfig, problem, transactionalAudit } from "./server";

const include = { attendee: true, user: { select: { name: true, email: true } }, invitation: true, admission: true } satisfies Prisma.EventRegistrationInclude;
type GateRecord = Prisma.EventRegistrationGetPayload<{ include: typeof include }>;
export type GateInput = { token: string } | { registrationId: string; reason?: string };
export function gateInput(body: Record<string, unknown>, manual = false): GateInput {
  if (typeof body.token === "string" && /^ffdgn1_[A-Za-z0-9_-]{43}$/.test(body.token) && !body.registrationId) return { token: body.token };
  if (typeof body.registrationId === "string" && /^[a-f0-9-]{36}$/i.test(body.registrationId) && !body.token) {
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length > 500 || (manual && reason.length < 10)) problem(422, "VALIDATION", "Manual admission requires a reason between 10 and 500 characters.");
    return { registrationId: body.registrationId, reason };
  }
  problem(422, "VALIDATION", "Supply a valid entry QR or a registration ID.");
}
export function gateSummary(record: GateRecord, requireAcceptedRsvp: boolean) {
  const invitationValid = activeInvitation(record.invitation, record.status, true);
  const blocked = record.status !== "Registered" ? "Registration cancelled" : !invitationValid ? "Invitation missing, expired or revoked" : requireAcceptedRsvp && record.conferenceRsvp !== "Accepted" ? "Accepted RSVP required" : null;
  return { id: record.id, fullName: record.attendee?.fullName ?? record.user?.name ?? "Invited guest", email: record.attendee?.email ?? record.user?.email ?? "", organization: record.attendee?.organization ?? "", jobTitle: record.attendee?.jobTitle ?? "", category: record.guestCategory, rsvp: record.conferenceRsvp, blocked, eligible: !blocked, alreadyAdmitted: !!record.admission, admission: record.admission ? { id: record.admission.id, at: record.admission.createdAt.toISOString(), actorName: record.admission.actorName, method: record.admission.method } : null };
}
async function findRecord(tx: Prisma.TransactionClient, eventId: string, input: GateInput) {
  const record = "token" in input
    ? await tx.eventRegistration.findFirst({ where: { eventId, invitation: { qrHash: hashCredential(input.token) } }, include })
    : await tx.eventRegistration.findFirst({ where: { eventId, id: input.registrationId }, include });
  if (!record) problem(404, "NOT_FOUND", "Guest credential or registration not found for this event.");
  return record;
}
// QR values are accepted only in POST bodies and are never logged or returned.
export async function verifyGate(eventId: string, input: GateInput) {
  const config = await db.conferenceConfig.findUnique({ where: { eventId } });
  if (!config?.enabled) problem(409, "NOT_ENABLED", "Conference operations is disabled for this event.");
  return gateSummary(await findRecord(db, eventId, input), config.requireAcceptedRsvp);
}
export async function admitGuest(eventId: string, auth: AuthContext, input: GateInput) {
  if ("registrationId" in input && (!input.reason || input.reason.trim().length < 10 || input.reason.length > 500)) problem(422, "VALIDATION", "Record a manual admission reason between 10 and 500 characters.");
  return db.$transaction(async tx => {
    const config = await lockConfig(tx, eventId);
    await conferenceAuth(eventId, "gate", tx);
    const initial = await findRecord(tx, eventId, input);
    await tx.$queryRaw`SELECT id FROM event_registrations WHERE id = ${initial.id} FOR UPDATE`;
    const record = await findRecord(tx, eventId, input); // recheck after invitation/RSVP mutation races
    const summary = gateSummary(record, config.requireAcceptedRsvp);
    if (summary.blocked) problem(409, "ENTRY_BLOCKED", summary.blocked);
    if (record.admission) return { ...summary, alreadyAdmitted: true };
    const manual = "registrationId" in input;
    await tx.conferenceAdmission.create({ data: { registrationId: record.id, actorId: auth.user.id, actorName: auth.user.name, method: manual ? "Manual" : "QR", reason: manual ? input.reason : null, invitationGeneration: record.invitation!.generation } });
    await transactionalAudit(tx, auth, eventId, "conference.admission", `registration=${record.id}; method=${manual ? "Manual" : "QR"}`);
    return { ...gateSummary(await findRecord(tx, eventId, input), config.requireAcceptedRsvp), alreadyAdmitted: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
export async function lookupGate(eventId: string, q: string) {
  const config = await db.conferenceConfig.findUnique({ where: { eventId } });
  if (!config?.enabled) problem(409, "NOT_ENABLED", "Conference operations is disabled for this event.");
  if (q.length < 2) return [];
  const records = await db.eventRegistration.findMany({ where: { eventId, OR: [{ attendee: { fullName: { contains: q } } }, { attendee: { email: { contains: q } } }, { user: { name: { contains: q } } }, { user: { email: { contains: q } } }] }, include, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 25 });
  return records.map(record => gateSummary(record, config.requireAcceptedRsvp));
}
