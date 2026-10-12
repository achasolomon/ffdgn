import { db, ok, failFrom, paging } from "@/app/api/v1/_lib";
import { addGuest, checkCapacity, conferenceAuth, conferenceError, lockConfig, mutationGuard, problem, readBody, transactionalAudit } from "@/lib/conference/server";
import { validateGuest } from "@/lib/conference/input";

type Context = { params: Promise<{ eventId: string }> };
export async function GET(req: Request, { params }: Context) {
  try {
    const { eventId } = await params; await conferenceAuth(eventId);
    const { page, perPage, q } = paging(req);
    const where = { eventId, ...(q ? { OR: [{ attendee: { fullName: { contains: q } } }, { attendee: { email: { contains: q } } }, { user: { name: { contains: q } } }, { user: { email: { contains: q } } }] } : {}) };
    const [rows, total] = await Promise.all([db.eventRegistration.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (page - 1) * perPage, take: perPage, include: { attendee: true, user: { select: { name: true, email: true } } } }), db.eventRegistration.count({ where })]);
    return ok(rows.map(row => ({ id: row.id, fullName: row.attendee?.fullName ?? row.user?.name ?? "Unavailable", email: row.attendee?.email ?? row.user?.email ?? "", organization: row.attendee?.organization ?? "", jobTitle: row.attendee?.jobTitle ?? "", category: row.guestCategory, status: row.status, source: row.invitationSource ?? "", memberRegistration: !row.attendeeId })), { page, per_page: perPage, total, total_pages: Math.max(1, Math.ceil(total / perPage)) });
  } catch (error) { return failFrom(conferenceError(error)); }
}
export async function POST(req: Request, { params }: Context) {
  try {
    const { eventId } = await params; const { auth } = await conferenceAuth(eventId, "guests"); await mutationGuard(req, auth);
    const validated = validateGuest(await readBody(req));
    if (validated.errors.length || !validated.value) problem(422, "VALIDATION", validated.errors.join(" "));
    const guest = validated.value;
    const result = await db.$transaction(async tx => {
      const config = await lockConfig(tx, eventId); await conferenceAuth(eventId, "guests", tx);
      await checkCapacity(tx, eventId, config.capacity, 1);
      const registration = await addGuest(tx, eventId, guest);
      await transactionalAudit(tx, auth, eventId, "conference.guest.create", `registration=${registration.id}; category=${guest.category}`);
      return registration;
    });
    return ok(result);
  } catch (error) { return failFrom(conferenceError(error)); }
}
export const dynamic = "force-dynamic";
