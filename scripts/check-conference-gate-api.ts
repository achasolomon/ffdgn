import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { PDFDocument } from "pdf-lib";
import { invitationCredentials } from "../lib/conference/credentials";

export async function checkGateApi({ origin, eventId, otherEventId, adminCookie, staffCookie, staffEmail, db, testSql }: { origin: string; eventId: string; otherEventId: string; adminCookie: string; staffCookie: string; staffEmail: string; db: PrismaClient; testSql: (sql: string) => Promise<unknown> }) {
  const base = `/api/v1/conference/events/${eventId}`, gate = base + "/gate";
  async function call(path: string, body?: unknown, cookie = adminCookie, requestOrigin = origin, method = body === undefined ? "GET" : "POST") {
    return fetch(origin + path, { method, headers: { Connection: "close", Origin: requestOrigin, Cookie: cookie, "Content-Type": "application/json", "Idempotency-Key": randomUUID() }, ...(body ===undefined ? {} : { body: JSON.stringify(body) }) });
  }
  async function fixture(email: string) {
    assert.equal((await call(base + "/guests", { fullName: "Gate Guest", email, category: "VVIP", organization: "Forum", jobTitle: "Chair" })).status, 200);
    const registration = await db.eventRegistration.findFirstOrThrow({ where: { eventId, attendee: { email } } });
    assert.equal((await call(base + "/invitations", { action: "issue", registrationIds: [registration.id] })).status, 200);
    const invitation = await db.conferenceInvitation.findUniqueOrThrow({ where: { registrationId: registration.id } });
    return { registration, invitation, ...invitationCredentials(invitation) };
  }
  const guest = await fixture("gate@conference.test");
  assert.equal((await call(gate, { action: "verify", token: guest.qrToken }, "")).status, 401);
  assert.equal((await call(gate, { action: "verify", token: guest.qrToken }, staffCookie)).status, 403);
  assert.equal((await call(base + "/staff", { email: staffEmail, role: "RegistrationOfficer" })).status, 200);
  assert.equal((await call(`/api/v1/conference/events/${otherEventId}/gate`, { action: "verify", token: guest.qrToken }, staffCookie)).status, 403);
  assert.equal((await call(gate, { action: "verify", token: guest.qrToken }, adminCookie, "https://evil.example")).status, 403);
  assert.equal((await call(gate, { action: "verify", token: "rsvp1_" + "a".repeat(43) })).status, 422);
  assert.equal((await call(gate, { action: "verify", token: "ffdgn1_" + "a".repeat(43) })).status, 404);
  const verified = await call(gate, { action: "verify", token: guest.qrToken }, staffCookie);
  assert.equal(verified.status, 200); assert.match(verified.headers.get("cache-control")!, /no-store/);
  const summary = (await verified.json()).data; assert.equal(summary.eligible, true); assert.equal(summary.rsvp, "Pending"); assert.equal(summary.admission, null); assert.ok(!JSON.stringify(summary).includes(guest.qrToken));
  assert.equal((await call(gate + "/badge", { registrationId: guest.registration.id })).status, 409);
  assert.equal((await call(base + "/config", { enabled: true, capacity: null, requireAcceptedRsvp: true }, adminCookie, origin, "PATCH")).status, 200);
  assert.equal((await call(gate, { action: "admit", token: guest.qrToken })).status, 409);
  await db.eventRegistration.update({ where: { id: guest.registration.id }, data: { conferenceRsvp: "Accepted" } });
  // A failed transactional audit must leave no admission behind.
  await testSql("CREATE TRIGGER conference_gate_test_audit BEFORE INSERT ON audit_log FOR EACH ROW BEGIN IF NEW.action = 'conference.admission' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Expected gate audit rollback'; END IF; END");
  try { assert.equal((await call(gate, { action: "admit", token: guest.qrToken })).status, 500); assert.equal(await db.conferenceAdmission.count({ where: { registrationId: guest.registration.id } }), 0); }
  finally { await testSql("DROP TRIGGER conference_gate_test_audit"); }
  const race = await Promise.all([call(gate, { action: "admit", token: guest.qrToken }, staffCookie), call(gate, { action: "admit", token: guest.qrToken }, staffCookie)]);
  const results = []; for (const response of race) { assert.equal(response.status, 200); results.push((await response.json()).data); }
  assert.equal(results.filter(result => !result.alreadyAdmitted).length, 1); assert.equal(results.filter(result => result.alreadyAdmitted).length, 1);
  assert.equal(await db.conferenceAdmission.count({ where: { registrationId: guest.registration.id } }), 1);
  assert.equal(await db.auditLog.count({ where: { action: "conference.admission", newValue: { contains: guest.registration.id } } }), 1);
  const admission = await db.conferenceAdmission.findUniqueOrThrow({ where: { registrationId: guest.registration.id } }); assert.equal(admission.method, "QR");
  const badge = await call(gate + "/badge", { registrationId: guest.registration.id }, staffCookie); assert.equal(badge.status, 200); assert.match(badge.headers.get("cache-control")!, /no-store/);
  const pdf = await PDFDocument.load(await badge.arrayBuffer()); assert.equal(pdf.getPageCount(), 1); assert.ok(Math.abs(pdf.getPage(0).getWidth() - 283.465) < 0.01);
  assert.equal(await db.auditLog.count({ where: { action: "conference.badge.download", newValue: { contains: guest.registration.id } } }), 1);
  assert.equal((await call(base + "/invitations", { action: "regenerate", registrationIds: [guest.registration.id] })).status, 200);
  assert.equal((await call(gate, { action: "admit", token: guest.qrToken })).status, 404);
  const replacement = invitationCredentials(await db.conferenceInvitation.findUniqueOrThrow({ where: { registrationId: guest.registration.id } }));
  const duplicate = await call(gate, { action: "admit", token: replacement.qrToken }); assert.equal(duplicate.status, 200); assert.equal((await duplicate.json()).data.alreadyAdmitted, true);
  assert.equal((await db.conferenceAdmission.findUniqueOrThrow({ where: { registrationId: guest.registration.id } })).id, admission.id);
  await db.eventRegistration.update({ where: { id: guest.registration.id }, data: { status: "Cancelled" } });
  assert.equal((await call(gate, { action: "admit", token: replacement.qrToken })).status, 409);
  assert.equal((await call(gate + "/badge", { registrationId: guest.registration.id })).status, 409);
  await db.eventRegistration.update({ where: { id: guest.registration.id }, data: { status: "Registered" } });
  assert.equal((await call(base + "/config", { enabled: true, capacity: null, requireAcceptedRsvp: false }, adminCookie, origin, "PATCH")).status, 200);
  const manual = await fixture("manual@conference.test");
  assert.equal((await call(gate, { action: "admit", registrationId: manual.registration.id, reason: "short" })).status, 422);
  const lookup = await call(gate + "?q=manual", undefined, staffCookie); assert.equal(lookup.status, 200); assert.ok((await lookup.json()).data.some((item: { id: string }) => item.id === manual.registration.id));
  const manualResult = await call(gate, { action: "admit", registrationId: manual.registration.id, reason: "Identity checked against approved guest list" }, staffCookie); assert.equal(manualResult.status, 200);
  assert.equal((await db.conferenceAdmission.findUniqueOrThrow({ where: { registrationId: manual.registration.id } })).method, "Manual");
  const blocked = await fixture("blocked@conference.test");
  await db.conferenceInvitation.update({ where: { id: blocked.invitation.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await call(gate, { action: "admit", token: blocked.qrToken })).status, 409);
  assert.equal((await call(gate, { action: "admit", registrationId: blocked.registration.id, reason: "Identity checked at registration desk" })).status, 409);
  await db.conferenceInvitation.update({ where: { id: blocked.invitation.id }, data: { expiresAt: new Date(Date.now() + 86400000), revokedAt: new Date() } });
  assert.equal((await call(gate, { action: "admit", token: blocked.qrToken })).status, 409);
  const page = await call(`/admin/events/gate?event=${eventId}`, undefined, staffCookie); assert.equal(page.status, 200); assert.match(page.headers.get("permissions-policy")!, /camera=\(self\)/); assert.ok((await page.text()).includes("Gate check-in"));
  if (process.argv.includes("--browser")) { const browserGuest = await fixture("browsergate@conference.test"); const { checkGateBrowser } = await import("./check-conference-browser"); await checkGateBrowser(origin, eventId, staffCookie, browserGuest.qrToken); assert.equal(await db.conferenceAdmission.count({ where: { registrationId: browserGuest.registration.id } }), 1); }
  assert.equal((await call(base + "/staff", { email: staffEmail, role: "ReportingOfficer" })).status, 200);
  assert.equal((await call(gate + "?q=manual", undefined, staffCookie)).status, 403);
  assert.equal((await call(gate + "/badge", { registrationId: manual.registration.id }, staffCookie)).status, 403);
  await db.conferenceConfig.update({ where: { eventId }, data: { enabled: false } });
  assert.equal((await call(gate, { action: "admit", registrationId: manual.registration.id, reason: "Verified guest identity at desk" })).status, 409);
  await db.conferenceConfig.update({ where: { eventId }, data: { enabled: true } });
  console.log("Gate API checks passed: role/origin isolation, pending RSVP entry, strict RSVP policy, audit rollback, concurrent duplicate-safe admission, regeneration, expiry/revocation/cancellation, manual reasons, private badge PDF and disabled-event protection.");
}
