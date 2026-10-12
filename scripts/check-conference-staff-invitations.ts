import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { SMTPServer } from "smtp-server";
import type { PrismaClient } from "@prisma/client";
import { decryptSecret } from "../lib/conference/credentials";
import { processStaffEmailJob } from "../lib/conference/staff-email-worker";

export async function checkStaffInvitations({ origin, eventId, otherEventId, db, cookie, testSql }: { origin: string; eventId: string; otherEventId: string; db: PrismaClient; cookie: (id: string, role: string) => Promise<string>; testSql: (sql: string) => Promise<unknown> }) {
  const admin = await db.user.create({ data: { name: "Invitation Admin", email: "staff-invitation-admin@conference.test", role: "secretariat_admin", passwordHash: "not-a-login-hash" } }), adminCookie = await cookie(admin.id, admin.role);
  const base = `/api/v1/conference/events/${eventId}/staff`, endpoint = base + "/accounts", setup = "/api/v1/conference/staff/setup", password = "Desk26";
  async function call(path: string, body: unknown, session = adminCookie, key = randomUUID(), requestOrigin = origin) { return fetch(origin + path, { method: "POST", headers: { Connection: "close", Cookie: session, Origin: requestOrigin, "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(body) }); }
  const body = { name: "Invited Phone Staff", email: "invited-staff@conference.test", role: "RegistrationOfficer" }, key = randomUUID();
  const results = await Promise.all([call(endpoint, body, adminCookie, key), call(endpoint, body, adminCookie, key)]); assert.ok(results.every(response => response.status === 200));
  const result = (await results[0].json()).data; assert.equal(result.invitation, "Queued"); assert.ok(!JSON.stringify(result).includes("staff1_"));
  const userId = result.userId;
  assert.equal(await db.conferenceStaffInvitation.count({ where: { userId } }), 1);
  let invitation = await db.conferenceStaffInvitation.findUniqueOrThrow({ where: { userId } });
  const tokenOf = (row: typeof invitation) => (decryptSecret(row.credentialEnvelope!, `staff:${row.id}`) as { token: string }).token;
  const firstToken = tokenOf(invitation);
  assert.ok(!(await bcrypt.compare(password, (await db.user.findUniqueOrThrow({ where: { id: userId } })).passwordHash)));
  const page = await fetch(origin + "/staff/setup"); assert.equal(page.status, 200); assert.equal(page.headers.get("referrer-policy"), "no-referrer"); assert.match(page.headers.get("cache-control")!, /no-store/);
  assert.equal((await call(setup, { token: firstToken, password }, "", randomUUID(), "https://evil.example")).status, 403);
  assert.equal((await call(setup, { token: "invalid", password }, "")).status, 422);
  assert.equal((await call(setup, { token: firstToken, password: "short" }, "")).status, 422);
  assert.equal((await call(`/api/v1/conference/events/${otherEventId}/staff/invitations`, { userId })).status, 409);
  const guestCookie = await cookie(userId, "guest_desk");
  assert.equal((await call(base + "/invitations", { userId }, guestCookie)).status, 403);
  const resendKey = randomUUID(); assert.equal((await call(base + "/invitations", { userId }, adminCookie, resendKey)).status, 200);
  invitation = await db.conferenceStaffInvitation.findUniqueOrThrow({ where: { userId } }); const secondToken = tokenOf(invitation);
  assert.notEqual(firstToken, secondToken);
  assert.equal((await call(base + "/invitations", { userId }, adminCookie, resendKey)).status, 200);
  assert.equal((await db.conferenceStaffInvitation.findUniqueOrThrow({ where: { userId } })).tokenHash, invitation.tokenHash);
  assert.equal((await call(setup, { token: firstToken, password }, "")).status, 410);
  const messages: string[] = [];
  const smtp = new SMTPServer({ disabledCommands: ["STARTTLS"], onAuth(_auth, _session, callback) { callback(null, { user: "test" }); }, onData(stream, _session, callback) { const chunks: Buffer[] = []; stream.on("data", chunk => chunks.push(Buffer.from(chunk))); stream.on("end", () => { messages.push(Buffer.concat(chunks).toString()); callback(); }); } });
  await new Promise<void>((resolve, reject) => { smtp.once("error", reject); smtp.listen(0, "127.0.0.1", resolve); });
  const originalEnv = { ...process.env };
  Object.assign(process.env, { NODE_ENV: "development", NEXTAUTH_URL: origin, CONFERENCE_SMTP_HOST: "127.0.0.1", CONFERENCE_SMTP_PORT: String((smtp.server.address() as { port: number }).port), CONFERENCE_SMTP_USER: "test", CONFERENCE_SMTP_PASSWORD: "test-secret", CONFERENCE_SMTP_FROM: "secretariat@conference.test", CONFERENCE_SMTP_ALLOW_LOCAL_PLAINTEXT: "true" });
  try { const jobs = await Promise.all([processStaffEmailJob(), processStaffEmailJob()]); assert.equal(jobs.filter(job => job?.state === "Accepted").length, 1); assert.equal(messages.length, 1); assert.ok(messages[0].includes("ffdgn-logo.png")); assert.ok(messages[0].includes("ffdgn-logo@ffdgn")); assert.ok(messages[0].replace(/=\r?\n/g, "").includes(`/staff/setup#${secondToken}`)); }
  finally { for (const name of Object.keys(process.env)) if (!(name in originalEnv)) delete process.env[name]; Object.assign(process.env, originalEnv); await new Promise<void>(resolve => smtp.close(resolve)); }
  await testSql("CREATE TRIGGER conference_staff_setup_audit BEFORE INSERT ON audit_log FOR EACH ROW BEGIN IF NEW.action = 'conference.staff.password.setup' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Expected setup rollback'; END IF; END");
  try { assert.equal((await call(setup, { token: secondToken, password }, "")).status, 500); assert.equal((await db.conferenceStaffInvitation.findUniqueOrThrow({ where: { userId } })).consumedAt, null); }
  finally { await testSql("DROP TRIGGER conference_staff_setup_audit"); }
  if (process.argv.includes("--browser")) { const { checkStaffBrowser } = await import("./check-conference-browser"); await checkStaffBrowser(origin, body.email, password, eventId, secondToken); }
  else { assert.equal((await call(setup, { token: secondToken, password }, "")).status, 200); }
  invitation = await db.conferenceStaffInvitation.findUniqueOrThrow({ where: { userId } }); assert.ok(invitation.consumedAt); assert.equal(invitation.credentialEnvelope, null);
  assert.equal((await call(setup, { token: secondToken, password }, "")).status, 410);
  assert.equal((await call(base + "/invitations", { userId })).status, 409);
  assert.equal(await db.auditLog.count({ where: { actorId: userId, action: "conference.staff.password.setup" } }), 1);
  assert.ok(await bcrypt.compare(password, (await db.user.findUniqueOrThrow({ where: { id: userId } })).passwordHash));
  const concurrent = await call(endpoint, { ...body, email: "invite-concurrent@conference.test" }); assert.equal(concurrent.status, 200);
  const concurrentId = (await concurrent.json()).data.userId, concurrentRow = await db.conferenceStaffInvitation.findUniqueOrThrow({ where: { userId: concurrentId } });
  const claims = await Promise.all([call(setup, { token: tokenOf(concurrentRow), password }, ""), call(setup, { token: tokenOf(concurrentRow), password }, "")]); assert.deepEqual(claims.map(response => response.status).sort(), [200, 410]);
  for (const mode of ["expired", "deactivated", "unassigned"]) {
    const response = await call(endpoint, { ...body, email: `invite-${mode}@conference.test` }); assert.equal(response.status, 200); const id = (await response.json()).data.userId;
    const row = await db.conferenceStaffInvitation.findUniqueOrThrow({ where: { userId: id } }); const token = tokenOf(row);
    if (mode === "expired") await db.conferenceStaffInvitation.update({ where: { id: row.id }, data: { expiresAt: new Date(0) } });
    if (mode === "deactivated") await db.user.update({ where: { id }, data: { isActive: false } });
    if (mode === "unassigned") await db.conferenceStaffAssignment.delete({ where: { eventId_userId: { eventId, userId: id } } });
    assert.equal((await call(setup, { token, password }, "")).status, 410);
  }
  console.log("Staff invitation checks passed: atomic queued setup, idempotent creation/resend, encrypted one-use token, old/expired/revoked links, origin/password validation, concurrent SMTP claims, captured setup email, audit rollback, mobile password creation and real guest-desk sign-in.");
}
