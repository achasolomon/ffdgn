import { db, dbReady, fail, failFrom, ok } from "../_lib";
import { requirePermission } from "@/lib/server-auth";

/**
 * GET /api/v1/audit — append-only audit trail. Always requires `audit.view`.
 *
 * There is deliberately no unauthenticated fallback. The previous
 * `dbReady()`-gated implementation returned seeded in-memory entries when the
 * database was unreachable, which meant the one situation in which an operator
 * most needs the trail (a compromised or broken store) served unverified
 * content. Audit endpoints fail closed.
 */
export async function GET(req: Request) {
  try {
    const auth = await requirePermission("audit.view");

    if (!(await dbReady())) {
      return fail("UNAVAILABLE", "The audit store is not reachable. No audit history can be served.", 503);
    }

    const url = new URL(req.url);
    const take = Math.min(200, Math.max(1, Number(url.searchParams.get("per_page") ?? 50)));
    const action = url.searchParams.get("action");
    const resource = url.searchParams.get("resource");

    const rows = await db.auditLog.findMany({
      where: {
        ...(action ? { action: { startsWith: action } } : {}),
        ...(resource ? { resource: { startsWith: resource } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    // Reading the trail is itself an auditable act.
    await db.auditLog.create({
      data: {
        actorId: auth.user.id,
        actorName: auth.user.name,
        action: "audit.view",
        resource: `audit:${rows.length}`,
        previousValue: url.searchParams.get("action") ?? "(all)",
        newValue: `take=${take}`,
        ip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "app",
      },
    }).catch((e) => console.error("[audit] could not log audit.view", e));

    return ok(
      rows.map((a) => ({
        id: a.id,
        actor: a.actorName,
        actorId: a.actorId,
        action: a.action,
        resource: a.resource,
        timestamp: a.createdAt,
        ip: a.ip,
        previousValue: a.previousValue,
        newValue: a.newValue,
      })),
      { source: "mysql", total: rows.length },
    );
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";