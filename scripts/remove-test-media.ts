import { db } from "../lib/db";
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

async function main() {
  const gone = await db.mediaAsset.deleteMany({ where: { OR: [{ title: { startsWith: "SMOKE" } }, { providerId: "aqz-KE-bpKQ" }] } });
  // Remove uploaded test files (only test uploads ever land here in dev).
  const dir = join(process.cwd(), "public", "uploads");
  let files = 0;
  try {
    const years = await readdir(dir);
    for (const y of years) {
      const months = await readdir(join(dir, y));
      for (const m of months) {
        const names = await readdir(join(dir, y, m));
        for (const n of names) {
          await rm(join(dir, y, m, n));
          files++;
        }
      }
    }
  } catch { /* no uploads dir yet */ }
  console.log(JSON.stringify({ removed: gone.count, files }));
  await db.$disconnect();
}
main();
