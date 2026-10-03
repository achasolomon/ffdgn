import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { db } from "../lib/db";
import { publicFileExists } from "../lib/media-path";

/**
 * Repair MediaAsset rows whose file is no longer on disk.
 *
 * A MediaAsset is only a claim that a file exists, and the library accumulated 17
 * rows whose path no longer matched anything: portraits pointing at
 * `/media/portraits/*.svg` placeholders that were later replaced by real files
 * under `/assets/leadership/`, and a few files renamed or re-encoded. Every one
 * of them is PUBLIC, so each rendered as a blank image in the public gallery.
 *
 * Only unambiguous repairs are applied. A candidate must be the sole match for
 * either an identical basename (different extension) or a unique basename
 * extension match. Anything fuzzy — `mahmood.jpeg` versus
 * `abdulmalik-mahood.jpeg` is one letter apart but is a guess about whose
 * portrait this is — is left alone and reported for an editor to decide, which
 * is why the media library now has a "Show only these" filter.
 *
 * Dry run by default. Pass --apply to write, and --apply --yes to skip the
 * confirmation summary.
 */

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"]);
const REMOTE_PROVIDERS = ["YOUTUBE", "VIMEO"];
const APPLY = process.argv.includes("--apply");

/** Every image file under /public, keyed by lowercased basename without extension. */
function indexPublicImages(): Map<string, string[]> {
  const root = join(process.cwd(), "public");
  const index = new Map<string, string[]>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "uploads") continue;
        walk(full);
        continue;
      }
      const dot = entry.name.lastIndexOf(".");
      if (dot < 0) continue;
      const ext = entry.name.slice(dot).toLowerCase();
      if (!IMAGE_EXT.has(ext)) continue;
      const key = entry.name.slice(0, dot).toLowerCase();
      const url = "/" + relative(root, full).split(sep).join("/");
      const list = index.get(key) ?? [];
      list.push(url);
      index.set(key, list);
    }
  };
  walk(root);
  return index;
}

function candidateFor(url: string, index: Map<string, string[]>): { url: string; how: string } | null {
  const dot = url.lastIndexOf(".");
  if (dot < 0) return null;
  const base = url.slice(url.lastIndexOf("/") + 1, dot).toLowerCase();

  const exact = index.get(base);
  if (exact?.length === 1) return { url: exact[0], how: "same name, different extension" };
  if (exact && exact.length > 1) return null;

  // Unique prefix or suffix match, e.g. `anka.jpeg` -> `mukhtar-anka.jpeg` and
  // `hazeem.jpeg` -> `hazeem-gbolarumi.jpeg`. Accepted only when it resolves to
  // a single file, so an ambiguous stem never wins. This deliberately does not
  // catch `mahmood.jpeg` -> `abdulmalik-mahood.jpeg`: that is a spelling variant
  // and repointing it would be a guess about whose portrait the row means.
  const related = [...index.entries()].filter(
    ([key]) => key !== base && (key.endsWith(base) || base.endsWith(key) || key.startsWith(base)),
  );
  const urls = related.flatMap(([, list]) => list);
  if (urls.length === 1) return { url: urls[0], how: "unique name match" };
  return null;
}

async function main() {
  const index = indexPublicImages();
  const assets = await db.mediaAsset.findMany({
    select: { id: true, title: true, url: true, provider: true },
    orderBy: { title: "asc" },
  });

  const broken = assets.filter(
    (a) => a.url.startsWith("/") && !REMOTE_PROVIDERS.includes(a.provider ?? "") && !publicFileExists(a.url),
  );

  const repairs: { id: string; title: string; from: string; to: string; how: string }[] = [];
  const unfixable: { title: string; url: string }[] = [];
  for (const a of broken) {
    const hit = candidateFor(a.url, index);
    if (hit) repairs.push({ id: a.id, title: a.title, from: a.url, to: hit.url, how: hit.how });
    else unfixable.push({ title: a.title, url: a.url });
  }

  console.log(`\nScanned ${assets.length} assets. Broken files: ${broken.length}.`);
  console.log(`\nREPAIRABLE (${repairs.length})`);
  for (const r of repairs) console.log(`  ${r.from}\n    -> ${r.to}   [${r.how}]  ${r.title}`);
  console.log(`\nNEEDS AN EDITOR (${unfixable.length})`);
  for (const u of unfixable) console.log(`  ${u.url}   ${u.title}`);
  if (!APPLY) {
    console.log(`\nDry run. Re-run with --apply to write these ${repairs.length} repairs.`);
    await db.$disconnect();
    return;
  }
  if (!repairs.length) {
    console.log("\nNothing to repair.");
    await db.$disconnect();
    return;
  }

  // Attributed to the superadmin account because the audit table has a foreign
  // key to users.id; this is an administrative repair, not an end-user action.
  const actor = await db.user.findFirst({ where: { role: "super_admin" }, select: { id: true, name: true } });
  if (!actor) throw new Error("No super_admin user found to attribute the audit entry to.");

  for (const r of repairs) {
    await db.mediaAsset.update({ where: { id: r.id }, data: { url: r.to } });
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        actorName: `${actor.name} (scripts/repair-media-urls.ts)`,
        action: "media.repair",
        resource: `media:${r.id}`,
        ip: "127.0.0.1",
        previousValue: r.from,
        newValue: `${r.to} (${r.how})`,
      },
    });
  }
  console.log(`\nApplied ${repairs.length} repairs with audit entries.`);
  await db.$disconnect();
}

main();
