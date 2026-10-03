import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { uploadRoot } from "./upload-dir";
import { db } from "./db";
import { verifyImageUpload, verifyVideoUpload } from "./upload-security";

/**
 * Upload validation and storage, shared by asset creation (POST /api/v1/media)
 * and image replacement (POST /api/v1/media/[id]/file).
 *
 * These rules are security-sensitive, so they live in exactly one place: MIME
 * sniffing, the raster-only policy, and the size ceilings must not be able to
 * drift between the two entry points.
 *
 * SVG is deliberately absent: it is an XML document that can carry <script> and
 * event handlers, and we serve uploads from the same origin as the app, so an
 * uploaded SVG is stored XSS. Raster formats only.
 */
export const IMAGE_MIMES: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
};
export const VIDEO_MIMES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 200 * 1024 * 1024;

export const UNSUPPORTED_TYPE_MESSAGE =
  "Unsupported file type. Images: JPEG/PNG/WebP/GIF. Video: MP4/WebM. " +
  "SVG is not accepted because it can carry executable script.";

export type StoredUpload = {
  kind: "IMAGE" | "VIDEO";
  ext: string;
  mime: string;
  url: string;
  size: number;
};

/**
 * Validate a multipart file and write it under UPLOAD_DIR/YYYY/MM.
 *
 * The declared MIME is only half the check — the bytes are sniffed and compared,
 * and raster images are rejected if they contain active markup. The stored
 * extension comes from the verified content type, never from user input.
 */
export async function storeVerifiedUpload(
  file: File,
): Promise<{ ok: true; value: StoredUpload } | { ok: false; error: string }> {
  const isImage = file.type in IMAGE_MIMES;
  const isVideo = file.type in VIDEO_MIMES;
  if (!isImage && !isVideo) return { ok: false, error: `${UNSUPPORTED_TYPE_MESSAGE} (received ${file.type || "unknown"}).` };

  const kind = isImage ? "IMAGE" : "VIDEO";
  const limit = isImage ? MAX_IMAGE : MAX_VIDEO;
  if (file.size > limit) return { ok: false, error: `File too large (max ${Math.round(limit / 1024 / 1024)} MB).` };

  // Read once; the same bytes drive both validation and persistence.
  const buffer = Buffer.from(await file.arrayBuffer());
  const verified = isImage ? verifyImageUpload(file.type, buffer) : verifyVideoUpload(file.type, buffer);
  if (!verified.ok) return { ok: false, error: verified.message };

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const dir = join(uploadRoot(), year, month);
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${verified.ext}`;
  await writeFile(join(/* turbopackIgnore: true */ dir, name), buffer);

  return {
    ok: true,
    value: { kind, ext: verified.ext, mime: verified.mime, url: `/uploads/${year}/${month}/${name}`, size: file.size },
  };
}

/**
 * Resolve an uploaded file's path for deletion.
 *
 * Guards against deleting outside UPLOAD_DIR: the URL comes from the
 * database, but a row could have been seeded or edited with a traversal
 * sequence, and an unvalidated path join would then remove an arbitrary file
 * from the host. Only server-generated `/uploads/YYYY/MM/<uuid>.<ext>` shapes
 * are accepted — which also means a seeded repository file such as
 * `/assets/events/x.jpg` is never touched by a replace or delete.
 */
export function uploadedFilePath(url: string): string | null {
  const match = /^\/uploads\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i.exec(url);
  if (!match) return null;
  return join(uploadRoot(), url.slice("/uploads/".length));
}

/**
 * Delete a replaced asset's previous file, but only when it is safe to do so.
 *
 * Two conditions, both required:
 *   - the path is a server-generated upload (never a repository file), and
 *   - no other media asset still points at it.
 *
 * Without the second check, replacing one of two rows that happen to share a URL
 * would leave the other row pointing at a deleted file — trading one broken
 * image for another.
 */
export async function discardReplacedFile(
  url: string,
  keepId: string,
): Promise<"removed" | "kept-shared" | "kept-not-an-upload"> {
  const path = uploadedFilePath(url);
  if (!path) return "kept-not-an-upload";
  try {
    const stillUsed = await db.mediaAsset.findFirst({
      where: { url, NOT: { id: keepId } },
      select: { id: true },
    });
    if (stillUsed) return "kept-shared";
    await unlink(path);
    return "removed";
  } catch {
    // Already gone, or the volume is read-only. The record still points at the
    // new file, so this is not a broken image — it only leaves a stray file.
    console.warn(`[media] could not unlink ${url} while replacing asset ${keepId}`);
    return "kept-not-an-upload";
  }
}
