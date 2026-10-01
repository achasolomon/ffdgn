import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp } from "@/lib/rate-limit";

/**
 * GET /api/v1/cms/metrics — public intelligence-strip figures.
 * PATCH — upsert one metric { key, value, label?, href? }. Requires `settings.manage`. Audited.
 */
export async function GET() {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "CMS requires the MySQL database.", 503);
    const rows = await db.siteMetric.findMany({ orderBy: { position: "asc" } });
    return ok(rows, { source: "mysql" });
  } catch (e) {
    return failFrom(e);
  }
}

export async function PATCH(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "CMS requires the MySQL database.", 503);
    const auth = await requirePermission("settings.manage");
    const body = (await req.json().catch(() => null)) as { key?: string; value?: string; label?: string; href?: string } | null;
    if (!body) return fail("VALIDATION", "Request body is required.", 422);
    const key = body.key ?? "";
    const value = body.value ?? "";
    if (!key || key.length > 64) return fail("VALIDATION", "Metric `key` is required (max 64 chars).", 422);
    if (!value || value.length > 32) return fail("VALIDATION", "Metric `value` is required (max 32 chars).", 422);

    const prev = await db.siteMetric.findUnique({ where: { key } });
    const count = await db.siteMetric.count();
    const label = body.label ?? key;
    const href = body.href ?? "/about";
    const updated = await db.siteMetric.upsert({
      where: { key },
      update: { value, ...(body.label ? { label: body.label } : {}), ...(body.href ? { href: body.href } : {}) },
      create: { key, value, label, href, position: count },
    });
    await audit("cms.metrics.update", `metric:${key}`, {
      previousValue: prev ? `${prev.value} | ${prev.label}` : "(new)",
      newValue: `${value} | ${updated.label}`,
      ip: clientIp(req.headers), actorOverride: auth,
    });
    return ok(updated);
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
