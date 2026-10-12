import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { invitationCredentials } from "../lib/conference/credentials";

export async function checkStaffApi({ origin, eventId, otherEventId, db, cookie, testSql }: { origin: string; eventId: string; otherEventId: string; db: PrismaClient; cookie: (id: string, role: string) => Promise<string>; testSql: (sql: string) => Promise<unknown> }) {
  const admin = await db.user.create({ data: { email: "staff-creator@conference.test", name: "Staff Creator", role: "secretariat_admin", passwordHash: "not-a-login-hash" } });
  const adminCookie = await cookie(admin.id, admin.role), base = `/api/v1/conference/events/${eventId}`, endpoint = base + "/staff/accounts", password = "Staff026";
  async function call(path: string, body?: unknown, session = adminCookie, key = randomUUID(), requestOrigin = origin, method = body === undefined ? "GET" : "POST") {
    return fetch(origin + path, { method, redirect: "manual", headers: { Connection: "close", Cookie: session, Origin: requestOrigin, "Content-Type": "application/json", "Idempotency-Key": key }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  const body = { name: "Scoped Registration Staff", email: "scoped-staff@conference.test", password, role: "RegistrationOfficer", globalRole: "super_admin" }, key = randomUUID();
  assert.equal((await call(endpoint, body, "", key)).status, 401);
  assert.equal((await call(endpoint, body, adminCookie, key, "https://evil.example")).status, 403);
  assert.equal((await call(endpoint, { ...body, password: "short" })).status, 422);
  assert.equal((await call(endpoint, { ...body, role: "super_admin" })).status, 422);
  await testSql("CREATE TRIGGER conference_staff_test_audit BEFORE INSERT ON audit_log FOR EACH ROW BEGIN IF NEW.action = 'conference.staff.account.create' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Expected account rollback'; END IF; END");
  try { assert.equal((await call(endpoint, body, adminCookie, key)).status, 500); assert.equal(await db.user.count({ where: { email: body.email } }), 0); }
  finally { await testSql("DROP TRIGGER conference_staff_test_audit"); }
  const responses = await Promise.all([call(endpoint, body, adminCookie, key), call(endpoint, body, adminCookie, key)]);
  for (const response of responses) assert.equal(response.status, 200);
  const result = (await responses[0].json()).data; assert.deepEqual((await responses[1].json()).data, result); assert.equal(result.access, "guest_desk");
  assert.ok(!JSON.stringify(result).includes(password) && !JSON.stringify(result).includes("passwordHash"));
  assert.equal((await call(endpoint, { ...body, password: password + "-different" }, adminCookie, key)).status, 409);
  assert.equal((await call(endpoint, body)).status, 409);
  const user = await db.user.findUniqueOrThrow({ where: { email: body.email } }); assert.equal(user.role, "guest_desk"); assert.ok(await bcrypt.compare(password, user.passwordHash)); assert.notEqual(user.passwordHash, password);
  assert.equal(await db.conferenceStaffAssignment.count({ where: { userId: user.id } }), 1);
  const session = await cookie(user.id, "guest_desk");
  for (const path of ["/api/v1/users", "/api/v1/members", "/api/v1/cms/documents", "/api/v1/portal/events", "/api/v1/portal/discussions", "/api/v1/documents/private-test.pdf"]) assert.equal((await call(path, undefined, session)).status, 403, path);
  for (const path of ["/admin", "/admin/membership", "/admin/events", "/admin/website", "/portal/profile", "/site-preview/about"]) { const response = await call(path, undefined, session); assert.equal(response.status, 307); assert.equal(new URL(response.headers.get("location")!, origin).pathname, "/admin/events/operations"); }
  const stale = await cookie(user.id, "super_admin");
  assert.equal((await call("/api/v1/users", undefined, stale)).status, 401, "Live server authorization must reject a stale broader-role JWT.");
  assert.equal((await call("/admin", undefined, stale)).status, 307);
  assert.equal((await call(base + "/guests", undefined, session)).status, 200);
  assert.equal((await call(`/api/v1/conference/events/${otherEventId}/guests`, undefined, session)).status, 403);
  assert.equal((await call(base + "/config", { enabled: true }, session, randomUUID(), origin, "PATCH")).status, 403);
  assert.equal((await call(endpoint, { ...body, email: "forbidden-new@conference.test" }, session)).status, 403);
  const walkin = await call(base + "/walkins", { fullName: "Registered by scoped staff" }, session); assert.equal(walkin.status, 200); const walkinResult = (await walkin.json()).data;
  assert.equal((await call(base + "/prints?id=" + walkinResult.printId, undefined, session)).status, 200);
  const registration = await db.eventRegistration.findUniqueOrThrow({ where: { id: walkinResult.registrationId }, include: { invitation: true } }), token = invitationCredentials(registration.invitation!).qrToken;
  async function createDuty(role: string, email: string) { const response = await call(endpoint, { name: role + " Test Staff", email, password, role }); assert.equal(response.status, 200); const id = (await response.json()).data.userId; return { id, session: await cookie(id, "guest_desk") }; }
  const gate = await createDuty("GateOfficer", "gate-only@conference.test"), report = await createDuty("ReportingOfficer", "report-only@conference.test"), manager = await createDuty("Manager", "manager-only@conference.test");
  assert.equal((await call(base + "/gate", { action: "verify", token }, gate.session)).status, 200);
  assert.equal((await call(base + "/gate", { action: "admit", token }, gate.session)).status, 200);
  for (const path of [base + "/guests", base + "/reports", base + "/invitations"]) assert.equal((await call(path, undefined, gate.session)).status, 403);
  assert.equal((await call(base + "/walkins", { fullName: "Forbidden gate registration" }, gate.session)).status, 403);
  assert.equal((await call(base + "/reports", undefined, report.session)).status, 200);
  assert.equal((await call(base + "/gate", { action: "verify", token }, report.session)).status, 403);
  assert.equal((await call(base + "/walkins", { fullName: "Forbidden report registration" }, report.session)).status, 403);
  assert.equal((await call(base + "/config", { enabled: true, capacity: null }, manager.session, randomUUID(), origin, "PATCH")).status, 200);
  assert.equal((await call(endpoint, { ...body, email: "manager-cannot-create@conference.test" }, manager.session)).status, 403);
  assert.equal((await call(base + "/staff", { email: user.email, role: "Manager" }, manager.session)).status, 403);
  const gatePage = await call(`/admin/events/operations?event=${eventId}`, undefined, gate.session); const gateHtml = await gatePage.text(); assert.ok(gateHtml.includes("Check guests in at the gate")); assert.ok(!gateHtml.includes("Register a new guest") && !gateHtml.includes("View attendance"));
  if (process.argv.includes("--browser")) { const { checkStaffBrowser } = await import("./check-conference-browser"); await checkStaffBrowser(origin, body.email, password, eventId); }
  assert.equal((await call(base + "/staff", { email: user.email, role: null })).status, 200);
  assert.equal((await call(base + "/guests", undefined, session)).status, 403);
  assert.equal((await call(`/admin/events/operations?view=account`, undefined, session)).status, 200, "An unassigned staff member can still change their own password.");
  await db.user.update({ where: { id: user.id }, data: { isActive: false } });
  assert.equal((await call(base + "/guests", undefined, session)).status, 401);
  console.log("Guest-desk staff checks passed: atomic/idempotent account creation, bcrypt, rollback, fixed restricted role, live role refresh, no wider console/API/portal access, event scoping, registration/gate/report/manager duties, real browser sign-in and assignment/deactivation revocation.");
}
