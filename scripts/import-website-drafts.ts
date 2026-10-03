/** Populate missing page drafts from the current local public website. Never publishes. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { PAGE_CATALOG, blankPage, blankSection, validateWebsitePage, type WebsitePage } from "../lib/website-content";

loadEnvConfig(process.cwd());
const base = process.env.CMS_IMPORT_URL ?? "http://localhost:3100";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Import from a local preview only.");
assert.ok(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname), "Run against the local content database only.");
const db = new PrismaClient();
const browser = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", ["--headless=new", "--remote-debugging-port=9449", "--user-data-dir=" + mkdtempSync(join(tmpdir(), "ffdgn-import-")), "about:blank"], { stdio: "ignore", windowsHide: true });
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let socket: WebSocket | undefined;
async function main() {
  let target: { webSocketDebuggerUrl: string } | undefined;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { const targets = await (await fetch("http://localhost:9449/json/list")).json(); target = targets.find((item: { type: string }) => item.type === "page"); if (target) break; } catch {}
    await wait(250);
  }
  assert.ok(target, "Local browser must start.");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => { socket!.onopen = resolve; });
  let id = 0;
  const slots = new Map<number, (value: { result?: { value?: unknown }; error?: unknown }) => void>();
  socket.onmessage = event => { const message = JSON.parse(String(event.data)); if (message.id) { slots.get(message.id)?.(message.result); slots.delete(message.id); } };
  const send = (method: string, params: Record<string, unknown> = {}) => new Promise<{ result?: { value?: unknown }; error?: unknown }>(resolve => { slots.set(++id, resolve); socket!.send(JSON.stringify({ id, method, params })); });
  let imported = 0;
  for (const [path, title] of PAGE_CATALOG) {
    const key = "website.draft." + createHash("sha256").update(path).digest("hex");
    if (await db.siteSetting.findUnique({ where: { key } })) continue;
    assert.equal((await fetch(base + path)).status, 200, "Source page must exist: " + path);
    await send("Page.navigate", { url: base + path });
    await wait(1200);
    const result = await send("Runtime.evaluate", { returnByValue: true, expression: `(() => {
      const main = document.querySelector('main'); if (!main) return null;
      const h1 = main.querySelector('h1');
      const blocks = []; let current = {title:'Overview', body:[], images:[]}; blocks.push(current);
      for (const node of main.querySelectorAll('h2,p,li,img,table')) {
        if (node.closest('nav,form,button,table') && node.tagName !== 'TABLE') continue;
        if (node.tagName === 'H2') { current = {title:node.textContent.trim(),body:[],images:[]}; blocks.push(current); }
        else if (node.tagName === 'IMG') {
          const src = node.getAttribute('src') || ''; const alt = node.getAttribute('alt') || '';
          const url = src.startsWith('/_next/image') ? new URL(src,location.origin).searchParams.get('url') : src;
          if (url && url.startsWith('/') && alt && !url.includes('/brand/')) current.images.push({url,alt});
        } else if (node.tagName === 'TABLE') {
          current.table = [...node.querySelectorAll('tr')].map(row=>[...row.querySelectorAll('th,td')].map(cell=>cell.textContent.trim()));
        } else { const text = node.textContent.trim(); if(text && !current.body.includes(text)) current.body.push(text); }
      }
      return {title:h1?.textContent.trim(),description:document.querySelector('meta[name="description"]')?.content,blocks};
    })()` });
    const snapshot = result.result?.value as { title?: string; description?: string; blocks: { title: string; body: string[]; images: { url: string; alt: string }[]; table?: string[][] }[] } | null;
    assert.ok(snapshot?.blocks.length, "Source content required: " + path);
    const page: WebsitePage = blankPage(path, snapshot.title || title);
    page.description = (snapshot.description ?? "").slice(0, 5000);
    for (const [index, block] of snapshot.blocks.entries()) {
      if (block.body.length) page.sections.push({ ...blankSection("text", "copy-" + index), title: block.title.slice(0, 255), body: block.body.join("\n\n").slice(0, 16000) });
      if (block.table?.length && block.table[0].length <= 12 && block.table.every(row => row.length === block.table![0].length)) page.sections.push({ ...blankSection("table", "table-" + index), title: block.title.slice(0, 255), columns: block.table[0], rows: block.table.slice(1, 101) });
      const images = [...new Map(block.images.map(image => [image.url, image])).values()].slice(0, 20);
      if (images.length) page.sections.push({ ...blankSection("gallery", "images-" + index), title: block.title.slice(0, 255), items: images.map(image => ({ title: "", body: "", image: image.url, alt: image.alt.slice(0, 500), href: "" })) });
    }
    if (path === "/contact") page.sections.push(blankSection("contact", "contact-form"));
    const error = validateWebsitePage(page);
    assert.equal(error, null, "Imported draft must be valid: " + path + " " + error);
    await db.siteSetting.create({ data: { key, value: JSON.stringify({ page, version: 1, savedAt: new Date().toISOString() }) } });
    imported++;
    console.log("Imported draft: " + path);
  }
  console.log(imported + " page drafts populated. Live pages and existing drafts were preserved. Review snapshots before publishing; record snapshots do not automatically follow record edits.");
}
main().finally(async () => { socket?.close(); browser.kill(); await db.$disconnect(); }).catch(error => { console.error(error instanceof Error ? error.message : "Import failed"); process.exitCode = 1; });
