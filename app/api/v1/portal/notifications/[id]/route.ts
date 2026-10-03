import { db, dbReady, fail, failFrom, ok } from "../../../_lib";
import { requireAuth } from "@/lib/server-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Notifications require MySQL.", 503);
    const auth = await requireAuth();
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as { read?: unknown } | null;
    if (typeof body?.read !== "boolean") return fail("VALIDATION", "Provide a read boolean.", 422);
    const existing = await db.notification.findFirst({ where: { id, userId: auth.user.id }, select: { id: true } });
    if (!existing) return fail("NOT_FOUND", "Notification not found.", 404);
    const result = await db.notification.update({ where: { id }, data: { readAt: body.read ? new Date() : null }, select: { id: true, readAt: true } });
    return ok({ id: result.id, read: !!result.readAt });
  } catch (error) { return failFrom(error); }
}

export const dynamic = "force-dynamic";