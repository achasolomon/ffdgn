import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp } from "@/lib/rate-limit";

const ALLOWED_KEYS = new Set([
  "hero.eyebrow", "hero.title", "hero.lede", "hero.cta_primary", "hero.cta_secondary",
  "site.established", "site.seat", "site.character",
]);

/**
 * GET /api/v1/cms/settings — public site copy (hero, identity strip).
 * PATCH — upsert one setting { key, value }. Requires `settings.manage`. Audited.
 */
export async function GET() {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "CMS requires the MySQL database.", 503);
    const rows = await db.siteSetting.findMany({ orderBy: { key: "asc" } });
    return ok(Object.fromEntries(rows.map((r) => [r.key, r.value])), { source: "mysql" });
  } catch (e) {
    return failFrom(e);
  }
}

export async function PATCH(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "CMS requires the MySQL database.", 503);
    const auth = await requirePermission("settings.manage");
    const body = (await req.json().catch(() => null)) as { key?: string; value?: string } | null;
    const key = body?.key ?? "";
    const value = body?.value ?? "";
    if (!ALLOWED_KEYS.has(key)) {
      return fail("VALIDATION", `Unknown setting. Allowed: ${[...ALLOWED_KEYS].join(", ")}.`, 422);
    }
    if (!value || value.length > 2000) return fail("VALIDATION", "Value must be 1–2000 characters.", 422);

    const prev = await db.siteSetting.findUnique({ where: { key } });
    const updated = await db.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
    await audit("cms.settings.update", `setting:${key}`, {
      previousValue: prev?.value?.slice(0, 200), newValue: value.slice(0, 200),
      ip: clientIp(req.headers), actorOverride: auth,
    });
    return ok({ key: updated.key, value: updated.value });
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
