import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission } from "@/lib/server-auth";

export async function GET(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "The Secretariat inbox requires MySQL.", 503);
    await requirePermission("contact.manage");
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "open";
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    if (status !== "open" && status !== "handled" && status !== "all") return fail("VALIDATION", "Status must be open, handled, or all.", 422);
    const where = {
      ...(status === "open" ? { handled: false } : status === "handled" ? { handled: true } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { subject: { contains: q } }] } : {}),
    };
    const [total, rows] = await Promise.all([
      db.contactMessage.count({ where }),
      db.contactMessage.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
    ]);
    return ok(rows, { total, source: "mysql" });
  } catch (e) { return failFrom(e); }
}

export const dynamic = "force-dynamic";