import { db, dbReady, fail, failFrom, ok } from "../../../../_lib";
import { requireAuth, audit } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { formText } from "@/lib/cms-validation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Discussion replies require MySQL.", 503);
    const auth = await requireAuth();
    const gate = await rateLimit(`discussion.reply:${auth.user.id}`, 30, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many replies. Try again shortly.", 429);
    const { id } = await params;
    const thread = await db.discussionThread.findUnique({ where: { id }, include: { replies: { select: { authorId: true } } } });
    if (!thread || thread.status !== "Open") return fail("NOT_FOUND", "Open discussion not found.", 404);
    if (thread.committeeId && !hasPermission(auth.user.role, "committees.manage")) {
      const member = await db.member.findUnique({ where: { userId: auth.user.id }, select: { committeeSeats: { where: { committeeId: thread.committeeId }, select: { id: true } } } });
      if (!member?.committeeSeats.length) return fail("NOT_FOUND", "Open discussion not found.", 404);
    }
    const body = (await req.json().catch(() => null)) as { body?: unknown } | null;
    const message = formText(body?.body);
    if (message.length < 2 || message.length > 5000) return fail("VALIDATION", "Reply must be 2–5,000 characters.", 422);
    const reply = await db.discussionReply.create({ data: { threadId: id, authorId: auth.user.id, body: message }, select: { id: true } });
    const recipients = [...new Set([thread.authorId, ...thread.replies.map((item) => item.authorId)].filter((userId) => userId !== auth.user.id))];
    if (recipients.length) await db.notification.createMany({ data: recipients.map((userId) => ({ userId, title: "New discussion reply", body: thread.title.slice(0, 180), href: "/portal/discussions" })) });
    await audit("portal.discussion.reply", `discussion:${id}`, { newValue: reply.id, ip: clientIp(req.headers), actorOverride: auth });
    return ok(reply);
  } catch (error) { return failFrom(error); }
}

export const dynamic = "force-dynamic";