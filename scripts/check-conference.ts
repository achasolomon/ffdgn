import assert from "node:assert/strict";
import { CSV_HEADERS, parseGuestCsv, validateGuest, conferenceAllowed, trustedMutationOrigin } from "../lib/conference/input";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import jsQR from "jsqr";
import { PDFDocument } from "pdf-lib";
import { decryptSecret, encryptSecret, hashCredential, newCredentials, invitationCredentials, invitationOrigin } from "../lib/conference/credentials";
import { qrImage, invitationEmail, invitationPdf } from "../lib/conference/render-invitation";
import { emailFailure } from "../lib/conference/email-worker";

const header = CSV_HEADERS.join(",");
const guest = "Hon. Guest,guest@example.org,+234 800 123 4567,Forum,Chair,VIP,Letter 001";
const rows = parseGuestCsv(`\uFEFF${header}\r\n${guest}\r\n`);
assert.equal(rows.length, 1); assert.deepEqual(rows[0].errors, []);
const quoted = parseGuestCsv(`${header}\n"Guest, Senior",guest@example.org,,"Forum\nCouncil","Chair ""A""",VVIP,`);
assert.equal(quoted[0].guest.fullName, "Guest, Senior"); assert.equal(quoted[0].guest.organization, "Forum\nCouncil"); assert.equal(quoted[0].guest.jobTitle, 'Chair "A"');
assert.throws(() => parseGuestCsv(`${header}\n"unfinished`), /unclosed/);
assert.throws(() => parseGuestCsv(`${header}\n"closed"garbage,,,,,,`), /Malformed/);
assert.throws(() => parseGuestCsv("name,email\nGuest,g@example.org"), /headers/);
assert.throws(() => parseGuestCsv(header), /no guest/);
assert.throws(() => parseGuestCsv(`${header}\n${Array(501).fill(guest).join("\n")}`), /500/);
assert.throws(() => parseGuestCsv("a".repeat(512_001)), /512 KB/);
assert.ok(parseGuestCsv(`${header}\n${guest}\n${guest.toUpperCase()}`)[1].errors.some(error => error.includes("Duplicate")));
assert.ok(parseGuestCsv(`${header}\nBad,not-email,,,,Unknown,`)[0].errors.length >= 2);
assert.ok(parseGuestCsv(`${header}\n${guest},unexpected`)[0].errors.some(error => error.includes("Column")));
assert.equal(validateGuest({ fullName: "Guest", email: " GUEST@EXAMPLE.ORG " }).value?.email, "guest@example.org");
assert.ok(validateGuest(null).errors.length);
for (const capability of ["view", "guests", "settings"] as const) {
  assert.equal(conferenceAllowed("super_admin", null, capability), true);
  assert.equal(conferenceAllowed("secretariat_admin", null, capability), true);
  assert.equal(conferenceAllowed("events_manager", null, capability), false);
  assert.equal(conferenceAllowed("events_manager", "Manager", capability), true);
  assert.equal(conferenceAllowed("content_editor", "RegistrationOfficer", capability), capability !== "settings");
  assert.equal(conferenceAllowed("auditor", "ReportingOfficer", capability), capability === "view");
}
assert.equal(trustedMutationOrigin("https://ffdgn.org.ng", "https://ffdgn.org.ng"), true);
assert.equal(trustedMutationOrigin("https://other.example", "https://ffdgn.org.ng"), false);
assert.equal(trustedMutationOrigin(null, "https://ffdgn.org.ng"), false);
assert.equal(trustedMutationOrigin("https://ffdgn.org.ng.evil.example", "https://ffdgn.org.ng"), false);
assert.equal(trustedMutationOrigin("http://localhost:3100", "http://localhost:3000"), false);
console.log("Conference checks passed: CSV quoting/bounds/duplicates, guest validation, event capability matrix and mutation origins.");

async function checkInvitationRendering() {
  process.env.CONFERENCE_CREDENTIAL_KEY = randomBytes(32).toString("base64");
  const credentials = newCredentials(), second = newCredentials();
  assert.notEqual(credentials.qrToken, second.qrToken); assert.notEqual(credentials.rsvpToken, credentials.qrToken);
  const envelope = encryptSecret(credentials, "invitation:test:1");
  assert.ok(!envelope.includes(credentials.qrToken)); assert.deepEqual(decryptSecret(envelope, "invitation:test:1"), credentials);
  assert.throws(() => decryptSecret(envelope, "invitation:test:2"));
  const parts = envelope.split("."); parts[3] = (parts[3][0] === "A" ? "B" : "A") + parts[3].slice(1); assert.throws(() => decryptSecret(parts.join("."), "invitation:test:1"));
  assert.deepEqual(invitationCredentials({ id: "test", generation: 1, credentialEnvelope: envelope, qrHash: hashCredential(credentials.qrToken), rsvpHash: hashCredential(credentials.rsvpToken) }), credentials);
  assert.throws(() => invitationCredentials({ id: "test", generation: 1, credentialEnvelope: envelope, qrHash: hashCredential("wrong"), rsvpHash: hashCredential(credentials.rsvpToken) }));
  process.env.NEXTAUTH_URL = "http://remote.example"; assert.throws(invitationOrigin);
  process.env.NEXTAUTH_URL = "https://ffdgn.org.ng"; assert.equal(invitationOrigin(), "https://ffdgn.org.ng");
  const image = await qrImage(credentials.qrToken), raw = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const decoded = jsQR(new Uint8ClampedArray(raw.data), raw.info.width, raw.info.height); assert.equal(decoded?.data, credentials.qrToken); assert.ok(!decoded!.data.includes("@"));
  const details = { fullName: "Ọlá <script>guest</script>", eventTitle: "Conference & Dialogue", startDate: new Date("2026-10-20"), endDate: new Date("2026-10-21"), venue: "Hall", city: "Abuja", category: "VVIP", qrToken: credentials.qrToken, rsvpUrl: `https://ffdgn.org.ng/invite#${credentials.rsvpToken}` };
  const email = invitationEmail(details); assert.ok(!email.html.includes("<script>guest")); assert.ok(email.html.includes("&lt;script&gt;")); assert.ok(email.html.includes("cid:conference-qr@ffdgn")); assert.ok(email.text.includes(details.rsvpUrl));
  const pdf = await invitationPdf(details, image); assert.equal(Buffer.from(pdf).subarray(0, 4).toString(), "%PDF"); assert.equal((await PDFDocument.load(pdf)).getPageCount(), 1);
  assert.deepEqual(emailFailure({ code: "ETIMEDOUT", command: "DATA" }, 1), { state: "Uncertain", code: "ETIMEDOUT" });
  assert.equal(emailFailure({ code: "ECONNECTION" }, 1).state, "Queued"); assert.equal(emailFailure({ code: "ECONNECTION" }, 3).state, "Failed"); assert.equal(emailFailure({ code: "EAUTH" }, 1).state, "Failed");
  assert.equal(emailFailure({ code: "EMESSAGE", responseCode: 451 }, 1).state, "Queued");
  console.log("Invitation checks passed: credential randomness/encryption/tamper protection, QR decoding, Unicode PDF rendering, escaped email template and safe SMTP retry classification.");
}
checkInvitationRendering().catch(error => { console.error(error); process.exitCode = 1; });
