import { db, dbReady, fail, failFrom, ok } from "../../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp } from "@/lib/rate-limit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "The Secretariat inbox requires MySQL.", 503);
    const auth = await requirePermission("contact.manage");
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as { handled?: unknown } | null;
    if (typeof body?.handled !== "boolean") return fail("VALIDATION", "Provide a handled boolean.", 422);
    const existing = await db.contactMessage.findUnique({ where: { id } });
    if (!existing) return fail("NOT_FOUND", "Message not found.", 404);
    const updated = await db.contactMessage.update({ where: { id }, data: { handled: body.handled }, select: { id: true, handled: true } });
    if (updated.handled !== existing.handled) await audit("contact.message.handle", `contact:${id}`, {
      previousValue: existing.handled ? "handled" : "open", newValue: updated.handled ? "handled" : "open",
      ip: clientIp(req.headers), actorOverride: auth,
    });
    return ok(updated);
  } catch (e) { return failFrom(e); }
}

export const dynamic = "force-dynamic";