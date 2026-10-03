import { db, dbReady, fail, failFrom, ok } from "../../../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { formText } from "@/lib/cms-validation";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Committee meetings require MySQL.", 503);
    const auth = await requirePermission("committees.manage");
    const gate = await rateLimit(`committee.meetings:${auth.user.id}`, 30, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many meetings scheduled. Try again shortly.", 429);
    const { slug } = await params;
    const committee = await db.committee.findFirst({ where: { slug, published: true }, select: { id: true } });
    if (!committee) return fail("NOT_FOUND", "Committee not found.", 404);
    const body = (await req.json().catch(() => null)) as { title?: unknown; startsAt?: unknown; location?: unknown; agenda?: unknown } | null;
    const title = formText(body?.title);
    const location = formText(body?.location);
    const agenda = formText(body?.agenda);
    const startsAt = typeof body?.startsAt === "string" ? new Date(body.startsAt) : new Date(Number.NaN);
    if (!title || title.length > 255 || !location || location.length > 255 || !agenda || agenda.length > 5000 || Number.isNaN(startsAt.getTime())) return fail("VALIDATION", "Provide a title, valid date/time, location, and agenda.", 422);
    const meeting = await db.committeeMeeting.create({ data: { committeeId: committee.id, organizerId: auth.user.id, title, startsAt, location, agenda }, select: { id: true, title: true } });
    const members = await db.committeeSeat.findMany({ where: { committeeId: committee.id, member: { userId: { not: null } } }, select: { member: { select: { userId: true } } } });
    const recipients = [...new Set(members.map((seat) => seat.member.userId).filter((id): id is string => !!id && id !== auth.user.id))];
    if (recipients.length) await db.notification.createMany({ data: recipients.map((userId) => ({ userId, title: "Committee meeting scheduled", body: title.slice(0, 180), href: "/portal/committees" })) });
    await audit("committees.meeting.create", `meeting:${meeting.id}`, { newValue: `${slug}: ${title}`, ip: clientIp(req.headers), actorOverride: auth });
    return ok(meeting);
  } catch (error) { return failFrom(error); }
}

export const dynamic = "force-dynamic";