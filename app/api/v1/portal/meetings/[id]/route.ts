import { db, dbReady, fail, failFrom, ok } from "../../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp } from "@/lib/rate-limit";
import { formText } from "@/lib/cms-validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Meeting records require MySQL.", 503);
    const auth = await requirePermission("committees.manage");
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as { minutes?: unknown } | null;
    if (!body || typeof body.minutes !== "string" || body.minutes.length > 20000) return fail("VALIDATION", "Minutes must be text up to 20,000 characters.", 422);
    const existing = await db.committeeMeeting.findUnique({ where: { id }, select: { title: true, minutes: true } });
    if (!existing) return fail("NOT_FOUND", "Meeting not found.", 404);
    const minutes = formText(body.minutes);
    const meeting = await db.committeeMeeting.update({ where: { id }, data: { minutes: minutes || null }, select: { id: true, minutes: true } });
    await audit("committees.meeting.minutes", `meeting:${id}`, { previousValue: existing.minutes?.slice(0, 150), newValue: minutes.slice(0, 150), ip: clientIp(req.headers), actorOverride: auth });
    return ok(meeting);
  } catch (error) { return failFrom(error); }
}

export const dynamic = "force-dynamic";