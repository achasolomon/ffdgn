import { Prisma } from "@prisma/client";
import { db, ok, failFrom } from "@/app/api/v1/_lib";
import { conferenceAuth, conferenceError, mutationGuard, problem, readBody, transactionalAudit } from "@/lib/conference/server";
import { parseGuestCsv } from "@/lib/conference/input";

export async function POST(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params; const { auth, event } = await conferenceAuth(eventId, "guests"); await mutationGuard(req, auth);
    if (!event.conferenceConfig?.enabled) problem(409, "NOT_ENABLED", "Enable conference operations for this event first.");
    const body = await readBody(req); if (typeof body.csv !== "string") problem(422, "VALIDATION", "Upload CSV text.");
    let rows: ReturnType<typeof parseGuestCsv>;
    try { rows = parseGuestCsv(body.csv as string); } catch (error) { problem(422, "VALIDATION", error instanceof Error ? error.message : "Invalid CSV."); }
    const emails = rows.map(row => row.guest.email).filter(Boolean);
    const [registrations, attendees] = await Promise.all([
      db.eventRegistration.findMany({ where: { eventId, OR: [{ attendee: { email: { in: emails } } }, { user: { email: { in: emails } } }] }, select: { attendee: { select: { email: true } }, user: { select: { email: true } } } }),
      db.conferenceAttendee.findMany({ where: { email: { in: emails } } }),
    ]);
    const existingEmails = new Set(registrations.flatMap(row => [row.attendee?.email, row.user?.email].filter(Boolean)));
    const identities = new Map(attendees.map(row => [row.email, row]));
    for (const row of rows) {
      if (existingEmails.has(row.guest.email)) row.errors.push("Already registered for this event; this import will not update or reactivate it.");
      const identity = identities.get(row.guest.email);
      if (identity && (identity.fullName !== row.guest.fullName || (identity.organization ?? "") !== row.guest.organization || (identity.jobTitle ?? "") !== row.guest.jobTitle || (identity.phone ?? "") !== row.guest.phone)) row.errors.push("Existing attendee details differ; review this email before importing.");
    }
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const batch = await db.$transaction(async tx => {
      await conferenceAuth(eventId, "guests", tx);
      // Opportunistically purge expired previews; committed results contain counts only.
      await tx.conferenceImport.updateMany({ where: { eventId, state: "Preview", expiresAt: { lt: new Date() } }, data: { rows: Prisma.DbNull } });
      const saved = await tx.conferenceImport.create({ data: { eventId, actorId: auth.user.id, rows, expiresAt } });
      await transactionalAudit(tx, auth, eventId, "conference.import.preview", `batch=${saved.id}; rows=${rows.length}`);
      return saved;
    });
    return ok({ id: batch.id, rows, expiresAt, valid: rows.every(row => !row.errors.length) });
  } catch (error) { return failFrom(conferenceError(error)); }
}
export const dynamic = "force-dynamic";
