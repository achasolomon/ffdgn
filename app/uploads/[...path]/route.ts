import { readFile } from "node:fs/promises";
import { uploadedFilePath } from "@/lib/media-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  mp4: "video/mp4", webm: "video/webm",
};

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const file = uploadedFilePath(`/uploads/${path.join("/")}`);
  const mime = MIME[path.at(-1)?.split(".").at(-1)?.toLowerCase() ?? ""];
  if (!file || !mime) return new Response(null, { status: 404 });
  let bytes: Buffer;
  try { bytes = await readFile(file); }
  catch { return new Response(null, { status: 404 }); }
  const headers = {
    "Content-Type": mime, "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=31536000, immutable", "Accept-Ranges": "bytes",
  };
  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2]))
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${bytes.length}` } });
    const start = match[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
    if (start > end || start >= bytes.length)
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${bytes.length}` } });
    return new Response(new Uint8Array(bytes.subarray(start, end + 1)), {
      status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${bytes.length}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Length": String(bytes.length) } });
}
