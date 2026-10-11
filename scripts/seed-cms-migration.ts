/** Non-destructive CMS population. Creates missing rows only; never copies page snapshots over live designs. */
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { readdir, writeFile } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import assert from "node:assert/strict";
import { TEMPLATE_CONTENT, templateDefaults, validateTemplateValues } from "../lib/template-content";
import { NAV, FOOTER_COLUMNS } from "../lib/routes";
import { INSTITUTIONAL_PAGES } from "../lib/institutional-pages";
import { getSettings } from "../lib/repo";
loadEnvConfig(process.cwd());
assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required.");
if (!process.argv.includes("--allow-remote")) assert.ok(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname), "Remote population requires the explicit --allow-remote flag.");
const db = new PrismaClient();
async function createSetting(key: string, value: string) {
  if (await db.siteSetting.findUnique({ where: { key } })) return false;
  await db.siteSetting.create({ data: { key, value } }); return true;
}
async function main() {
  let contentGroups = 0, assets = 0, pages = 0;
  const issues: string[] = [];
  for (const definition of TEMPLATE_CONTENT) {
    const values = templateDefaults(definition.id);
    assert.equal(validateTemplateValues(definition.id, values), null, definition.id);
    const value = JSON.stringify({ values, version: 1, savedAt: new Date().toISOString() });
    if (await createSetting(`website.copy.published.${definition.id}`, value)) contentGroups++;
    await createSetting(`website.copy.draft.${definition.id}`, value);
  }
  await createSetting("navigation.primary", JSON.stringify(NAV));
  await createSetting("navigation.footer", JSON.stringify(FOOTER_COLUMNS));
  for (const [key, value] of Object.entries(await getSettings())) await createSetting(key, value);
  for (const page of INSTITUTIONAL_PAGES) {
    if (await db.institutionalPage.findUnique({ where: { slug: page.slug } })) continue;
    await db.institutionalPage.create({ data: { slug: page.slug, title: page.title, eyebrow: page.eyebrow, lede: page.lede, body: page.body, sections: { create: page.sections.map(section => ({ title: section.title, body: section.body, imageUrl: section.imageUrl, imageAlt: section.imageAlt, position: section.position, published: true })) } } });
    pages++;
  }
  const kinds: Record<string, "IMAGE" | "VIDEO" | "DOCUMENT"> = { ".jpg": "IMAGE", ".jpeg": "IMAGE", ".png": "IMAGE", ".webp": "IMAGE", ".gif": "IMAGE", ".svg": "IMAGE", ".avif": "IMAGE", ".mp4": "VIDEO", ".webm": "VIDEO", ".pdf": "DOCUMENT" };
  const categories: Record<string, string> = { brand: "Brand", hero: "Hero", leadership: "Portrait", events: "Conference", news: "Press", gallery: "Archive", partnerships: "Partner", programs: "Programme" };
  async function catalogue(relative: string) {
    for (const entry of await readdir(join(process.cwd(), "public", "assets", relative), { withFileTypes: true })) {
      const file = relative ? relative + "/" + entry.name : entry.name;
      if (entry.isDirectory()) { await catalogue(file); continue; }
      const kind = kinds[extname(file).toLowerCase()]; if (!kind) continue;
      const url = "/assets/" + file;
      if (await db.mediaAsset.findFirst({ where: { url }, select: { id: true } })) continue;
      const title = basename(file, extname(file)).replace(/[-_]/g, " ").slice(0, 200);
      await db.mediaAsset.create({ data: { title, url, kind, category: categories[file.split("/")[0]] ?? "Website assets", provider: "FILE", visibility: "PUBLIC", inGallery: false, altText: kind === "IMAGE" ? title : null, description: "Imported existing website asset. Review description and caption before gallery publication." } });
      assets++;
    }
  }
  await catalogue("");
  // These are known design assets, not uncertain event photographs.
  const designAssets = await db.mediaAsset.findMany({ where: { kind: "IMAGE", inGallery: true }, select: { id: true, url: true, category: true } });
  const designIds = designAssets.filter(asset => /\/assets\/(brand|hero|leadership|partnerships)\//i.test(asset.url) || /^(brand|hero|portrait|partner|logo|banner|flyer|document)$/i.test(asset.category)).map(asset => asset.id);
  if (designIds.length) await db.mediaAsset.updateMany({ where: { id: { in: designIds } }, data: { inGallery: false } });
  const uncatalogued = await db.mediaAsset.count({ where: { kind: "IMAGE", inGallery: true, eventId: null, visibility: "PUBLIC" } });
  if (uncatalogued) issues.push(`${uncatalogued} legacy images marked for gallery have no event album; they remain excluded from the public event gallery.`);
  const missingCaptions = await db.mediaAsset.count({ where: { kind: "IMAGE", inGallery: true, eventId: { not: null }, OR: [{ description: null }, { description: "" }] } });
  if (missingCaptions) issues.push(`${missingCaptions} event-gallery photographs need an authoritative caption.`);
  await writeFile("deploy/CMS_POPULATION_RESULT.json", JSON.stringify({ checkedAt: new Date().toISOString(), contentGroupsCreated: contentGroups, institutionalPagesCreated: pages, mediaAssetsCreated: assets, totalDesigns: TEMPLATE_CONTENT.length, editableFields: TEMPLATE_CONTENT.reduce((count, definition) => count + definition.fields.length, 0), editorialIssues: issues }, null, 2) + "\n");
  console.log(`CMS population: ${contentGroups} design groups, ${pages} institutional pages and ${assets} media assets created. Existing editorial data was preserved.`);
  for (const issue of issues) console.log(issue);
}
main().finally(() => db.$disconnect()).catch(error => { console.error(error instanceof Error ? error.message : "Population failed"); process.exitCode = 1; });
