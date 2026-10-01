import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { db, dbReady, fail, failFrom, ok } from "../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp } from "@/lib/rate-limit";
import { verifyImageUpload, verifyVideoUpload } from "@/lib/upload-security";
import { revalidatePublicSite } from "@/lib/revalidate";

/**
 * Accepted upload types. SVG is deliberately absent: it is an XML document that
 * can carry <script> and event handlers, and we serve uploads from the same
 * origin as the app, so an uploaded SVG is stored XSS. Raster formats only.
 */
const IMAGE_MIMES: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
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

    const form = await req.formData().catch(() => null);
    const file = form?.get("file") as File | null;
    const title = String(form?.get("title") ?? "").trim();
    const category = String(form?.get("category") ?? "General").trim().slice(0, 64);
    const altText = String(form?.get("altText") ?? "").trim().slice(0, 255) || null;
    const description = String(form?.get("description") ?? "").trim().slice(0, 2000) || null;
    const eventSlug = String(form?.get("eventSlug") ?? "").trim() || null;

    if (!file || typeof file === "string" || file.size === 0) return fail("VALIDATION", "A file is required.", 422);
    if (!title) return fail("VALIDATION", "A title is required.", 422);

    const isImage = file.type in IMAGE_MIMES;
    const isVideo = file.type in VIDEO_MIMES;
    if (!isImage && !isVideo) {
      return fail(
        "VALIDATION",
        `Unsupported file type ${file.type || "(unknown)"}. Images: JPEG/PNG/WebP/GIF. Video: MP4/WebM. SVG is not accepted because it can carry executable script.`,
        422,
      );
    }

    const kind = isImage ? "IMAGE" : "VIDEO";
    const limit = isImage ? MAX_IMAGE : MAX_VIDEO;
    if (file.size > limit) return fail("VALIDATION", `File too large (max ${Math.round(limit / 1024 / 1024)} MB).`, 422);

    // Read once; the same bytes drive both validation and persistence.
    const buffer = Buffer.from(await file.arrayBuffer());
    const verified = isImage ? verifyImageUpload(file.type, buffer) : verifyVideoUpload(file.type, buffer);
    if (!verified.ok) return fail("VALIDATION", verified.message, 422);

    let eventId: string | null = null;
    if (eventSlug) {
      const event = await db.forumEvent.findUnique({ where: { slug: eventSlug }, select: { id: true } });
      if (!event) return fail("VALIDATION", "Unknown eventSlug.", 422);
      eventId = event.id;
    }

    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const dir = join(process.cwd(), "public", "uploads", year, month);
    await mkdir(dir, { recursive: true });
    // Extension comes from the verified content type, not from user input.
    const name = `${randomUUID()}.${verified.ext}`;
    await writeFile(join(dir, name), buffer);
    const url = `/uploads/${year}/${month}/${name}`;

    const asset = await db.mediaAsset.create({
      data: {
        title, kind: kind as never, category, url, provider: "FILE",
        photographer: auth.user.name, copyright: "© FFDGN",
        altText: altText ?? title, description, eventId,
      },
    });
    await audit("media.upload", `media:${asset.id}`, {
      newValue: `${kind} ${title} (${(file.size / 1024).toFixed(0)} KB, ${verified.mime})`,
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
