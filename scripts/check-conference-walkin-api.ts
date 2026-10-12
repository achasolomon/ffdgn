import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import jsQR from "jsqr";
import { SMTPServer } from "smtp-server";
import { processEmailJob } from "../lib/conference/email-worker";
import { invitationCredentials } from "../lib/conference/credentials";

export async function checkWalkinApi({ origin, eventId, otherEventId, staffCookie, db, cookie, testSql }: { origin: string; eventId: string; otherEventId: string; staffCookie: string; db: PrismaClient; cookie: (userId: string, role: string) => Promise<string>; testSql: (sql: string) => Promise<unknown> }) {
  const operator = await db.user.create({ data: { email: "walkin-operator@conference.test", name: "Walk-in Operator", role: "super_admin", passwordHash: "not-a-login-hash" } });
  const adminCookie = await cookie(operator.id, "super_admin");
  const base = `/api/v1/conference/events/${eventId}`, walkins = base + "/walkins", prints = base + "/prints";
  async function call(path: string, body?: unknown, key = randomUUID(), session = adminCookie, requestOrigin = origin) {
    return fetch(origin + path, { method: body === undefined ? "GET" : "POST", headers: { Connection: "close", Cookie: session, Origin: requestOrigin, "Content-Type": "application/json", "Idempotency-Key": key }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  const body = { fullName: "Walk-in Test Guest", organization: "Test Forum", jobTitle: "Delegate", category: "General" }, key = randomUUID();
  assert.equal((await call(walkins, body, key, "")).status, 401);
  assert.equal((await call(walkins, body, key, staffCookie)).status, 403); // ReportingOfficer
  assert.equal((await call(walkins, body, key, adminCookie, "https://evil.example")).status, 403);
  assert.equal((await call(walkins, { ...body, email: "invalid" })).status, 422);
  await testSql("CREATE TRIGGER conference_walkin_test_audit BEFORE INSERT ON audit_log FOR EACH ROW BEGIN IF NEW.action = 'conference.walkin.register' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Expected registration rollback'; END IF; END");
  try { assert.equal((await call(walkins, body, key)).status, 500); assert.equal(await db.conferenceAttendee.count({ where: { fullName: body.fullName } }), 0); }
  finally { await testSql("DROP TRIGGER conference_walkin_test_audit"); }
  const responses = await Promise.all([call(walkins, body, key), call(walkins, body, key)]);
  const first = await responses[0].json(), second = await responses[1].json();
  assert.equal(responses[0].status, 200); assert.equal(responses[1].status, 200); assert.deepEqual(first.data, second.data);
  const { registrationId, printId } = first.data;
  assert.equal((await call(walkins, { ...body, fullName: "Changed name" }, key)).status, 409);
  const registration = await db.eventRegistration.findUniqueOrThrow({ where: { id: registrationId }, include: { attendee: true, invitation: true, admission: true } });
  assert.equal(registration.attendee!.email, null); assert.equal(registration.conferenceRsvp, "Accepted"); assert.equal(registration.admission, null);
  assert.equal(await db.conferenceBadgePrint.count({ where: { registrationId } }), 1);
  assert.equal(await db.conferenceEmailJob.count({ where: { invitationId: registration.invitation!.id } }), 0);
  const imageResponse = await call(prints + "?id=" + printId); assert.equal(imageResponse.status, 200); assert.match(imageResponse.headers.get("cache-control")!, /no-store/);
  const tag = (await imageResponse.json()).data;
  const raw = await sharp(Buffer.from(tag.qrDataUrl.split(",")[1], "base64")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const qr = jsQR(new Uint8ClampedArray(raw.data), raw.info.width, raw.info.height);
  const { qrToken } = invitationCredentials(registration.invitation!); assert.equal(qr?.data, qrToken);
  assert.ok(!JSON.stringify((await db.conferenceBadgePrint.findUniqueOrThrow({ where: { id: printId } })).snapshot).includes(qrToken), "QR secret must not be copied into the persistent snapshot.");
  await db.conferenceConfig.update({ where: { eventId }, data: { requireAcceptedRsvp: true } });
  const verify = await call(base + "/gate", { action: "verify", token: qr!.data }); assert.equal(verify.status, 200); assert.equal((await verify.json()).data.eligible, true);
  assert.equal((await call(`/api/v1/conference/events/${otherEventId}/gate`, { action: "verify", token: qr!.data })).status, 404);
  assert.equal((await call(prints, { action: "finish", id: printId, state: "Confirmed" })).status, 200);
  assert.equal(await db.conferenceAdmission.count({ where: { registrationId } }), 0, "Printing must not mark attendance.");
  const entries = await Promise.all([call(base + "/gate", { action: "admit", token: qr!.data }), call(base + "/gate", { action: "admit", token: qr!.data })]);
  for (const response of entries) assert.equal(response.status, 200);
  assert.equal(await db.conferenceAdmission.count({ where: { registrationId } }), 1);
  const otherWalkin = await call(walkins, body); assert.equal(otherWalkin.status, 200); assert.notEqual((await otherWalkin.json()).data.registrationId, registrationId, "People without email are not merged by name.");
  const emailGuest = { ...body, fullName: "Emailed Walk-in Guest", email: "walkin-email@conference.test" }, emailKey = randomUUID();
  const emailResponses = await Promise.all([call(walkins, emailGuest, emailKey), call(walkins, emailGuest, emailKey)]);
  assert.ok(emailResponses.every(response => response.status === 200));
  const emailedWalkin = (await emailResponses[0].json()).data; assert.deepEqual((await emailResponses[1].json()).data, emailedWalkin); assert.equal(emailedWalkin.emailQueued, true);
  const emailedRecord = await db.eventRegistration.findUniqueOrThrow({ where: { id: emailedWalkin.registrationId }, include: { invitation: true } });
  const queuedMail = await db.conferenceEmailJob.findFirstOrThrow({ where: { invitationId: emailedRecord.invitation!.id } });
  assert.equal(await db.conferenceEmailJob.count({ where: { invitationId: emailedRecord.invitation!.id } }), 1);
  const emailTag = (await (await call(prints + "?id=" + emailedWalkin.printId)).json()).data;
  const otherQueued = await db.conferenceEmailJob.findMany({ where: { state: "Queued", id: { not: queuedMail.id } }, select: { id: true, availableAt: true } });
  await db.conferenceEmailJob.updateMany({ where: { id: { in: otherQueued.map(job => job.id) } }, data: { availableAt: new Date(Date.now() + 86400_000) } });
  const messages: string[] = [], originalEnv = { ...process.env };
  const smtp = new SMTPServer({ disabledCommands: ["STARTTLS"], onAuth(_auth, _session, callback) { callback(null, { user: "test" }); }, onData(stream, _session, callback) { const chunks: Buffer[] = []; stream.on("data", chunk => chunks.push(Buffer.from(chunk))); stream.on("end", () => { messages.push(Buffer.concat(chunks).toString()); callback(); }); } });
  await new Promise<void>((resolve, reject) => { smtp.once("error", reject); smtp.listen(0, "127.0.0.1", resolve); });
  Object.assign(process.env, { NODE_ENV: "development", NEXTAUTH_URL: origin, CONFERENCE_SMTP_HOST: "127.0.0.1", CONFERENCE_SMTP_PORT: String((smtp.server.address() as { port: number }).port), CONFERENCE_SMTP_USER: "test", CONFERENCE_SMTP_PASSWORD: "test-secret", CONFERENCE_SMTP_FROM: "secretariat@conference.test", CONFERENCE_SMTP_ALLOW_LOCAL_PLAINTEXT: "true" });
  try {
    assert.equal((await processEmailJob())?.state, "Accepted"); assert.equal(messages.length, 1);
    assert.match(messages[0], /X-FFDGN-Tag-Layout:\s*entry-pass-v2/i, "The actual outgoing email must identify the shared print/PDF layout.");
    const mail = messages[0].replace(/=\r?\n/g, ""); assert.ok(mail.includes("guest-tag.pdf")); assert.ok(mail.includes("conference-invitation.pdf")); assert.ok(mail.includes("ffdgn-logo@ffdgn")); assert.ok(mail.includes("Your registration") || mail.includes("registration is complete"));
    assert.ok(messages[0].replace(/\s/g, "").includes(emailTag.qrDataUrl.split(",")[1]), "Emailed and printed QR images must be identical.");
    assert.equal((await db.conferenceInvitation.findUniqueOrThrow({ where: { id: emailedRecord.invitation!.id } })).qrHash, emailedRecord.invitation!.qrHash);
  } finally {
    for (const name of Object.keys(process.env)) if (!(name in originalEnv)) delete process.env[name]; Object.assign(process.env, originalEnv);
    await new Promise<void>(resolve => smtp.close(resolve));
    for (const job of otherQueued) await db.conferenceEmailJob.update({ where: { id: job.id }, data: { availableAt: job.availableAt } });
  }
  const emailBody = { ...body, fullName: "Imported Dignitary", email: "tag-dignitary@conference.test", category: "VVIP" };
  assert.equal((await call(base + "/guests", emailBody)).status, 200);
  const dignitary = await db.eventRegistration.findFirstOrThrow({ where: { eventId, attendee: { email: emailBody.email } } });
  const tagFirst = await call(prints, { action: "prepare", registrationId: dignitary.id }); assert.equal(tagFirst.status, 200); const dignitaryPrintId = (await tagFirst.json()).data.id;
  const beforeEmail = await db.conferenceInvitation.findUniqueOrThrow({ where: { registrationId: dignitary.id } });
  const emailed = await call(base + "/invitations", { action: "issue", registrationIds: [dignitary.id] }); assert.equal(emailed.status, 200); assert.equal((await emailed.json()).data.queued, 1);
  assert.equal((await db.conferenceInvitation.findUniqueOrThrow({ where: { registrationId: dignitary.id } })).qrHash, beforeEmail.qrHash);
  assert.equal((await call(walkins, emailBody)).status, 409);
  assert.equal((await call(base + "/invitations", { action: "regenerate", registrationIds: [dignitary.id] })).status, 200);
  assert.equal((await call(prints + "?id=" + dignitaryPrintId)).status, 409);
  assert.equal((await call(prints, { action: "finish", id: dignitaryPrintId, state: "Confirmed" })).status, 409);
  assert.equal((await call(base + "/gate", { action: "verify", token: invitationCredentials(beforeEmail).qrToken })).status, 404);
  if (process.argv.includes("--browser")) { const { checkWalkinBrowser } = await import("./check-conference-browser"); await checkWalkinBrowser(origin, eventId, adminCookie); }
  await db.conferenceConfig.update({ where: { eventId }, data: { requireAcceptedRsvp: false, capacity: await db.eventRegistration.count({ where: { eventId, status: "Registered" } }) } });
  assert.equal((await call(walkins, { ...body, fullName: "Over capacity" })).status, 409);
  await db.conferenceConfig.update({ where: { eventId }, data: { capacity: null, enabled: false } });
  assert.equal((await call(walkins, body)).status, 409);
  await db.conferenceConfig.update({ where: { eventId }, data: { enabled: true } });
  console.log("Walk-in/QR tag checks passed: optional email, retry/concurrency, audit rollback, capacity, printing before admission, decoded QR gate validation, strict RSVP, duplicate entry, dignitary email reuse, replaced credentials and role/origin/event boundaries.");
}
