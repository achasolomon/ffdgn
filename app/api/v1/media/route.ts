import { db, dbReady, fail, failFrom, ok } from "../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { storeVerifiedUpload } from "@/lib/media-upload";
import { revalidatePublicSite } from "@/lib/revalidate";

/**
 * GET /api/v1/media — public library (visibility PUBLIC), filterable by
 * kind / category / event. `visibility=all` requires `media.manage`.
 */
export async function GET(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Media library requires the MySQL database.", 503);
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind");
    const category = url.searchParams.get("category");
    const eventSlug = url.searchParams.get("event");
    const all = url.searchParams.get("visibility") === "all";
    if (all) await requirePermission("media.manage");
    const query = (url.searchParams.get("q") ?? "").trim().slice(0, 200);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) return fail("VALIDATION", "Invalid media page.", 422);

    const rows = await db.mediaAsset.findMany({
      where: {
        ...(all ? {} : { visibility: "PUBLIC" as const }),
        ...(kind ? { kind: kind as never } : {}),
        ...(category ? { category } : {}),
        ...(eventSlug ? { event: { slug: eventSlug } } : {}),
        ...(query ? { OR: [{ title: { contains: query } }, { category: { contains: query } }, { altText: { contains: query } }] } : {}),
      },
      include: { event: { select: { slug: true, title: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: offset,
      take: 100,
    });
    return ok(rows, { source: "mysql", total: rows.length, nextOffset: rows.length === 100 ? offset + 100 : null });
  } catch (e) {
    return failFrom(e);
  }
}

/**
 * POST /api/v1/media — upload a photo or video file. Requires `media.manage`.
 * Multipart: file, title, category, altText?, eventSlug?, description?.
 *
 * Order matters: authorization is checked before the body is read, so an
 * anonymous caller cannot force the server to buffer a large multipart payload.
 * Declared MIME is only half the check — the bytes are sniffed and compared, and
 * raster images are rejected if they contain active markup.
 */
export async function POST(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Media upload requires the MySQL database.", 503);
    const auth = await requirePermission("media.manage");
    // Per-account rather than per-IP: an office behind one NAT would otherwise
    // share a single upload budget.
    const gate = await rateLimit(`media.upload:${auth.user.id}`, 30, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Upload limit reached. Try again shortly.", 429);

    const form = await req.formData().catch(() => null);
    const file = form?.get("file") as File | null;
    const title = String(form?.get("title") ?? "").trim();
    const category = String(form?.get("category") ?? "General").trim().slice(0, 64);
    const altText = String(form?.get("altText") ?? "").trim().slice(0, 255) || null;
    const description = String(form?.get("description") ?? "").trim().slice(0, 2000) || null;
    const eventSlug = String(form?.get("eventSlug") ?? "").trim() || null;
    // Gallery publication is an explicit editorial choice.
    const inGalleryRaw = form?.get("inGallery");
    const inGallery = inGalleryRaw != null && !["false", "0", "off"].includes(String(inGalleryRaw).toLowerCase());
    const yearRaw = String(form?.get("year") ?? "").trim();
    if (yearRaw && (!/^\d{4}$/.test(yearRaw) || Number(yearRaw) < 1900 || Number(yearRaw) > 2100)) {
      return fail("VALIDATION", "Capture year must be a four-digit year between 1900 and 2100.", 422);
    }
    const year = yearRaw ? Number(yearRaw) : null;

    if (!file || typeof file === "string" || file.size === 0) return fail("VALIDATION", "A file is required.", 422);
    if (!title) return fail("VALIDATION", "A title is required.", 422);

    let eventId: string | null = null;
    if (eventSlug) {
      const event = await db.forumEvent.findUnique({ where: { slug: eventSlug }, select: { id: true } });
      if (!event) return fail("VALIDATION", "Unknown eventSlug.", 422);
      eventId = event.id;
    }
    if (inGallery && !eventId) return fail("VALIDATION", "Choose an event album before publishing to the gallery.", 422);
    const stored = await storeVerifiedUpload(file);
    if (!stored.ok) return fail("VALIDATION", stored.error, 422);
    const { url, kind, mime } = stored.value;

    const asset = await db.mediaAsset.create({
      data: {
        title, kind: kind as never, category, url, provider: "FILE",
        photographer: auth.user.name, copyright: "© FFDGN",
        altText: altText ?? title, description, eventId, inGallery, year,
      },
    });
    await audit("media.upload", `media:${asset.id}`, {
      newValue: `${kind} ${title} (${(file.size / 1024).toFixed(0)} KB, ${mime})`,
      ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite(`media upload ${title}`);
    return ok({ id: asset.id, title, kind, category, url }, null);
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
