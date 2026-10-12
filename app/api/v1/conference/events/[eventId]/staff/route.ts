import { ConferenceStaffRole } from "@prisma/client";
import { db, ok, failFrom } from "@/app/api/v1/_lib";
import { STAFF_ROLES } from "@/lib/auth";
import { conferenceAuth, conferenceError, mutationGuard, problem, readBody, transactionalAudit } from "@/lib/conference/server";

type Context = { params: Promise<{ eventId: string }> };
export async function GET(_req: Request, { params }: Context) {
  try { const { eventId } = await params; await conferenceAuth(eventId, "settings"); return ok(await db.conferenceStaffAssignment.findMany({ where: { eventId }, select: { userId: true, role: true, user: { select: { name: true, email: true } } } })); }
  catch (error) { return failFrom(conferenceError(error)); }
}
export async function POST(req: Request, { params }: Context) {
  try {
    const { eventId } = await params; const { auth } = await conferenceAuth(eventId, "settings"); await mutationGuard(req, auth);
    if (!["super_admin", "secretariat_admin"].includes(auth.user.role)) problem(403, "FORBIDDEN", "Only institutional administrators can grant or revoke event staff access.");
    const body = await readBody(req);
    if (typeof body.email !== "string" || !(body.role === null || Object.values(ConferenceStaffRole).includes(body.role as ConferenceStaffRole))) problem(422, "VALIDATION", "Supply a staff email and a supported role, or null to revoke.");
    const user = await db.user.findUnique({ where: { email: (body.email as string).trim().toLowerCase() } });
    if (!user?.isActive || !STAFF_ROLES.includes(user.role)) problem(422, "VALIDATION", "Choose an active institutional staff account.");
    const result = await db.$transaction(async tx => {
      if (body.role === null) await tx.conferenceStaffAssignment.deleteMany({ where: { eventId, userId: user.id } });
      else await tx.conferenceStaffAssignment.upsert({ where: { eventId_userId: { eventId, userId: user.id } }, create: { eventId, userId: user.id, role: body.role as ConferenceStaffRole }, update: { role: body.role as ConferenceStaffRole } });
      await transactionalAudit(tx, auth, eventId, "conference.staff.update", `user=${user.id}; role=${body.role ?? "revoked"}`);
      return { userId: user.id, role: body.role };
    });
    return ok(result);
  } catch (error) { return failFrom(conferenceError(error)); }
}
export const dynamic = "force-dynamic";
