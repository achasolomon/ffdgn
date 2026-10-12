import QRCode from "qrcode";
import { pdfAssets, pdfText, PDF_COLORS as C } from "./pdf-layout";



import { emailButton, emailFrame } from "./email-template";


export type InvitationDetails = { fullName: string; eventTitle: string; startDate: Date; endDate: Date; venue: string; city: string; category: string; qrToken: string; rsvpUrl: string };
export function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!)); }
export function eventDates(details: Pick<InvitationDetails, "startDate" | "endDate">) {
  const format = (date: Date) => new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  return details.startDate.getTime() === details.endDate.getTime() ? format(details.startDate) : `${format(details.startDate)} – ${format(details.endDate)}`;
}
export function qrImage(token: string): Promise<Buffer> { return QRCode.toBuffer(token, { type: "png", errorCorrectionLevel: "M", width: 480, margin: 4, color: { dark: "#0B2E1B", light: "#FFFFFF" } }); }

export function invitationEmail(details: InvitationDetails) {
  const name = escapeHtml(details.fullName), title = escapeHtml(details.eventTitle), dates = escapeHtml(eventDates(details)), location = escapeHtml(`${details.venue}, ${details.city}`);
  return {
    subject: `Your QR invitation · ${details.eventTitle.replace(/[\r\n]/g, " ")}`,
    text: `Dear ${details.fullName},\n\nPlease find your digital entry QR for ${details.eventTitle}.\n${eventDates(details)}\n${details.venue}, ${details.city}\n\nYour formal invitation is already recorded; no registration or account is needed. Present the attached QR at arrival.\n\nConfirm or decline attendance: ${details.rsvpUrl}\n\nYour QR is available before you respond. Please keep this invitation private.\n\nFFDGN Secretariat`,
    html: emailFrame({ label: "Your personal event invitation", preheader: "Your entry QR is ready. Confirm your attendance and keep this invitation for arrival.", title: "Your conference entry pass", content: `<p style="margin:0 0 16px">Dear ${name},</p><p style="margin:0 0 24px">We look forward to welcoming you. Your invitation is already recorded, and your entry QR is ready.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7f2;border-left:3px solid #c8a449"><tr><td style="padding:18px 20px;font-size:14px;line-height:24px;word-break:break-word"><strong style="color:#123e2a;font-size:17px">${title}</strong><br>${dates}<br>${location}</td></tr></table><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 0 12px"><img src="cid:conference-qr@ffdgn" width="240" height="240" alt="Your private event entry QR code" style="display:block;width:240px;max-width:100%;height:auto;border:1px solid #e6e9e1;border-radius:8px"><p style="margin:12px 0 0;font-size:13px;line-height:21px;color:#677267">Present this QR on your phone or bring the attached invitation.</p></td></tr></table>${emailButton(details.rsvpUrl, "Confirm or decline attendance")}<p style="margin:0;font-size:15px;line-height:25px">No account or registration form is needed. You can use your QR before replying. At arrival, our guest-desk team can help you collect your printed tag.</p><p style="margin:20px 0 0;font-size:13px;line-height:22px;color:#677267">Your QR image and printable invitation are attached. Please keep them private.</p>`, footer: "This entry pass is personal to the invited guest. Please do not forward the QR or RSVP link. For assistance, contact the conference Secretariat." }),
  };
}

export function walkinEmail(details: InvitationDetails) {
  const name = escapeHtml(details.fullName), title = escapeHtml(details.eventTitle), dates = escapeHtml(eventDates(details)), location = escapeHtml(`${details.venue}, ${details.city}`);
  return {
    subject: `Your guest tag and conference details | ${details.eventTitle.replace(/[\r\n]/g, " ")}`,
    text: `Dear ${details.fullName},\n\nYour registration for ${details.eventTitle} is complete.\n${eventDates(details)}\n${details.venue}, ${details.city}\nGuest category: ${details.category}\n\nYour guest tag and QR image are attached. This is the same QR as your printed tag. Present either your printed tag or this QR on your phone at the gate. Our officers will scan it to confirm entry. No further registration or RSVP is needed.\n\nConference details are also attached. Keep your QR private.\n\nKind regards,\nFFDGN Secretariat`,
    html: emailFrame({ label: "Walk-in registration confirmed", preheader: "Your guest tag, entry QR and conference information are ready.", title: "Your guest tag is ready", content: `<p style="margin:0 0 16px">Dear ${name},</p><p style="margin:0 0 24px">Your conference registration is complete. Here is a digital copy of your entry QR and conference information.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7f2;border-left:3px solid #c8a449"><tr><td style="padding:18px 20px;font-size:14px;line-height:24px;word-break:break-word"><strong style="color:#123e2a;font-size:17px">${title}</strong><br>${dates}<br>${location}<br>Guest category: ${escapeHtml(details.category)}</td></tr></table><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 0 18px"><img src="cid:conference-qr@ffdgn" width="240" height="240" alt="Your private guest entry QR" style="display:block;width:240px;max-width:100%;height:auto;border:1px solid #e6e9e1;border-radius:8px"></td></tr></table><p style="margin:0 0 16px"><strong>Use your printed tag or show this QR on your phone.</strong> The gate officer will scan it to confirm entry. Both copies use the same QR.</p><p style="margin:0;font-size:14px;line-height:23px;color:#677267">Your printable guest tag, QR image and conference details are attached. No further registration or RSVP is needed.</p>`, footer: "This tag is personal to you. Please keep the QR private. For assistance, contact the conference guest desk." }),
  };
}

export async function invitationPdf(details: InvitationDetails, image?: Buffer): Promise<Uint8Array> {
  const { document, font, bold, serif, logo } = await pdfAssets();
  const page = document.addPage([595.28, 841.89]);
  page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: C.paper });
  page.drawRectangle({ x: 26, y: 26, width: 543.28, height: 789.89, borderColor: C.gold, borderWidth: .7 });
  page.drawImage(logo, { x: 48, y: 744, width: 65, height: 65 * logo.height / logo.width });
  page.drawText("FFDGN", { x: 131, y: 781, size: 20, font: bold, color: C.green });
  pdfText(page, "FORUM OF FORMER DEPUTY GOVERNORS\nOF NIGERIA", font, { x: 131, top: 770, width: 370, height: 34, size: 9.5 });
  page.drawLine({ start: { x: 48, y: 722 }, end: { x: 547, y: 722 }, thickness: .8, color: C.gold });
  page.drawText("PERSONAL CONFERENCE INVITATION", { x: 48, y: 695, font: bold, size: 9, color: C.gold });
  page.drawText("An invitation to join us", { x: 48, y: 655, font: serif, size: 31, color: C.green });
  pdfText(page, details.eventTitle, font, { x: 48, top: 627, width: 499, height: 80, size: 23, min: 10 });
  page.drawText("PREPARED EXCLUSIVELY FOR", { x: 48, y: 527, font: bold, size: 8, color: C.gold });
  pdfText(page, details.fullName, font, { x: 48, top: 510, width: 499, height: 60, size: 20, min: 10 });
  const category = details.category.toUpperCase();
  page.drawRectangle({ x: 48, y: 419, width: Math.max(78, font.widthOfTextAtSize(category, 10) + 28), height: 24, color: C.green });
  page.drawText(category, { x: 62, y: 427, font, size: 10, color: C.white });
  page.drawRectangle({ x: 48, y: 280, width: 499, height: 121, color: C.pale });
  page.drawText("DATE", { x: 64, y: 381, font: bold, size: 8, color: C.gold });
  pdfText(page, eventDates(details), font, { x: 64, top: 371, width: 467, height: 27, size: 11.5 });
  page.drawText("VENUE", { x: 64, y: 337, font: bold, size: 8, color: C.gold });
  pdfText(page, `${details.venue}, ${details.city}`, font, { x: 64, top: 328, width: 467, height: 44, size: 11, min: 6 });
  const qr = await document.embedPng(image ?? await qrImage(details.qrToken));
  page.drawRectangle({ x: 48, y: 119, width: 150, height: 150, color: C.white, borderColor: C.gold, borderWidth: .5 });
  page.drawImage(qr, { x: 54, y: 125, width: 138, height: 138 });
  page.drawText("YOUR PERSONAL ENTRY PASS", { x: 222, y: 251, font: bold, size: 9, color: C.gold });
  pdfText(page, "We look forward to welcoming you.", font, { x: 222, top: 233, width: 325, height: 38, size: 14 });
  pdfText(page, "Present this QR on your phone or bring this invitation. Our guest-desk team will assist you with your tag and entry validation.", font, { x: 222, top: 185, width: 325, height: 61, size: 10.5 });
  page.drawLine({ start: { x: 48, y: 92 }, end: { x: 547, y: 92 }, thickness: .6, color: C.gold });
  page.drawText("FFDGN SECRETARIAT", { x: 48, y: 70, font: bold, size: 9, color: C.green });
  pdfText(page, "This invitation is personal. Please keep your entry QR private. No guest account is required.", font, { x: 48, top: 59, width: 499, height: 20, size: 8, color: C.muted });
  document.setTitle("Personal conference invitation"); document.setAuthor("FFDGN Secretariat");
  return document.save();
}