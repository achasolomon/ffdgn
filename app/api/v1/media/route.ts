import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { db, dbReady, fail, failFrom, ok } from "../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const IMAGE_MIMES: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
};
const VIDEO_MIMES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 200 * 1024 * 1024;

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

    const rows = await db.mediaAsset.findMany({
      where: {
        ...(all ? {} : { visibility: "PUBLIC" as const }),
        ...(kind ? { kind: kind as never } : {}),
        ...(category ? { category } : {}),
        ...(eventSlug ? { event: { slug: eventSlug } } : {}),
      },
      include: { event: { select: { slug: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return ok(rows, { source: "mysql", total: rows.length });
  } catch (e) {
    return failFrom(e);
  }
}

/**
 * POST /api/v1/media — upload a photo or video file. Requires `media.manage`.
 * Multipart: file, title, category, altText?, eventSlug?, description?.
 * Validates MIME + size; stores under public/uploads (swap to S3 in production).
 */
export async function POST(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Media upload requires the MySQL database.", 503);
    const gate = rateLimit(`media:upload:${clientIp(req.headers)}`, 30, 60_000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many uploads. Slow down.", 429);
    const auth = await requirePermission("media.manage");

    const form = await req.formData().catch(() => null);
    const file = form?.get("file") as File | null;
    const title = String(form?.get("title") ?? "").trim();
    const category = String(form?.get("category") ?? "General").trim().slice(0, 64);
    const altText = String(form?.get("altText") ?? "").trim().slice(0, 255) || null;
    const description = String(form?.get("description") ?? "").trim().slice(0, 2000) || null;
    const eventSlug = String(form?.get("eventSlug") ?? "").trim() || null;

    if (!file || typeof file === "string" || file.size === 0) return fail("VALIDATION", "A file is required.", 422);
    if (!title) return fail("VALIDATION", "A title is required.", 422);

    const ext = IMAGE_MIMES[file.type] ?? VIDEO_MIMES[file.type];
    if (!ext) {
      return fail("VALIDATION", `Unsupported file type ${file.type}. Images: JPEG/PNG/WebP/GIF/SVG. Video: MP4/WebM.`, 422);
    }
    const kind = IMAGE_MIMES[file.type] ? "IMAGE" : "VIDEO";
    const limit = kind === "IMAGE" ? MAX_IMAGE : MAX_VIDEO;
    if (file.size > limit) return fail("VALIDATION", `File too large (max ${limit / 1024 / 1024} MB).`, 422);

    let eventId: string | null = null;
    if (eventSlug) {
      const event = await db.forumEvent.findUnique({ where: { slug: eventSlug }, select: { id: true } });
      if (!event) return fail("VALIDATION", "Unknown eventSlug.", 422);
      eventId = event.id;
    }

    const now = new Date();
    const dir = join(process.cwd(), "public", "uploads", String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"));
    await mkdir(dir, { recursive: true });
    const name = `${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(dir, name), buffer);
    const url = `/uploads/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${name}`;

    const asset = await db.mediaAsset.create({
      data: {
        title, kind: kind as never, category, url, provider: "FILE",
        photographer: auth.user.name, copyright: "© FFDGN",
        altText: altText ?? title, description, eventId,
      },
    });
    await audit("media.upload", `media:${asset.id}`, {
      newValue: `${kind} ${title} (${(file.size / 1024).toFixed(0)} KB)`,
      ip: clientIp(req.headers), actorOverride: auth,
    });
    return ok({ id: asset.id, title, kind, category, url }, null);
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
