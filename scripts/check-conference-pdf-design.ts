import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { invitationPdf } from "../lib/conference/render-invitation";
import { badgePdf } from "../lib/conference/badge";
async function main() {
  const guest = { fullName: "His Excellency, Dr. Paul Griffin", organization: "National Leadership Forum", jobTitle: "Distinguished Guest", category: "VVIP", eventTitle: "5th National Conference 2026", admissionId: "", registrationId: "PREVIEW1", qrToken: "SYNTHETIC_DESIGN_PREVIEW_ONLY" };
  const invitation = { ...guest, startDate: new Date("2026-10-20"), endDate: new Date("2026-10-21"), venue: "International Conference Centre", city: "Abuja, Nigeria", rsvpUrl: "https://example.com/invite" };
  mkdirSync("docs/pdf-previews", { recursive: true });
  const tag = await badgePdf(guest), letter = await invitationPdf(invitation);
  writeFileSync("docs/pdf-previews/guest-tag.pdf", tag); writeFileSync("docs/pdf-previews/personal-invitation.pdf", letter);
  for (const variant of [guest, { ...guest, fullName: "Chief Ọládélé Adebáyọ̀ — Zoë" }, { ...guest, fullName: "W".repeat(192), jobTitle: "W".repeat(192), organization: "W".repeat(192), eventTitle: "W".repeat(255) }]) {
    const pdf = await PDFDocument.load(await badgePdf(variant)); assert.equal(pdf.getPageCount(), 1); assert.ok(Math.abs(pdf.getPage(0).getWidth() - 283.465) < 1);
    const invitationDoc = await PDFDocument.load(await invitationPdf({ ...invitation, ...variant, venue: "Venue ".repeat(40) })); assert.equal(invitationDoc.getPageCount(), 1);
  }
  console.log("PDF design checks passed: formal invitation and tag previews, one-page dimensions, Unicode guests and maximum-length names/event/details.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
