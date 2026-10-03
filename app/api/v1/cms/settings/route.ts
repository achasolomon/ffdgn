import { EXTRA_SITE_FIELDS } from "@/lib/site-settings-fields";
import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { imagePathResolves } from "@/lib/media-path";
import { revalidatePublicSite } from "@/lib/revalidate";

/**
 * Editable site copy, plus the presentation fields the layout reads.
 *
 * Whitelist rather than free-form keys: this table feeds the public homepage,
 * so an unrestricted key would let anyone with `settings.manage` inject
 * arbitrary content into arbitrary slots.
 */
const ALLOWED_KEYS = new Set([
  ...EXTRA_SITE_FIELDS.map(field => field.key),
  "site.title", "site.description", "site.phone", "site.email", "site.address",
  "contact.address", "contact.hours", "contact.conference_title", "contact.conference_phone", "contact.conference_email",
  "hero.image_1", "hero.image_2", "hero.image_3", "hero.image_1_alt", "hero.image_2_alt", "hero.image_3_alt",
  "hero.eyebrow", "hero.title", "hero.lede", "hero.cta_primary", "hero.cta_secondary",
  "home.about_eyebrow", "home.about_title", "home.about_body", "home.about_cta",
  "home.about_image", "home.about_image_alt",
  "site.established", "site.seat", "site.character",
  // Conference presentation. Values here must stay consistent with the slug in
  // lib/routes.ts, which is what the nav and banner link to.
  "event.conference_label", "event.conference_title", "event.conference_href",
  "event.conference_banner_detail", "event.conference_href",
  // Right-hand column of the full-width logo row. Same discipline as the
  // conference keys: the href and image are restricted to same-site paths so
  // the header cannot be turned into an open redirect or a remote-image sink.
  "header.ad_eyebrow", "header.ad_title", "header.ad_detail", "header.ad_cta",
  "header.ad_href", "header.ad_image",
]);

/** Longest accepted value. Hero ledes are prose; 2000 is generous. */
const MAX_VALUE = 2000;

/**
 * GET /api/v1/cms/settings — public site copy (hero, identity strip).
 * PATCH — upsert one setting { key, value }. Requires `settings.manage`. Audited.
 */
export async function GET() {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "CMS requires the MySQL database.", 503);
    const rows = await db.siteSetting.findMany({ where: { key: { in: [...ALLOWED_KEYS] } }, orderBy: { key: "asc" } });
    return ok(Object.fromEntries(rows.map((r) => [r.key, r.value])), { source: "mysql" });
  } catch (e) {
    return failFrom(e);
  }
}

export async function PATCH(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "CMS requires the MySQL database.", 503);
    const auth = await requirePermission("settings.manage");
    const gate = await rateLimit(`cms.settings:${clientIp(req.headers)}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many edits. Try again shortly.", 429);

    const body = (await req.json().catch(() => null)) as { key?: string; value?: string } | null;
    const key = typeof body?.key === "string" ? body.key : "";
    const value = typeof body?.value === "string" ? body.value : "";
    if (!ALLOWED_KEYS.has(key)) {
      return fail("VALIDATION", `Unknown setting. Allowed: ${[...ALLOWED_KEYS].join(", ")}.`, 422);
    }
    // Every header.ad_* field is optional: an operator must be able to clear the
    // image or the call to action, not just set it. Requiring a non-empty value
    // would strand a field that has been filled once. Every other key still has
    // to carry content, which is what the old unconditional check enforced.
    const optionalAdField = key.startsWith("header.ad_") || key.startsWith("hero.image_");
    if ((!value && !optionalAdField) || value.length > MAX_VALUE) {
      return fail("VALIDATION", `Value must be 1–${MAX_VALUE} characters.`, 422);
    }
    // A path, not a URL: no protocol, no scheme-relative `//`, no backslashes.
    const sameSitePath = /^\/(?!\/)[A-Za-z0-9\-_/.?=&%#]*$/;
    if (key === "event.conference_href" && (value.length > 255 || !sameSitePath.test(value))) {
      return fail("VALIDATION", "Conference destination must be a same-site path.", 422);
    }
    if (key === "header.ad_href" && (value.length > 255 || (value && !sameSitePath.test(value)))) {
      return fail("VALIDATION", "Ad destination must be a same-site path.", 422);
    }
    if (key === "header.ad_image" && value && (value.length > 255 || !sameSitePath.test(value))) {
      return fail("VALIDATION", "Ad image must be a path on this site (e.g. /assets/...).", 422);
    }
    if ((/^hero\.image_[123]$/.test(key) || key === "home.about_image") && value && (!sameSitePath.test(value) || !(await imagePathResolves(value)))) {
      return fail("VALIDATION", "Choose an existing image from the media library or a valid image path on this site.", 422);
    }
    if (key === "site.email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      return fail("VALIDATION", "Enter a valid contact email address.", 422);
    }
    if (key === "contact.conference_email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      return fail("VALIDATION", "Enter a valid conference contact email address.", 422);
    }

    if (EXTRA_SITE_FIELDS.some(field => field.key === key) && key.endsWith("_href") && !sameSitePath.test(value)) return fail("VALIDATION", "Choose a destination on this website.", 422);
    if ((key === "site.logo" || key === "footer.cta_image") && !(await imagePathResolves(value))) return fail("VALIDATION", "Choose an existing image from the library.", 422);
    const prev = await db.siteSetting.findUnique({ where: { key } });
    const updated = await db.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
    await audit("cms.settings.update", `setting:${key}`, {
      previousValue: prev?.value?.slice(0, 200), newValue: value.slice(0, 200),
      ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite(`setting ${key}`);
    return ok({ key: updated.key, value: updated.value }, { revalidated: true });
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
