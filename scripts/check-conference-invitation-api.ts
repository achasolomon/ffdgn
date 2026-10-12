import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { SMTPServer } from "smtp-server";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import jsQR from "jsqr";
import { invitationCredentials } from "../lib/conference/credentials";
import { processEmailJob } from "../lib/conference/email-worker";

export async function checkInvitationApi({ origin, eventId, registrationId, adminCookie, staffCookie, db }: { origin: string; eventId: string; registrationId: string; adminCookie: string; staffCookie: string; db: PrismaClient }) {
  const endpoint = `/api/v1/conference/events/${eventId}/invitations`, guestBase = "/api/v1/conference/guest";
  async function call(path: string, body?: unknown, cookie = adminCookie, key = randomUUID()) {
    return fetch(origin + path, { method: body === undefined ? "GET" : "POST", headers: { Connection: "close", Origin: origin, Cookie: cookie, "Content-Type": "application/json", "Idempotency-Key": key }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  const body = { action: "issue", registrationIds: [registrationId] }, key = randomUUID();
  assert.equal((await call(endpoint, body, staffCookie)).status, 403);
  const dispatched = await Promise.all([call(endpoint, body, adminCookie, key), call(endpoint, body, adminCookie, key)]);
  for (const response of dispatched) { assert.equal(response.status, 200); assert.equal((await response.json()).data.queued, 1); }
  assert.equal((await call(endpoint, { ...body, action: "resend" }, adminCookie, key)).status, 409);
  const invitation = await db.conferenceInvitation.findUniqueOrThrow({ where: { registrationId } }), credentials = invitationCredentials(invitation);
  assert.equal(await db.conferenceEmailJob.count({ where: { invitationId: invitation.id } }), 1);
  assert.ok(!invitation.credentialEnvelope!.includes(credentials.qrToken));
  assert.equal((await call(guestBase + "/invitation", undefined, "")).status, 401);
  assert.equal((await call(guestBase + "/token-exchange", { token: credentials.qrToken }, "")).status, 410);
  async function guestCookie(token: string) {
    const response = await call(guestBase + "/token-exchange", { token }, ""); assert.equal(response.status, 200);
    const header = response.headers.get("set-cookie")!; assert.match(header, /HttpOnly/i); assert.match(header, /SameSite=lax/i); return header.split(";")[0];
  }
  const cookie = await guestCookie(credentials.rsvpToken);
  const details = await call(guestBase + "/invitation", undefined, cookie); assert.equal(details.status, 200); const detailsBody = await details.json(); assert.equal(detailsBody.data.rsvp, "Pending"); assert.ok(!JSON.stringify(detailsBody).includes(credentials.qrToken));
  const pngResponse = await call(guestBase + "/qr", undefined, cookie); assert.equal(pngResponse.status, 200); assert.match(pngResponse.headers.get("cache-control")!, /no-store/); assert.equal(pngResponse.headers.get("referrer-policy"), "no-referrer");
  const pixels = await sharp(Buffer.from(await pngResponse.arrayBuffer())).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); assert.equal(jsQR(new Uint8ClampedArray(pixels.data), pixels.info.width, pixels.info.height)?.data, credentials.qrToken);
  const pdfResponse = await call(guestBase + "/pdf", undefined, cookie); assert.equal(pdfResponse.status, 200); assert.equal(Buffer.from(await pdfResponse.arrayBuffer()).subarray(0, 4).toString(), "%PDF");
  assert.equal((await call(guestBase + "/rsvp", { response: "Accepted" }, cookie)).status, 200); assert.equal((await call(guestBase + "/rsvp", { response: "Accepted" }, cookie)).status, 200);
  assert.equal(await db.conferenceRsvpAction.count({ where: { registrationId } }), 1);
  assert.equal((await call(guestBase + "/rsvp", { response: "Declined" }, cookie)).status, 200); assert.equal((await db.eventRegistration.findUniqueOrThrow({ where: { id: registrationId } })).status, "Registered");
  assert.equal((await call(guestBase + "/rsvp", { response: "Accepted" }, cookie)).status, 200);
  const page = await call("/invite", undefined, ""); assert.equal(page.status, 200); assert.match(page.headers.get("x-robots-tag")!, /noindex/); assert.equal(page.headers.get("referrer-policy"), "no-referrer");
  if (process.argv.includes("--browser")) { const { checkGuestBrowser } = await import("./check-conference-browser"); await checkGuestBrowser(origin, credentials.rsvpToken); }
  const messages: string[] = []; let temporaryFailure = false;
  const smtp = new SMTPServer({ disabledCommands: ["STARTTLS"], onAuth(auth, _session, callback) { if (auth.username !== "test" || auth.password !== "test-secret") callback(new Error("Rejected test credentials")); else callback(null, { user: "test" }); }, onData(stream, _session, callback) { const chunks: Buffer[] = []; stream.on("data", chunk => chunks.push(Buffer.from(chunk))); stream.on("end", () => { if (temporaryFailure) { temporaryFailure = false; callback(Object.assign(new Error("Temporary local rejection"), { responseCode: 451 })); } else { messages.push(Buffer.concat(chunks).toString()); callback(); } }); } });
  await new Promise<void>((resolve, reject) => { smtp.once("error", reject); smtp.listen(0, "127.0.0.1", resolve); });
  const port = (smtp.server.address() as { port: number }).port;
  const originalEnv = { ...process.env };
  Object.assign(process.env, { NODE_ENV: "development", NEXTAUTH_URL: origin, CONFERENCE_SMTP_HOST: "127.0.0.1", CONFERENCE_SMTP_PORT: String(port), CONFERENCE_SMTP_USER: "test", CONFERENCE_SMTP_PASSWORD: "test-secret", CONFERENCE_SMTP_FROM: "secretariat@conference.test", CONFERENCE_SMTP_ALLOW_LOCAL_PLAINTEXT: "true" });
  try {
    const submitted = await Promise.all([processEmailJob(), processEmailJob()]); assert.equal(submitted.filter(job => job?.state === "Accepted").length, 1); assert.equal(messages.length, 1);
    const mail = messages[0].replace(/=\r?\n/g, ""); assert.ok(mail.includes("conference-invitation.pdf")); assert.ok(mail.includes("entry-qr")); assert.ok(mail.includes("ffdgn-logo.png")); assert.ok(mail.includes("ffdgn-logo@ffdgn")); assert.ok(mail.includes("conference-qr@ffdgn")); assert.ok(mail.includes(`/invite#${credentials.rsvpToken}`));
    assert.equal((await call(endpoint, { action: "resend", registrationIds: [registrationId] })).status, 200);
    assert.equal((await db.conferenceInvitation.findUniqueOrThrow({ where: { registrationId } })).qrHash, invitation.qrHash);
    temporaryFailure = true; const failed = await processEmailJob(); assert.equal(failed?.state, "Queued"); await db.conferenceEmailJob.update({ where: { id: failed!.id }, data: { availableAt: new Date() } }); assert.equal((await processEmailJob())?.state, "Accepted");
    assert.equal((await db.conferenceEmailJob.findUniqueOrThrow({ where: { id: failed!.id } })).attempts, 2);
    const abandoned = await db.conferenceEmailJob.create({ data: { invitationId: invitation.id, generation: invitation.generation, recipient: "api@conference.test", state: "Processing", attempts: 1, leaseOwner: randomUUID(), leaseUntil: new Date(Date.now() - 1000), history: { create: { attempt: 1, state: "Processing" } } } });
    assert.equal(await processEmailJob(), null); assert.equal((await db.conferenceEmailJob.findUniqueOrThrow({ where: { id: abandoned.id } })).state, "Uncertain");
    assert.equal((await call(endpoint, { action: "regenerate", registrationIds: [registrationId] })).status, 200);
    assert.equal((await call(guestBase + "/invitation", undefined, cookie)).status, 410); assert.equal((await call(guestBase + "/token-exchange", { token: credentials.rsvpToken }, "")).status, 410);
    const replaced = await db.conferenceInvitation.findUniqueOrThrow({ where: { registrationId } }); assert.notEqual(replaced.qrHash, invitation.qrHash); assert.equal(replaced.generation, 2);
    const freshCookie = await guestCookie(invitationCredentials(replaced).rsvpToken);
    assert.equal((await call(guestBase + "/invitation", undefined, freshCookie)).status, 200); assert.equal((await db.eventRegistration.findUniqueOrThrow({ where: { id: registrationId } })).conferenceRsvp, "Accepted");
    assert.equal((await call(endpoint, { action: "revoke", registrationIds: [registrationId] })).status, 200);
    assert.equal((await call(guestBase + "/qr", undefined, freshCookie)).status, 410); assert.equal((await db.conferenceInvitation.findUniqueOrThrow({ where: { registrationId } })).credentialEnvelope, null); assert.equal(await processEmailJob(), null);
    assert.equal((await call(endpoint, { action: "resend", registrationIds: [registrationId] })).status, 409);
    assert.equal((await call(endpoint, { action: "regenerate", registrationIds: [registrationId] })).status, 200);
    const expired = await db.conferenceInvitation.update({ where: { registrationId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await call(guestBase + "/token-exchange", { token: invitationCredentials(expired).rsvpToken }, "")).status, 410); assert.equal((await processEmailJob())?.state, "Cancelled");
    assert.equal(messages.length, 2, "Regenerated/revoked/expired jobs must not send extra mail.");
    assert.equal((await call(endpoint, { action: "regenerate", registrationIds: [registrationId] })).status, 200);
    const queuedCount = await db.conferenceEmailJob.count({ where: { state: "Queued" } });
    delete process.env.CONFERENCE_SMTP_PASSWORD; await assert.rejects(processEmailJob); process.env.CONFERENCE_SMTP_PASSWORD = "test-secret";
    assert.equal(await db.conferenceEmailJob.count({ where: { state: "Queued" } }), queuedCount, "Missing SMTP configuration must not claim or lose work.");
    if (process.argv.includes("--worker-bundle")) {
      const worker = spawn(process.execPath, [resolve(".next/standalone/conference-email-worker.cjs"), "--once"], { cwd: resolve(".next/standalone"), env: { ...process.env }, stdio: "pipe", windowsHide: true });
      let workerOutput = ""; worker.stdout.on("data", data => { workerOutput += data; }); worker.stderr.on("data", data => { workerOutput += data; });
      const exitCode = await new Promise<number | null>((resolve, reject) => { worker.once("error", reject); worker.once("exit", resolve); });
      assert.equal(exitCode, 0, workerOutput); assert.ok(workerOutput.includes("state=Accepted")); assert.equal(messages.length, 3);
      console.log("Packaged worker check passed: Node 22 standalone bundle, traced font/client and localhost SMTP submission.");
    }
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]; Object.assign(process.env, originalEnv);
    await new Promise<void>(resolve => smtp.close(() => resolve()));
  }
  console.log("Invitation API/SMTP checks passed: idempotent issuance, scoped access, pending-RSVP QR/PDF, response history, SMTP capture, retries and leases, regeneration/revocation/expiry and cancelled delivery.");
}
