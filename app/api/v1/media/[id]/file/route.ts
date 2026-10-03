import { db, dbReady, fail, failFrom, ok } from "../../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { discardReplacedFile, storeVerifiedUpload } from "@/lib/media-upload";
import { revalidatePublicSite } from "@/lib/revalidate";

/**
 * POST /api/v1/media/[id]/file — swap the image an asset is showing.
 *
 * The metadata endpoint (PATCH /api/v1/media/[id]) deliberately cannot change
 * `url`, so before this existed the only way to correct a wrong photograph was
 * to upload a duplicate and leave the bad record live — which is how the library
 * ended up with several near-identical rows for the same person.
 *
 * The asset record is kept and only its `url` moves, so the id, alt text,
 * collection, event link and every page already referencing this asset pick up
 * the new file automatically.
 *
 * Multipart: file.
 *
 * Order matters: authorization is checked before the body is read, so an
 * anonymous caller cannot force the server to buffer a large multipart payload.
 */

/** Providers whose media lives on someone else's CDN; there is no local file to swap. */
const REMOTE_PROVIDERS = ["YOUTUBE", "VIMEO", "DAV", "S3"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Media library requires the MySQL database.", 503);
    const auth = await requirePermission("media.manage");
    const gate = await rateLimit(`media.replace:${auth.user.id}`, 30, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many replacements. Try again shortly.", 429);

    const { id } = await params;
    const existing = await db.mediaAsset.findUnique({ where: { id } });
    if (!existing) return fail("NOT_FOUND", "No such media asset.", 404);

    if (existing.provider && REMOTE_PROVIDERS.includes(existing.provider)) {
      return fail(
        "VALIDATION",
        `This asset is hosted by ${existing.provider}, so there is no local file to replace. Update it at the provider instead.`,
        422,
      );
    }

    const form = await req.formData().catch(() => null);
    const file = form?.get("file") as File | null;
    if (!file || typeof file === "string" || file.size === 0) return fail("VALIDATION", "Choose a replacement file first.", 422);

    const stored = await storeVerifiedUpload(file);
    if (!stored.ok) return fail("VALIDATION", stored.error, 422);

    // A video asset cannot be swapped for a still image without changing what
    // the row represents, so the kinds must match.
    if (stored.value.kind !== existing.kind) {
      return fail(
        "VALIDATION",
        `This asset is a ${existing.kind.toLowerCase()}. Upload a ${existing.kind.toLowerCase()} file to replace it.`,
        422,
      );
    }

    const previousUrl = existing.url;
    const updated = await db.mediaAsset.update({
      where: { id },
      data: { url: stored.value.url },
      select: { id: true, title: true, url: true, kind: true },
    });

    // Only after the row points at the new file, so a failure here leaves a
    // stray file rather than a broken image.
    const oldFile = await discardReplacedFile(previousUrl, id);

    await audit("media.replace", `media:${id}`, {
      previousValue: previousUrl,
      newValue: `${stored.value.url} (${(stored.value.size / 1024).toFixed(0)} KB, ${stored.value.mime})`,
      ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite(`media replaced ${updated.title}`);
    return ok(
      { id: updated.id, url: updated.url, previousUrl, previousFile: oldFile, revalidated: true },
      { revalidated: true },
    );
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
