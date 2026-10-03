import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";

/**
 * Metric `href` renders as a link in the homepage intelligence strip.
 *
 * Constrained to same-origin absolute paths rather than validated after the
 * fact: the strip is CMS-editable by anyone with `settings.manage`, and an
 * unrestricted href field is a stored-open-redirect / phishing primitive that
 * puts a crafted link inside the Forum's own homepage chrome. No protocol, no
 * host, no `//` — so no javascript:, no data:, no off-site redirect.
 */
const HREF_PATTERN = /^\/[A-Za-z0-9\-_/.?=&%#]*$/;
const MAX_HREF = 255;
const MAX_LABEL = 128;
const MAX_VALUE = 32;

/**
 * GET /api/v1/cms/metrics — public intelligence-strip figures.
 * PATCH — upsert one metric { key, value, label?, href? }. Requires `settings.manage`. Audited.
 * DELETE ?key= — remove one metric. Same capability.
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
    const gate = await rateLimit(`cms.metrics:${clientIp(req.headers)}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many edits. Try again shortly.", 429);

    const body = (await req.json().catch(() => null)) as
      | { key?: string; value?: string; label?: string; href?: string }
      | null;
    if (!body) return fail("VALIDATION", "Request body is required.", 422);
    const key = body.key ?? "";
    const value = body.value ?? "";
    if (!key || key.length > 64) return fail("VALIDATION", "Metric `key` is required (max 64 chars).", 422);
    if (!value || value.length > MAX_VALUE) return fail("VALIDATION", `Metric \`value\` is required (max ${MAX_VALUE} chars).`, 422);

    const label = body.label ?? key;
    if (label.length > MAX_LABEL) return fail("VALIDATION", `Metric \`label\` must be at most ${MAX_LABEL} chars.`, 422);

    const href = body.href ?? "/about";
    if (href.length > MAX_HREF || !HREF_PATTERN.test(href)) {
      return fail(
        "VALIDATION",
        `Metric \`href\` must be a same-origin path (max ${MAX_HREF} chars), e.g. /knowledge or /about/history.`,
        422,
      );
    }

    const prev = await db.siteMetric.findUnique({ where: { key } });
    const count = await db.siteMetric.count();
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
    revalidatePublicSite(`metric ${key}`);
    return ok(updated, { revalidated: true });
  } catch (e) {
    return failFrom(e);
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "CMS requires the MySQL database.", 503);
    const auth = await requirePermission("settings.manage");
    const gate = await rateLimit(`cms.metrics:${clientIp(req.headers)}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many edits. Try again shortly.", 429);

    const key = new URL(req.url).searchParams.get("key") ?? "";
    if (!key) return fail("VALIDATION", "A `key` query parameter is required.", 422);

    const prev = await db.siteMetric.findUnique({ where: { key } });
    if (!prev) return fail("NOT_FOUND", "No such metric.", 404);

    await db.siteMetric.delete({ where: { key } });
    await audit("cms.metrics.delete", `metric:${key}`, {
      previousValue: `${prev.value} | ${prev.label}`,
      ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite(`metric ${key}`);
    return ok({ key, deleted: true }, { revalidated: true });
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
