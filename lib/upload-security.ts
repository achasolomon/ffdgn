/**
 * File-upload safety.
 *
 * Uploaded media is served from the same origin as the application, so the
 * browser will treat any HTML/SVG we write as active content unless we
 * neutralise it. This module rejects dangerous payloads and provides the
 * sniffing-based verification the MIME allowlist alone cannot do — a declared
 * `image/png` header on an HTML or SVG body is the classic bypass.
 */

/** Magic-number prefixes for the formats we accept. */
const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", test: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/gif", ext: "gif", test: (b) => b.length > 6 && (b.subarray(0, 6).toString("latin1").startsWith("GIF87a") || b.subarray(0, 6).toString("latin1").startsWith("GIF89a")) },
  { mime: "image/webp", ext: "webp", test: (b) => b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
  { mime: "video/mp4", ext: "mp4", test: (b) => b.length > 12 && b.subarray(4, 8).toString("latin1") === "ftyp" },
  { mime: "video/webm", ext: "webm", test: (b) => b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
];

export function sniffImage(buffer: Buffer): { mime: string; ext: string } | null {
  return match(buffer);
}

export function sniffVideo(buffer: Buffer): { mime: string; ext: string } | null {
  return match(buffer);
}

function match(buffer: Buffer) {
  for (const s of SIGNATURES) {
    try {
      if (s.test(buffer)) return { mime: s.mime, ext: s.ext };
    } catch {
      /* short buffer — keep scanning */
    }
  }
  return null;
}

/**
 * Markers that must never appear in an accepted raster image. Their presence
 * means the payload is really markup (HTML/SVG/script) regardless of header.
 */
const ACTIVE_MARKERS = [
  "<script",
  "<svg",
  "<html",
  "<!doctype",
  "<?xml",
  "<iframe",
  "javascript:",
  "onload=",
  "onerror=",
  "<foreignobject",
];

export function containsActiveMarkup(buffer: Buffer): boolean {
  // Inspect the head of the file where any payload would be placed. 256 KB is
  // ample for detection and avoids scanning a 200 MB video.
  const head = buffer.subarray(0, 256 * 1024).toString("latin1").toLowerCase();
  return ACTIVE_MARKERS.some((m) => head.includes(m));
}

/**
 * Validate an upload against the allowlist. Returns the canonical
 * extension, or an error message explaining the rejection.
 */
export function verifyImageUpload(declaredMime: string, buffer: Buffer):
  | { ok: true; ext: string; mime: string }
  | { ok: false; message: string } {
  const sniffed = sniffImage(buffer);
  if (!sniffed) {
    return {
      ok: false,
      message: "File contents are not a recognised image. The upload was rejected (declared type did not match any allowed image format).",
    };
  }
  if (sniffed.mime !== declaredMime && !(declaredMime === "image/jpg" && sniffed.mime === "image/jpeg")) {
    return {
      ok: false,
      message: `File contents are ${sniffed.mime} but were declared as ${declaredMime}. Rejected to prevent type-confusion attacks.`,
    };
  }
  if (containsActiveMarkup(buffer)) {
    return {
      ok: false,
      message: "File contains active markup (script/SVG/HTML). Uploads that can execute in the browser are not accepted.",
    };
  }
  return { ok: true, ext: sniffed.ext, mime: sniffed.mime };
}

export function verifyVideoUpload(declaredMime: string, buffer: Buffer):
  | { ok: true; ext: string; mime: string }
  | { ok: false; message: string } {
  const sniffed = sniffVideo(buffer);
  if (!sniffed) {
    return { ok: false, message: "File contents are not a recognised video. The declared type did not match the file." };
  }
  if (sniffed.mime !== declaredMime) {
    return { ok: false, message: `File contents are ${sniffed.mime} but were declared as ${declaredMime}.` };
  }
  return { ok: true, ext: sniffed.ext, mime: sniffed.mime };
}