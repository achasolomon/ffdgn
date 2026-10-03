import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requireAuth, audit } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { formText } from "@/lib/cms-validation";

async function visibleCommitteeIds(userId: string) {
  const member = await db.member.findUnique({ where: { userId }, select: { committeeSeats: { select: { committeeId: true } } } });
  return member?.committeeSeats.map((seat) => seat.committeeId) ?? [];
}

export async function GET() {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Discussions require MySQL.", 503);
    const auth = await requireAuth();
    const managesCommittees = hasPermission(auth.user.role, "committees.manage");
    const committeeIds = managesCommittees ? [] : await visibleCommitteeIds(auth.user.id);
    const threads = await db.discussionThread.findMany({
      where: managesCommittees ? {} : { OR: [{ committeeId: null }, { committeeId: { in: committeeIds } }] },
      include: {
        author: { select: { name: true } },
        committee: { select: { slug: true, name: true } },
        replies: { orderBy: { createdAt: "asc" }, take: 25, include: { author: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "desc" }, take: 50,
    });
    return ok(threads.map((thread) => ({
      id: thread.id, title: thread.title, body: thread.body, status: thread.status,
      author: thread.author.name, committee: thread.committee,
      createdAt: thread.createdAt.toISOString(), updatedAt: thread.updatedAt.toISOString(),
      replies: thread.replies.map((reply) => ({ id: reply.id, body: reply.body, author: reply.author.name, createdAt: reply.createdAt.toISOString() })),
    })));
  } catch (error) { return failFrom(error); }
}

export async function POST(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Discussions require MySQL.", 503);
    const auth = await requireAuth();
    const gate = await rateLimit(`discussion.create:${auth.user.id}`, 15, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many discussions started. Try again shortly.", 429);
    const body = (await req.json().catch(() => null)) as { title?: unknown; body?: unknown; committeeSlug?: unknown } | null;
    if (!body) return fail("VALIDATION", "Request body is required.", 422);
    const title = formText(body.title);
    const message = formText(body.body);
    const committeeSlug = formText(body.committeeSlug);
    if (!title || title.length > 255 || message.length < 5 || message.length > 5000) return fail("VALIDATION", "Title and a 5–5,000 character message are required.", 422);
    let committeeId: string | null = null;
    if (committeeSlug) {
      const committee = await db.committee.findFirst({ where: { slug: committeeSlug, published: true }, select: { id: true } });
      if (!committee) return fail("NOT_FOUND", "Committee not found.", 404);
      const manages = hasPermission(auth.user.role, "committees.manage");
      const member = await db.member.findUnique({ where: { userId: auth.user.id }, select: { committeeSeats: { where: { committeeId: committee.id }, select: { id: true } } } });
      if (!manages && !member?.committeeSeats.length) return fail("FORBIDDEN", "You are not a member of this committee.", 403);
      committeeId = committee.id;
    }
    const thread = await db.discussionThread.create({ data: { title, body: message, authorId: auth.user.id, committeeId }, select: { id: true, title: true } });
    await audit("portal.discussion.create", `discussion:${thread.id}`, { newValue: thread.title, ip: clientIp(req.headers), actorOverride: auth });
    return ok(thread);
  } catch (error) { return failFrom(error); }
}

export const dynamic = "force-dynamic";