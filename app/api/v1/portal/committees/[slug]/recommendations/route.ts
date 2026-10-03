import { db, dbReady, fail, failFrom, ok } from "../../../../_lib";
import { requireAuth, audit } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { formText } from "@/lib/cms-validation";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Committee recommendations require MySQL.", 503);
    const auth = await requireAuth();
    const gate = await rateLimit(`committee.recommendations:${auth.user.id}`, 20, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many recommendations submitted. Try again shortly.", 429);
    const { slug } = await params;
    const committee = await db.committee.findFirst({ where: { slug, published: true }, select: { id: true } });
    if (!committee) return fail("NOT_FOUND", "Committee not found.", 404);
    const body = (await req.json().catch(() => null)) as { title?: unknown; rationale?: unknown; recommendation?: unknown; submit?: unknown } | null;
    const title = formText(body?.title);
    const rationale = formText(body?.rationale);
    const recommendation = formText(body?.recommendation);
    if (!title || title.length > 255 || !rationale || rationale.length > 10000 || !recommendation || recommendation.length > 20000) return fail("VALIDATION", "Title, rationale, and recommendation are required within field limits.", 422);
    const manages = hasPermission(auth.user.role, "committees.manage");
    const member = await db.member.findUnique({ where: { userId: auth.user.id }, select: { committeeSeats: { where: { committeeId: committee.id }, select: { id: true } } } });
    if (!manages && !member?.committeeSeats.length) return fail("FORBIDDEN", "You are not a member of this committee.", 403);
    const status = body?.submit === true ? "Submitted" : "Draft";
    const record = await db.committeeRecommendation.create({ data: { committeeId: committee.id, authorId: auth.user.id, title, rationale, recommendation, status }, select: { id: true, title: true, status: true } });
    if (status === "Submitted") {
      const reviewers = await db.user.findMany({ where: { role: { in: ["committee_manager", "secretariat_admin", "super_admin"] }, isActive: true, id: { not: auth.user.id } }, select: { id: true } });
      if (reviewers.length) await db.notification.createMany({ data: reviewers.map((user) => ({ userId: user.id, title: "Recommendation submitted", body: title.slice(0, 180), href: "/portal/committees" })) });
    }
    await audit("committees.recommendation.create", `recommendation:${record.id}`, { newValue: `${slug}: ${status} · ${title}`, ip: clientIp(req.headers), actorOverride: auth });
    return ok(record);
  } catch (error) { return failFrom(error); }
}

export const dynamic = "force-dynamic";