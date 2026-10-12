import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { conferenceLogo } from "./brand";

export const PDF_COLORS = { green: rgb(.055, .20, .145), gold: rgb(.65, .51, .24), muted: rgb(.34, .40, .35), paper: rgb(.985, .98, .96), pale: rgb(.95, .96, .94), white: rgb(1, 1, 1) };
export async function pdfAssets() {
  const document = await PDFDocument.create(); document.registerFontkit(fontkit);
  const font = await document.embedFont(await readFile(join(process.cwd(), "public/assets/fonts/NotoSans-Regular.ttf")), { subset: true });
  return { document, font, bold: await document.embedFont(StandardFonts.HelveticaBold), serif: await document.embedFont(StandardFonts.TimesRoman), logo: await document.embedPng(await conferenceLogo()) };
}
function wrapped(text: string, font: PDFFont, size: number, width: number) {
  const result: string[] = []; let line = "";
  for (const word of text.replace(/[\p{Cc}\p{Cf}]/gu, " ").replace(/\s+/g, " ").trim().split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
    if (line) { result.push(line); line = ""; }
    for (const char of word) { if (line && font.widthOfTextAtSize(line + char, size) > width) { result.push(line); line = ""; } line += char; }
  }
  if (line) result.push(line); return result;
}
// Measured text regions: fit every line before drawing, rather than truncating
// guest names or allowing long titles to collide with the entry credential.
export function pdfText(page: PDFPage, text: string, font: PDFFont, box: { x: number; top: number; width: number; height: number; size: number; min?: number; center?: boolean; color?: ReturnType<typeof rgb> }) {
  if (!text.trim()) return 0;
  let size = box.size, lines = wrapped(text, font, size, box.width);
  while (lines.length * size * 1.3 > box.height && size > (box.min ?? 7)) { size = Math.max(box.min ?? 7, size - .5); lines = wrapped(text, font, size, box.width); }
  if (lines.length * size * 1.3 > box.height) throw new Error("PDF text exceeds its reserved region.");
  lines.forEach((line, i) => page.drawText(line, { x: box.center ? box.x + (box.width - font.widthOfTextAtSize(line, size)) / 2 : box.x, y: box.top - size - i * size * 1.3, font, size, color: box.color ?? PDF_COLORS.green }));
  return lines.length * size * 1.3;
}
