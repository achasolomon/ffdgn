import { Prisma } from "@prisma/client";
import { db, dbReady } from "@/lib/db";
import { AuthError, requireAuth, type AuthContext } from "@/lib/server-auth";
import { STAFF_ROLES } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { conferenceAllowed, trustedMutationOrigin, type ConferenceCapability, type GuestInput } from "./input";

export function conferenceEnabled() { return process.env.CONFERENCE_MODULE_ENABLED === "true"; }
export function problem(status: number, code: string, message: string): never { throw new AuthError(status, code, message); }

export async function conferenceAuth(eventId: string, capability: ConferenceCapability = "view", tx?: Prisma.TransactionClient) {
  if (!conferenceEnabled()) problem(404, "NOT_FOUND", "Conference operations is not enabled.");
  const auth = await requireAuth();
  if (!STAFF_ROLES.includes(auth.user.role)) problem(403, "FORBIDDEN", "Staff access is required.");
  if (!(await dbReady())) problem(503, "UNAVAILABLE", "Conference operations requires MySQL.");
  const store = tx ?? db;
  const assignment = await store.conferenceStaffAssignment.findUnique({ where: { eventId_userId: { eventId, userId: auth.user.id } } });
  if (!conferenceAllowed(auth.user.role, assignment?.role ?? null, capability)) problem(403, "FORBIDDEN", "You do not have this permission for this event.");
  const event = await store.forumEvent.findUnique({ where: { id: eventId }, select: { id: true, slug: true, title: true, conferenceConfig: true } });
  if (!event) problem(404, "NOT_FOUND", "Event not found.");
  return { auth, event };
}

export async function mutationGuard(req: Request, auth: AuthContext, scope: "write" | "gate" = "write") {
  if (!trustedMutationOrigin(req.headers.get("origin"), process.env.NEXTAUTH_URL ?? "")) problem(403, "ORIGIN", "This request must come from the configured application origin.");
  const limit = await rateLimit(`conference.${scope}:${auth.user.id}:${clientIp(req.headers)}`, scope === "gate" ? 240 : 60, 60_000);
  if (!limit.ok) problem(429, "RATE_LIMITED", "Too many operations. Please wait and retry.");
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  if (!req.headers.get("content-type")?.startsWith("application/json")) problem(415, "CONTENT_TYPE", "Use JSON for this request.");
  const reader = req.body?.getReader();
  if (!reader) problem(422, "VALIDATION", "A request body is required.");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 600_000) { await reader.cancel(); problem(413, "TOO_LARGE", "Request is too large."); }
    chunks.push(value);
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) problem(422, "VALIDATION", "A JSON object is required.");
    return parsed as Record<string, unknown>;
  } catch (error) { if (error instanceof AuthError) throw error; problem(422, "VALIDATION", "Invalid JSON."); }
}

export async function transactionalAudit(tx: Prisma.TransactionClient, auth: AuthContext, eventId: string, action: string, summary: string) {
  await tx.auditLog.create({ data: { actorId: auth.user.id, actorName: auth.user.name, action, resource: `conference:${eventId}`, ip: "app", newValue: summary } });
}

export async function lockConfig(tx: Prisma.TransactionClient, eventId: string) {
  await tx.$queryRaw`SELECT event_id FROM conference_config WHERE event_id = ${eventId} FOR UPDATE`;
  const config = await tx.conferenceConfig.findUnique({ where: { eventId } });
  if (!config?.enabled) problem(409, "NOT_ENABLED", "Enable conference operations for this event first.");
  return config;
}

export async function existingGuest(tx: Prisma.TransactionClient, eventId: string, email: string) {
  return tx.eventRegistration.findFirst({ where: { eventId, OR: [{ attendee: { email } }, { user: { email } }] }, select: { id: true } });
}

export async function addGuest(tx: Prisma.TransactionClient, eventId: string, guest: GuestInput) {
  if (guest.email && await existingGuest(tx, eventId, guest.email)) problem(409, "DUPLICATE", "A guest or member registration already exists for this email. Find the guest in the directory and print their tag.");
  // Identity reuse never overwrites a person's data from another event.
  let attendee = guest.email ? await tx.conferenceAttendee.findUnique({ where: { email: guest.email } }) : null;
  if (attendee && (attendee.fullName !== guest.fullName || (attendee.organization ?? "") !== guest.organization || (attendee.jobTitle ?? "") !== guest.jobTitle || (attendee.phone ?? "") !== guest.phone)) problem(409, "IDENTITY_CONFLICT", "This email belongs to an existing attendee with different details. Review the record before importing.");
  if (!attendee) attendee = await tx.conferenceAttendee.create({ data: { fullName: guest.fullName, email: guest.email || null, phone: guest.phone || null, organization: guest.organization || null, jobTitle: guest.jobTitle || null } });
  const account = guest.email ? await tx.user.findUnique({ where: { email: guest.email }, select: { id: true } }) : null;
  return tx.eventRegistration.create({ data: { eventId, userId: account?.id, attendeeId: attendee.id, guestCategory: guest.category, invitationSource: guest.invitationSource || null }, select: { id: true } });
}

export async function checkCapacity(tx: Prisma.TransactionClient, eventId: string, capacity: number | null, additions: number) {
  if (capacity !== null && await tx.eventRegistration.count({ where: { eventId, status: "Registered" } }) + additions > capacity) problem(409, "CAPACITY", "The guest list would exceed the event capacity.");
}

export function conferenceError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return new AuthError(409, "DUPLICATE", "A matching record was added concurrently. Refresh and review the guest list.");
    if (error.code === "P2034") return new AuthError(409, "CONFLICT", "Another operation changed these records. Please retry.");
    if (error.code === "P2021" || error.code === "P2022") return new AuthError(503, "MIGRATION_REQUIRED", "Conference database migration has not been applied.");
  }
  return error;
}
