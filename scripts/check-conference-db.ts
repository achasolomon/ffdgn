// Uses only a newly-created, uniquely-named local test database. Never migrates DATABASE_URL.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import mysql from "mysql2/promise";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { CSV_HEADERS } from "../lib/conference/input";

async function main() {
loadEnvConfig(process.cwd());
const original = new URL(process.env.DATABASE_URL ?? "");
assert.ok(["localhost", "127.0.0.1"].includes(original.hostname), "Only local MySQL is allowed.");
const testName = `conference_test_${randomUUID().replaceAll("-", "")}`;
assert.match(testName, /^conference_test_[a-f0-9]{32}$/);
const appUser = decodeURIComponent(original.username);
assert.match(appUser, /^[a-zA-Z0-9_]+$/);
function adminSql(sql: string) {
  const command = spawnSync("docker", ["exec", "-i", "ffdgn-mysql", "sh", "-c", 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD"'], { input: sql, encoding: "utf8" });
  if (command.status !== 0) throw new Error(command.stderr || command.error?.message || "Local database administration failed.");
}
let connection: mysql.Connection | undefined, prisma: PrismaClient | undefined;
try {
  adminSql(`CREATE DATABASE \`${testName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON \`${testName}\`.* TO '${appUser}'@'%';`);
  connection = await mysql.createConnection({ host: original.hostname, port: Number(original.port || 3306), user: appUser, password: decodeURIComponent(original.password), database: testName, multipleStatements: true });
  const migrationName = "20261011100000_conference_foundation";
  const migrations = readdirSync("prisma/migrations").filter(name => /^\d/.test(name)).sort();
  for (const directory of migrations.filter(name => name < migrationName)) await connection.query(readFileSync(`prisma/migrations/${directory}/migration.sql`, "utf8"));
  const actorId = randomUUID(), eventId = randomUUID(), legacyId = randomUUID();
  await connection.execute("INSERT INTO users (id,email,name,password_hash,role,updated_at) VALUES (?,?,?,?,?,NOW(3))", [actorId, "legacy@conference.test", "Existing Member", "not-a-login-hash", "super_admin"]);
  await connection.execute("INSERT INTO events (id,slug,title,theme,kind,start_date,end_date,venue,city,status,summary,updated_at) VALUES (?,?,?,?,?,CURDATE(),CURDATE(),?,?,?, ?,NOW(3))", [eventId, "conference-test", "Test Conference", "Test", "Summit", "Test venue", "Lagos", "Upcoming", "Temporary test event"]);
  await connection.execute("INSERT INTO event_registrations (id,user_id,event_id,updated_at) VALUES (?,?,?,NOW(3))", [legacyId, actorId, eventId]);
  for (const directory of migrations.filter(name => name >= migrationName)) await connection.query(readFileSync(`prisma/migrations/${directory}/migration.sql`, "utf8"));
  const testUrl = new URL(original); testUrl.pathname = `/${testName}`;
  process.env.DATABASE_URL = testUrl.toString();
  process.env.REDIS_URL = ""; // No background Redis sockets in this isolated test.
  process.env.CONFERENCE_CREDENTIAL_KEY = randomBytes(32).toString("base64");
  process.env.CONFERENCE_MODULE_ENABLED = "true";
  const service = await import("../lib/conference/server");
  const { db } = await import("../lib/db"); prisma = db;
  const old = await prisma.eventRegistration.findUniqueOrThrow({ where: { id: legacyId } });
  assert.equal(old.userId, actorId); assert.equal(old.attendeeId, null); assert.equal(old.status, "Registered");
  await prisma.conferenceConfig.create({ data: { eventId, enabled: true, capacity: 2 } });
  const auth = { user: { id: actorId, name: "Test Actor", email: "legacy@conference.test", role: "super_admin" as const } };
  const guest = (email: string) => ({ fullName: "Invited Guest", email, phone: "", organization: "Forum", jobTitle: "Chair", category: "VVIP", invitationSource: "Previously sent letter" });
  const create = (email: string) => db.$transaction(async tx => {
    const config = await service.lockConfig(tx, eventId);
    await service.checkCapacity(tx, eventId, config.capacity, 1);
    const record = await service.addGuest(tx, eventId, guest(email));
    await service.transactionalAudit(tx, auth, eventId, "conference.test.create", `id=${record.id}`);
    return record;
  });
  const capacityRace = await Promise.allSettled([create("one@conference.test"), create("two@conference.test")]);
  assert.equal(capacityRace.filter(item => item.status === "fulfilled").length, 1);
  assert.equal(await db.eventRegistration.count({ where: { eventId, status: "Registered" } }), 2);
  await db.conferenceConfig.update({ where: { eventId }, data: { capacity: null } });
  const duplicateRace = await Promise.allSettled([create("duplicate@conference.test"), create("duplicate@conference.test")]);
  assert.equal(duplicateRace.filter(item => item.status === "fulfilled").length, 1);
  assert.equal(await db.conferenceAttendee.count({ where: { email: "duplicate@conference.test" } }), 1);
  await assert.rejects(() => db.$transaction(async tx => {
    await service.lockConfig(tx, eventId);
    await service.addGuest(tx, eventId, guest("rollback@conference.test"));
    await service.transactionalAudit(tx, { user: { ...auth.user, id: randomUUID() } }, eventId, "conference.test.invalid-actor", "must rollback");
  }));
  assert.equal(await db.conferenceAttendee.count({ where: { email: "rollback@conference.test" } }), 0);
  const other = await db.forumEvent.create({ data: { slug: "other-conference-test", title: "Other", theme: "Test", kind: "Summit", startDate: new Date(), endDate: new Date(), venue: "Venue", city: "Lagos", status: "Upcoming", summary: "Test" } });
  await db.conferenceConfig.create({ data: { eventId: other.id, enabled: true } });
  const attendeeBefore = await db.conferenceAttendee.findUniqueOrThrow({ where: { email: "duplicate@conference.test" } });
  await assert.rejects(() => db.$transaction(tx => service.addGuest(tx, other.id, { ...guest("duplicate@conference.test"), fullName: "Different Person" })));
  assert.equal((await db.conferenceAttendee.findUniqueOrThrow({ where: { email: "duplicate@conference.test" } })).fullName, attendeeBefore.fullName);
  await db.$transaction(tx => service.addGuest(tx, other.id, guest("duplicate@conference.test")));
  assert.equal(await db.conferenceAttendee.count({ where: { email: "duplicate@conference.test" } }), 1);
  if (process.argv.includes("--api")) {
    const port = 3119, origin = `http://127.0.0.1:${port}`, secret = randomUUID() + randomUUID();
    const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", String(port), "--hostname", "127.0.0.1"], { env: { ...process.env, DATABASE_URL: testUrl.toString(), NEXTAUTH_URL: origin, NEXTAUTH_SECRET: secret, CONFERENCE_MODULE_ENABLED: "true", NODE_ENV: "production", REDIS_URL: "" }, stdio: "pipe", windowsHide: true });
    let log = ""; server.stdout?.on("data", data => { log = (log + data).slice(-5000); }); server.stderr?.on("data", data => { log = (log + data).slice(-5000); });
    try {
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        if (server.exitCode !== null) throw new Error(`Test server exited: ${log}`);
        try { const response = await fetch(`${origin}/api/auth/providers`); if (response.ok) { ready = true; break; } } catch { /* server starting */ }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      assert.ok(ready, "Production test server must become ready.");
      async function cookie(userId: string, role: string) { return `next-auth.session-token=${await encode({ secret, token: { id: userId, role, name: "Test Staff", email: "staff@conference.test" }, maxAge: 3600 })}`; }
      const adminCookie = await cookie(actorId, "super_admin");
      const route = `/api/v1/conference/events/${eventId}`;
      async function call(path: string, method = "GET", body?: unknown, session = adminCookie, requestOrigin = origin) {
        return fetch(origin + path, { method, headers: { Connection: "close", Cookie: session, Origin: requestOrigin, "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      }
      assert.equal((await call(`${route}/guests`, "GET", undefined, "")).status, 401);
      assert.equal((await call(`${route}/guests`, "POST", guest("origin@conference.test"), adminCookie, "https://evil.example")).status, 403);
      assert.equal((await call(`${route}/guests`, "POST", { fullName: "Missing email" })).status, 422);
      const csv = `${CSV_HEADERS.join(",")}\nAPI Guest,api@conference.test,,Forum,Chair,VIP,Formal invitation`;
      const preview = await call(`${route}/imports`, "POST", { csv }); assert.equal(preview.status, 200);
      const previewBody = await preview.json(); assert.equal(previewBody.data.valid, true);
      const commitPath = `${route}/imports/${previewBody.data.id}/commit`;
      const commits = await Promise.all([call(commitPath, "POST"), call(commitPath, "POST")]);
      for (const committed of commits) { assert.equal(committed.status, 200); assert.deepEqual((await committed.json()).data, { imported: 1, emailsSent: 0 }); }
      assert.equal(await db.eventRegistration.count({ where: { eventId, attendee: { email: "api@conference.test" } } }), 1);
      const committedBatch = await db.conferenceImport.findUniqueOrThrow({ where: { id: previewBody.data.id } }); assert.equal(committedBatch.rows, null);
      const duplicatePreview = await call(`${route}/imports`, "POST", { csv }); const duplicateBody = await duplicatePreview.json(); assert.equal(duplicateBody.data.valid, false);
      assert.equal((await call(`${route}/imports/${duplicateBody.data.id}/commit`, "POST")).status, 422);
      const expiredPreview = await call(`${route}/imports`, "POST", { csv: csv.replaceAll("api@", "expired@") });
      const expiredBody = await expiredPreview.json(); await db.conferenceImport.update({ where: { id: expiredBody.data.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      assert.equal((await call(`${route}/imports/${expiredBody.data.id}/commit`, "POST")).status, 409);
      const purge = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/purge-conference-previews.ts"], { env: { ...process.env, DATABASE_URL: testUrl.toString() }, encoding: "utf8" });
      assert.equal(purge.status, 0, purge.stderr);
      assert.equal((await db.conferenceImport.findUniqueOrThrow({ where: { id: expiredBody.data.id } })).rows, null);
      const staff = await db.user.create({ data: { email: "staff@conference.test", name: "Test Staff", role: "events_manager", passwordHash: "not-a-login-hash" } });
      const staffCookie = await cookie(staff.id, "events_manager");
      assert.equal((await call(`${route}/guests`, "GET", undefined, staffCookie)).status, 403);
      assert.equal((await call(`${route}/staff`, "POST", { email: staff.email, role: "ReportingOfficer" })).status, 200);
      assert.equal((await call(`${route}/guests`, "GET", undefined, staffCookie)).status, 200);
      assert.equal((await call(`${route}/guests`, "POST", guest("denied@conference.test"), staffCookie)).status, 403);
      assert.equal((await call(`/api/v1/conference/events/${other.id}/guests`, "GET", undefined, staffCookie)).status, 403);
      assert.equal((await call(`/api/v1/portal/events/conference-test/registration`, "POST", {})).status, 403);
      const portalEvents = await call("/api/v1/portal/events"); assert.equal(portalEvents.status, 200); assert.equal((await portalEvents.json()).data.find((event: { slug: string }) => event.slug === "conference-test").registrationAllowed, false);
      const page = await call(`/admin/events/operations?event=${eventId}&view=guests`); assert.equal(page.status, 200); const html = await page.text(); assert.ok(html.includes("Find a guest")); assert.ok(html.includes("API Guest"));
      assert.ok(html.includes("Send invitations"));
      if (process.argv.includes("--browser")) { const { checkConsoleBrowser } = await import("./check-conference-browser"); await checkConsoleBrowser(origin, adminCookie); }
      const importedGuest = await db.eventRegistration.findFirstOrThrow({ where: { eventId, attendee: { email: "api@conference.test" } } });
      const { checkInvitationApi } = await import("./check-conference-invitation-api");
      await checkInvitationApi({ origin, eventId, registrationId: importedGuest.id, adminCookie, staffCookie, db });
      const { checkGateApi } = await import("./check-conference-gate-api");
      await checkGateApi({ origin, eventId, otherEventId: other.id, adminCookie, staffCookie, staffEmail: staff.email, db, testSql: sql => connection!.query(sql) });
      const { checkReportPrintApi } = await import("./check-conference-report-print-api");
      await checkReportPrintApi({ origin, eventId, otherEventId: other.id, adminCookie, staffCookie, staffEmail: staff.email, db, cookie, testSql: sql => connection!.query(sql) });
      const { checkWalkinApi } = await import("./check-conference-walkin-api");
      await checkWalkinApi({ origin, eventId, otherEventId: other.id, staffCookie, db, cookie, testSql: sql => connection!.query(sql) });
      const { checkStaffApi } = await import("./check-conference-staff-api");
      await checkStaffApi({ origin, eventId, otherEventId: other.id, db, cookie, testSql: sql => connection!.query(sql) });
      const { checkStaffInvitations } = await import("./check-conference-staff-invitations");
      await checkStaffInvitations({ origin, eventId, otherEventId: other.id, db, cookie, testSql: sql => connection!.query(sql) });
      assert.equal((await call(`${route}/staff`, "POST", { email: staff.email, role: null })).status, 200);
      assert.equal((await call(`${route}/guests`, "GET", undefined, staffCookie)).status, 403);
      console.log("Conference API checks passed: authentication/origin, invalid input, concurrent idempotent commit, committed/expired preview purge, duplicate/expired previews, scoped roles/revocation, invitation-only portal enforcement and rendered guest screen.");
    } catch (error) {
      console.error("Production test server diagnostics:", log);
      throw error;
    } finally {
      server.kill();
      await new Promise<void>(resolve => { if (server.exitCode !== null) resolve(); else { server.once("exit", () => resolve()); setTimeout(resolve, 5000).unref(); } });
    }
  }
  console.log("Conference database checks passed: all migration SQL, legacy registration preservation, concurrent capacity and duplicate imports, audit rollback and cross-event identity reuse/conflicts.");
} finally {
  if (prisma) await prisma.$disconnect();
  if (connection) await connection.end();
  // Only the database generated above can be removed.
  assert.match(testName, /^conference_test_[a-f0-9]{32}$/);
  adminSql(`DROP DATABASE IF EXISTS \`${testName}\`; REVOKE ALL PRIVILEGES ON \`${testName}\`.* FROM '${appUser}'@'%';`);
}
}
main().catch(error => { console.error(error); process.exitCode = 1; });
