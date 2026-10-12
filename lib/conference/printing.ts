import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/server-auth";
import { conferenceAuth, lockConfig, problem, transactionalAudit } from "./server";
import { conferenceAllowed } from "./input";
import { activeInvitation, invitationCredentials } from "./credentials";
import { tagCredential } from "./tag-credentials";
import { qrImage } from "./render-invitation";

export type BadgeSnapshot = { version: 1 | 2; widthMm: 100; heightMm: 140; fullName: string; organization: string; jobTitle: string; category: string; eventTitle: string; admissionId: string; registrationId?: string; invitationId?: string; generation?: number };
export function printSnapshot(raw: Prisma.JsonValue): BadgeSnapshot {
  const value = raw as unknown as BadgeSnapshot;
  if (!value || ![1, 2].includes(value.version) || value.widthMm !== 100 || value.heightMm !== 140 || [value.fullName, value.organization, value.jobTitle, value.category, value.eventTitle, value.admissionId].some(item => typeof item !== "string") || (value.version === 2 && (typeof value.registrationId !== "string" || typeof value.invitationId !== "string" || !Number.isInteger(value.generation)))) problem(409, "SNAPSHOT", "Badge snapshot is unavailable.");
  return value;
}
async function ownership(tx: Prisma.TransactionClient, eventId: string, actorId: string, auth: AuthContext) {
  if (actorId === auth.user.id) return;
  const assignment = await tx.conferenceStaffAssignment.findUnique({ where: { eventId_userId: { eventId, userId: auth.user.id } } });
  if (!conferenceAllowed(auth.user.role, assignment?.role ?? null, "settings")) problem(403, "FORBIDDEN", "Only the requesting operator or event manager can use this print request.");
}
export async function prepareBadgePrint(eventId: string, auth: AuthContext, body: Record<string, unknown>, key: string | null) {
  if (!key || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key)) problem(422, "VALIDATION", "Supply a UUID Idempotency-Key.");
  if (typeof body.registrationId !== "string" || !/^[a-f0-9-]{36}$/i.test(body.registrationId)) problem(422, "VALIDATION", "Supply a registration ID.");
  const registrationId = body.registrationId as string, reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length > 500) problem(422, "VALIDATION", "Reprint reason must be at most 500 characters.");
  const requestKey = `${eventId}:${key.toLowerCase()}`, fingerprint = createHash("sha256").update(JSON.stringify({ registrationId, reason, actorId: auth.user.id })).digest("hex");
  return db.$transaction(async tx => {
    await lockConfig(tx, eventId); await conferenceAuth(eventId, "gate", tx);
    const prior = await tx.conferenceBadgePrint.findUnique({ where: { requestKey } });
    if (prior) { if (prior.fingerprint !== fingerprint) problem(409, "IDEMPOTENCY_CONFLICT", "This request key was used for a different print request."); return { id: prior.id, state: prior.state }; }
    await tx.$queryRaw`SELECT id FROM event_registrations WHERE id = ${registrationId} FOR UPDATE`;
    const record = await tx.eventRegistration.findFirst({ where: { id: registrationId, eventId }, include: { attendee: true, user: { select: { name: true } }, event: { select: { title: true } }, admission: true } });
    if (!record || record.status !== "Registered") problem(409, "PRINT_UNAVAILABLE", "A current registration is required for printing.");
    const invitation = await tagCredential(tx, eventId, registrationId);
    const existing = await tx.conferenceBadgePrint.findFirst({ where: { registrationId }, select: { id: true } });
    if (existing && reason.length < 10) problem(422, "REPRINT_REASON", "Record a reprint reason between 10 and 500 characters, or reopen your existing print request.");
    const snapshot: BadgeSnapshot = { version: 2, widthMm: 100, heightMm: 140, fullName: record.attendee?.fullName ?? record.user?.name ?? "Invited guest", organization: record.attendee?.organization ?? "", jobTitle: record.attendee?.jobTitle ?? "", category: record.guestCategory, eventTitle: record.event.title, admissionId: record.admission?.id ?? "", registrationId, invitationId: invitation.id, generation: invitation.generation };
    const request = await tx.conferenceBadgePrint.create({ data: { registrationId, actorId: auth.user.id, requestKey, fingerprint, snapshot, reprintReason: reason || null } });
    await transactionalAudit(tx, auth, eventId, "conference.print.prepare", `print=${request.id}; registration=${registrationId}; reprint=${!!existing}; physicalPrint=unconfirmed`);
    return { id: request.id, state: request.state };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
export async function readBadgePrint(eventId: string, id: string, auth: AuthContext) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) problem(422, "VALIDATION", "Supply a print request ID.");
  await conferenceAuth(eventId, "gate");
  const config = await db.conferenceConfig.findUnique({ where: { eventId } });
  if (!config?.enabled) problem(409, "NOT_ENABLED", "Conference operations is disabled.");
  const request = await db.conferenceBadgePrint.findFirst({ where: { id, registration: { eventId } }, include: { registration: { select: { status: true, admission: { select: { id: true } }, invitation: true } } } });
  if (!request) problem(404, "NOT_FOUND", "Print request not found for this event.");
  await ownership(db, eventId, request.actorId, auth);
  if (request.state === "Cancelled" || request.registration.status !== "Registered") problem(409, "PRINT_UNAVAILABLE", "This print request is cancelled or the registration is no longer eligible.");
  const snapshot = printSnapshot(request.snapshot), invitation = request.registration.invitation;
  let qrDataUrl: string | null = null;
  if (snapshot.version === 2) {
    if (!activeInvitation(invitation, request.registration.status, true) || invitation.id !== snapshot.invitationId || invitation.generation !== snapshot.generation) problem(409, "PRINT_UNAVAILABLE", "This tag QR is expired, revoked or replaced. Prepare a new print request.");
    qrDataUrl = `data:image/png;base64,${(await qrImage(invitationCredentials(invitation).qrToken)).toString("base64")}`;
  } else if (!request.registration.admission) problem(409, "PRINT_UNAVAILABLE", "The legacy badge requires an admission.");
  return { id: request.id, state: request.state, snapshot, qrDataUrl, reason: request.reprintReason, createdAt: request.createdAt.toISOString() };
}
export async function listBadgePrints(eventId: string, registrationId: string, auth: AuthContext) {
  if (!/^[a-f0-9-]{36}$/i.test(registrationId)) problem(422, "VALIDATION", "Supply a registration ID.");
  const { event } = await conferenceAuth(eventId, "gate");
  if (!event.conferenceConfig?.enabled) problem(409, "NOT_ENABLED", "Conference operations is disabled.");
  const assignment = await db.conferenceStaffAssignment.findUnique({ where: { eventId_userId: { eventId, userId: auth.user.id } } });
  const manager = conferenceAllowed(auth.user.role, assignment?.role ?? null, "settings");
  return db.conferenceBadgePrint.findMany({ where: { registrationId, registration: { eventId }, ...(!manager ? { actorId: auth.user.id } : {}) }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 10, select: { id: true, state: true, createdAt: true, reprintReason: true } });
}
export async function finishBadgePrint(eventId: string, auth: AuthContext, body: Record<string, unknown>) {
  if (typeof body.id !== "string" || !/^[a-f0-9-]{36}$/i.test(body.id) || !["Confirmed", "Cancelled"].includes(String(body.state))) problem(422, "VALIDATION", "Choose a print request and Confirmed or Cancelled.");
  const id = body.id as string, state = body.state as "Confirmed" | "Cancelled";
  return db.$transaction(async tx => {
    await lockConfig(tx, eventId); await conferenceAuth(eventId, "gate", tx);
    await tx.$queryRaw`SELECT id FROM conference_badge_prints WHERE id = ${id} FOR UPDATE`;
    const request = await tx.conferenceBadgePrint.findFirst({ where: { id, registration: { eventId } }, include: { registration: { select: { status: true } } } });
    if (!request) problem(404, "NOT_FOUND", "Print request not found for this event.");
    await ownership(tx, eventId, request.actorId, auth);
    if (request.state === state) return { id, state };
    if (request.state !== "Prepared") problem(409, "PRINT_FINAL", "This print request has already been finalized. Create a new request for a reprint.");
    await tx.$queryRaw`SELECT id FROM event_registrations WHERE id = ${request.registrationId} FOR UPDATE`;
    const registration = await tx.eventRegistration.findUniqueOrThrow({ where: { id: request.registrationId }, select: { status: true, invitation: true } });
    if (state === "Confirmed" && registration.status !== "Registered") problem(409, "PRINT_UNAVAILABLE", "A cancelled registration cannot be confirmed as printed.");
    const snapshot = printSnapshot(request.snapshot), invitation = registration.invitation;
    if (state === "Confirmed" && snapshot.version === 2 && (!activeInvitation(invitation, registration.status, true) || invitation.id !== snapshot.invitationId || invitation.generation !== snapshot.generation)) problem(409, "PRINT_UNAVAILABLE", "This tag QR is expired, revoked or replaced. Prepare a new print request.");
    await tx.conferenceBadgePrint.update({ where: { id }, data: { state } });
    await tx.conferenceBadgePrintAction.create({ data: { printId: id, actorId: auth.user.id, previous: request.state, state } });
    await transactionalAudit(tx, auth, eventId, `conference.print.${state.toLowerCase()}`, `print=${id}; registration=${request.registrationId}; evidence=operator`);
    return { id, state };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
