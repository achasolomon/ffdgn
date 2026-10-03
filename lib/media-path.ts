import { statSync } from "node:fs";
import { join, normalize, sep } from "node:path";
import { db } from "./db";

const PUBLIC_DIR = normalize(join(process.cwd(), "public"));

function decodePathname(url: string): string | null {
  const pathname = url.split(/[?#]/, 1)[0] ?? "";
  try {
    return decodeURIComponent(pathname);
  } catch {
    // A malformed percent-escape is not a resolvable path.
    return null;
  }
}

/**
 * Does this path exist as a file under /public?
 *
 * The public directory is the single source of truth for what the site can
 * actually serve, so the check is made against the filesystem rather than a
 * hardcoded allowlist of asset folders.
 */
export function publicFileExists(url: string): boolean {
  const decoded = decodePathname(url);
  if (!decoded?.startsWith("/")) return false;
  // Resolving then re-checking the prefix rejects "../" escapes, which would
  // otherwise let a stored path reference files outside /public.
  const target = normalize(join(/* turbopackIgnore: true */ PUBLIC_DIR, decoded));
  if (target !== PUBLIC_DIR && !target.startsWith(PUBLIC_DIR + sep)) return false;
  // isFile() rather than existsSync(): a directory such as /assets/events exists
  // but cannot be rendered as an image, so it must not pass.
  try {
    return statSync(target).isFile();
  } catch {
    return false;
  }
}

/**
 * Does this image path resolve to something the site can actually render?
 *
 * Two sources are accepted on purpose:
 *   - a MediaAsset row, which is what the media library picker produces, and
 *   - a file under /public, which is what the existing seed data uses
 *     (`/assets/events/*.jpg`). Rejecting those would make every seeded focus
 *     area and timeline entry unsaveable until an editor re-picked it.
 *
 * The previous check was `INTERNAL_PATH.test()` alone, which only proves the
 * string looks internal. `/assets/nope.jpg` passed and rendered as a broken
 * image with no error anywhere.
 */
export async function imagePathResolves(url: string): Promise<boolean> {
  try {
    const asset = await db.mediaAsset.findFirst({ where: { url }, select: { id: true } });
    if (asset) return true;
  } catch {
    // A database failure must not be reported as a bad path; fall through to
    // the filesystem check so a legitimate static path is not rejected.
  }
  return publicFileExists(url);
}
