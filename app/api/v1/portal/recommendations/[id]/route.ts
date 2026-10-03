import { db, dbReady, fail, failFrom, ok } from "../../../_lib";
import { requireAuth, audit } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";

const MANAGER_TRANSITIONS: Record<string, string[]> = {
  Submitted: ["Under_Review", "Rejected", "Archived"],
  Under_Review: ["Approved", "Rejected", "Archived"],
  Approved: ["Archived"],
  Rejected: ["Archived"],
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Recommendation workflow requires MySQL.", 503);
    const auth = await requireAuth();
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as { to?: unknown } | null;
    const to = typeof body?.to === "string" ? body.to : "";
    const record = await db.committeeRecommendation.findUnique({ where: { id } });
    if (!record) return fail("NOT_FOUND", "Recommendation not found.", 404);
    const manager = hasPermission(auth.user.role, "committees.manage");
    const ownerSubmit = record.authorId === auth.user.id && record.status === "Draft" && to === "Submitted";
    const managerTransition = manager && (MANAGER_TRANSITIONS[record.status] ?? []).includes(to);
    if (!ownerSubmit && !managerTransition) return fail("FORBIDDEN", "That recommendation transition is not permitted.", 403);
    const updated = await db.committeeRecommendation.update({ where: { id }, data: { status: to as never }, select: { id: true, title: true, status: true, authorId: true } });
    await db.notification.create({ data: { userId: updated.authorId, title: "Recommendation status updated", body: `${updated.title}: ${updated.status.replace(/_/g, " ")}`.slice(0, 512), href: "/portal/committees" } });
    await audit("committees.recommendation.transition", `recommendation:${id}`, { previousValue: record.status, newValue: to, ip: clientIp(req.headers), actorOverride: auth });
    return ok({ id: updated.id, status: updated.status });
  } catch (error) { return failFrom(error); }
}

export const dynamic = "force-dynamic";