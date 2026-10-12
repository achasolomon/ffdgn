import { pdfAssets, pdfText, PDF_COLORS as C } from "./pdf-layout";
import { qrImage } from "./render-invitation";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { conferenceLogo } from "./brand";
import type { PDFPage, RGB } from "pdf-lib";
export const BADGE_LAYOUT_VERSION = "entry-pass-v2";

const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
const color = (value?: RGB) => value ? `rgb(${[value.red, value.green, value.blue].map(channel => Math.round(channel * 255)).join(",")})` : "none";
type BadgeDetails = { fullName: string; organization: string; jobTitle: string; category: string; eventTitle: string; admissionId: string; registrationId?: string; qrToken?: string; qrDataUrl?: string | null };

// A personal 100 × 140 mm pass. QR quiet space is reserved independently of text.
async function renderBadge(details: BadgeDetails, preview = false) {
  const { document, font, bold, logo } = await pdfAssets();
  const pdfPage = document.addPage([283.465, 396.85]), elements: string[] = [];
  const images = new Map<unknown, string>();
  if (preview) images.set(logo, `data:image/png;base64,${(await conferenceLogo()).toString("base64")}`);
  // Record the same measured drawing commands for the browser and PDF.
  const page = new Proxy(pdfPage, { get(target, property) {
    if (!preview) { const value = Reflect.get(target, property); return typeof value === "function" ? value.bind(target) : value; }
    if (property === "drawText") return (text: string, options: Parameters<PDFPage["drawText"]>[1] = {}) => { elements.push(`<text x="${options.x}" y="${396.85 - options.y!}" font-family="${options.font === bold ? "Arial" : "ConferenceBadge"}" font-weight="${options.font === bold ? "bold" : "normal"}" font-size="${options.size}" fill="${color(options.color as RGB)}">${escape(text)}</text>`); target.drawText(text, options); };
    if (property === "drawRectangle") return (options: Parameters<PDFPage["drawRectangle"]>[0] = {}) => { elements.push(`<rect x="${options.x}" y="${396.85 - options.y! - options.height!}" width="${options.width}" height="${options.height}" fill="${color(options.color as RGB)}" stroke="${color(options.borderColor as RGB)}" stroke-width="${options.borderWidth ?? 0}"/>`); target.drawRectangle(options); };
    if (property === "drawLine") return (options: Parameters<PDFPage["drawLine"]>[0]) => { elements.push(`<line x1="${options.start.x}" y1="${396.85 - options.start.y}" x2="${options.end.x}" y2="${396.85 - options.end.y}" stroke="${color(options.color as RGB)}" stroke-width="${options.thickness}"/>`); target.drawLine(options); };
    if (property === "drawImage") return (image: Parameters<PDFPage["drawImage"]>[0], options: Parameters<PDFPage["drawImage"]>[1] = {}) => { elements.push(`<image href="${images.get(image)}" x="${options.x}" y="${396.85 - options.y! - options.height!}" width="${options.width}" height="${options.height}"/>`); target.drawImage(image, options); };
    const value = Reflect.get(target, property); return typeof value === "function" ? value.bind(target) : value;
  } });
  page.drawRectangle({ x: 0, y: 0, width: 283.465, height: 396.85, color: C.paper });
  page.drawRectangle({ x: 11, y: 11, width: 261.465, height: 374.85, borderColor: C.gold, borderWidth: .6 });
  page.drawImage(logo, { x: 28, y: 331, width: 43, height: 43 * logo.height / logo.width });
  page.drawText("FFDGN", { x: 86, y: 355, font: bold, size: 16, color: C.green });
  pdfText(page, "Forum of Former Deputy Governors of Nigeria", font, { x: 86, top: 344, width: 170, height: 26, size: 7.5 });
  page.drawLine({ start: { x: 27, y: 315 }, end: { x: 256, y: 315 }, thickness: .7, color: C.gold });
  pdfText(page, details.eventTitle, font, { x: 27, top: 303, width: 229, height: 38, size: 10, min: 4.5, center: true, color: C.muted });
  const category = details.category.toUpperCase(), categoryWidth = Math.max(57, font.widthOfTextAtSize(category, 9) + 24);
  page.drawRectangle({ x: (283.465 - categoryWidth) / 2, y: 238, width: categoryWidth, height: 21, color: C.green });
  pdfText(page, category, font, { x: 27, top: 254, width: 229, height: 15, size: 9, center: true, color: C.white });
  const nameHeight = pdfText(page, details.fullName, font, { x: 27, top: 224, width: 229, height: 42, size: 22, min: 5.5, center: true });
  let cursor = 224 - nameHeight - 5;
  const detailSize = nameHeight > 42 ? 8 : 9;
  if (details.jobTitle) cursor -= pdfText(page, details.jobTitle, font, { x: 27, top: cursor, width: 229, height: 22, size: detailSize, min: 4, center: true }) + 2;
  if (details.organization) pdfText(page, details.organization, font, { x: 27, top: cursor, width: 229, height: 22, size: detailSize, min: 4, center: true, color: C.muted });
  if (details.qrToken || details.qrDataUrl) {
    const bytes = details.qrToken ? await qrImage(details.qrToken) : Buffer.from(details.qrDataUrl!.split(",")[1], "base64");
    const qr = await document.embedPng(bytes);
    images.set(qr, `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`);
    page.drawRectangle({ x: 88, y: 24, width: 107.465, height: 107.465, color: C.white });
    page.drawImage(qr, { x: 90.7, y: 27, width: 102, height: 102 });
  }
  pdfText(page, details.registrationId ? `ENTRY PASS · ${details.registrationId.slice(0, 8).toUpperCase()}` : `ENTRY PASS · ${details.admissionId.slice(0, 8).toUpperCase()}`, font, { x: 27, top: 23, width: 229, height: 12, size: 6.5, min: 6.5, center: true });
  document.setTitle("Personal conference guest tag"); document.setAuthor("FFDGN Secretariat"); document.setSubject(BADGE_LAYOUT_VERSION);
  if (preview) { const fontData = (await readFile(join(process.cwd(), "public/assets/fonts/NotoSans-Regular.ttf"))).toString("base64"); return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 283.465 396.85"><style>@font-face{font-family:ConferenceBadge;src:url(data:font/ttf;base64,${fontData})}</style>${elements.join("")}</svg>`; }
  return document.save();
}
export async function badgePdf(details: BadgeDetails) { return await renderBadge(details) as Uint8Array; }
export async function badgePreview(details: BadgeDetails) { return `data:image/svg+xml;base64,${Buffer.from(await renderBadge(details, true) as string).toString("base64")}`; }
