// Windows cross-build preparation for the existing Linux x64/glibc cPanel target.
// npm can prune these platform-specific optional dependencies on Windows.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, sep, join } from "node:path";
import { spawnSync } from "node:child_process";
const root = process.cwd();
const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
if (manifest.name !== "ffdgn-platform") throw new Error("Run this command from the FFDGN application root.");
const lock = JSON.parse(await readFile(join(root, "package-lock.json"), "utf8"));
const cache = resolve(root, ".data/conference-tools/linux-native"); await mkdir(cache, { recursive: true });
for (const name of ["sharp-linux-x64", "sharp-libvips-linux-x64"]) {
  const key = `node_modules/@img/${name}`, entry = lock.packages[key];
  if (!entry?.version || !entry.integrity?.startsWith("sha512-")) throw new Error(`Lockfile is missing integrity metadata for ${key}.`);
  const archive = join(cache, `img-${name}-${entry.version}.tgz`);
  const valid = bytes => `sha512-${createHash("sha512").update(bytes).digest("base64")}` === entry.integrity;
  let bytes;
  try { bytes = await readFile(archive); } catch { /* download below */ }
  if (!bytes || !valid(bytes)) {
    const url = `https://registry.npmjs.org/@img/${name}/-/${name}-${entry.version}.tgz`;
    const response = await fetch(url); if (!response.ok) throw new Error(`Could not fetch pinned ${name}.`);
    bytes = Buffer.from(await response.arrayBuffer()); if (!valid(bytes)) throw new Error(`Integrity mismatch for ${name}.`);
    await writeFile(archive, bytes);
  }
  const listing = spawnSync("tar", ["-tf", archive], { encoding: "utf8" });
  if (listing.error) throw new Error(`Could not launch tar: ${listing.error.message}`);
  if (listing.status !== 0 || listing.stdout.trim().split(/\r?\n/).some(path => !path.startsWith("package/") || path.split(/[\\/]/).includes(".."))) throw new Error("Native archive contains unsafe paths.");
  const target = resolve(root, key); if (!target.startsWith(resolve(root, "node_modules") + sep)) throw new Error("Unsafe native package destination.");
  await mkdir(target, { recursive: true });
  const extract = spawnSync("tar", ["-xzf", archive, "-C", target, "--strip-components=1"], { encoding: "utf8" });
  if (extract.error) throw new Error(`Could not launch tar: ${extract.error.message}`);
  if (extract.status !== 0) throw new Error(`Could not extract ${name}: ${extract.stderr}`);
  console.log(`Prepared pinned ${name}@${entry.version}; archive integrity verified.`);
}
