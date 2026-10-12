import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { staffInvitationEmail } from "../lib/conference/email-template";
import { invitationEmail, qrImage } from "../lib/conference/render-invitation";
import { smtpSettings } from "../lib/conference/email-worker";
import { conferenceLogo } from "../lib/conference/brand";

async function main() {
  const original = { ...process.env };
  try {
    for (const key of Object.keys(process.env)) if (key.startsWith("CONFERENCE_SMTP_")) delete process.env[key];
    Object.assign(process.env, { MAIL_MAILER: "smtp", MAIL_HOST: "smtp-relay.brevo.com", MAIL_PORT: "587", MAIL_USERNAME: "synthetic@smtp-brevo.com", MAIL_PASSWORD: "synthetic-key", MAIL_FROM_ADDRESS: "secretariat@example.com", MAIL_FROM_NAME: "FFDGN Secretariat" });
    assert.equal(smtpSettings().host, "smtp-relay.brevo.com"); assert.equal(smtpSettings().port, 587); assert.equal(smtpSettings().fromName, "FFDGN Secretariat");
    process.env.CONFERENCE_SMTP_HOST = "127.0.0.1"; assert.throws(smtpSettings, "Incomplete overrides must not borrow provider credentials.");
    Object.assign(process.env, { CONFERENCE_SMTP_PORT: "465", CONFERENCE_SMTP_USER: "isolated", CONFERENCE_SMTP_PASSWORD: "isolated-key", CONFERENCE_SMTP_FROM: "isolated@example.com" }); assert.equal(smtpSettings().user, "isolated"); assert.equal(smtpSettings().port, 465);
  } finally { for (const name of Object.keys(process.env)) if (!(name in original)) delete process.env[name]; Object.assign(process.env, original); }
  const staff = { name: "Amina Okafor", email: "amina@example.com", eventTitle: "National Leadership Conference", duty: "Guest registration, tags and gate check-in", setupUrl: "https://example.com/staff/setup#staff1_SYNTHETIC_PREVIEW_ONLY", expiresAt: new Date("2026-10-15T16:00:00Z") };
  const mail = staffInvitationEmail(staff);
  assert.ok(mail.html.includes("15 October 2026 at 17:00 WAT")); assert.ok(mail.text.includes(staff.setupUrl)); assert.ok(mail.html.includes("max-width:620px"));
  const hostile = staffInvitationEmail({ ...staff, name: '<script>alert("x")</script>', eventTitle: "<img src=x>", email: '<bad@example.com>' }); assert.ok(!hostile.html.includes("<script>")); assert.ok(!hostile.html.includes("<img src=x>")); assert.ok(hostile.html.includes("&lt;script&gt;"));
  const guest = invitationEmail({ fullName: "Her Excellency, Dr. Amina Okafor", eventTitle: staff.eventTitle, startDate: new Date("2026-10-20T00:00:00Z"), endDate: new Date("2026-10-20T00:00:00Z"), venue: "Conference Centre", city: "Abuja", category: "VVIP", qrToken: "SYNTHETIC_EMAIL_PREVIEW_ONLY", rsvpUrl: "https://example.com/invite#SYNTHETIC_PREVIEW_ONLY" });
  assert.ok(guest.html.includes("cid:conference-qr@ffdgn"));
  if (process.argv.includes("--previews")) {
    const directory = join(process.cwd(), "docs/email-previews"); mkdirSync(directory, { recursive: true });
    const logo = `data:image/png;base64,${(await conferenceLogo()).toString("base64")}`;
    writeFileSync(join(directory, "staff-invitation.html"), mail.html.replace("cid:ffdgn-logo@ffdgn", logo));
    const qr = await qrImage("SYNTHETIC_EMAIL_PREVIEW_ONLY"); writeFileSync(join(directory, "guest-invitation.html"), guest.html.replace("cid:ffdgn-logo@ffdgn", logo).replace("cid:conference-qr@ffdgn", `data:image/png;base64,${qr.toString("base64")}`));
  }
  console.log("Email checks passed: Brevo MAIL_* support, isolated overrides, sender name, safe template escaping, Nigeria expiry time, text fallback and embedded guest QR.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
