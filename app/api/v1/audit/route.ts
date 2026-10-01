import { auditLog } from "@/lib/auth";
import { db, dbReady, failFrom, ok } from "../_lib";
import { requirePermission } from "@/lib/server-auth";

/**
 * GET /api/v1/audit — requires `audit.view` when a database is configured.
 * Preview fallback (no DATABASE_URL) returns the seeded in-memory entries.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const take = Math.min(200, Math.max(1, Number(url.searchParams.get("per_page") ?? 50)));
    if (await dbReady()) {
      await requirePermission("audit.view");
      const rows = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take });
      return ok(rows.map((a) => ({
        id: a.id, actor: a.actorName, action: a.action, resource: a.resource,
        timestamp: a.createdAt, ip: a.ip, previousValue: a.previousValue, newValue: a.newValue,
      })), { source: "mysql" });
    }
    return ok(auditLog.slice(0, take));
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
