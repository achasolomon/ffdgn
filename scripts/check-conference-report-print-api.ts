import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { csvCell } from "../lib/conference/reporting";

export async function checkReportPrintApi({ origin, eventId, otherEventId, adminCookie, staffCookie, staffEmail, db, cookie, testSql }: { origin: string; eventId: string; otherEventId: string; adminCookie: string; staffCookie: string; staffEmail: string; db: PrismaClient; cookie: (userId: string, role: string) => Promise<string>; testSql: (sql: string) => Promise<unknown> }) {
  const base = `/api/v1/conference/events/${eventId}`, reports = base + "/reports", prints = base + "/prints";
  async function call(path: string, body?: unknown, session = adminCookie, key = randomUUID(), requestOrigin = origin) { return fetch(origin + path, { method: body === undefined ? "GET" : "POST", headers: { Connection: "close", Cookie: session, Origin: requestOrigin, "Content-Type": "application/json", "Idempotency-Key": key }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }
  const record = await db.eventRegistration.findFirstOrThrow({ where: { eventId, attendee: { email: "gate@conference.test" } }, include: { attendee: true } });
  const waiting = await db.eventRegistration.findFirstOrThrow({ where: { eventId, admission: { is: null }, invitation: { is: null }, status: "Registered" } });
  assert.equal((await call(reports, undefined, "")).status, 401);
  assert.equal((await call(reports, undefined, staffCookie)).status, 200); // ReportingOfficer
  assert.equal((await call(`/api/v1/conference/events/${otherEventId}/reports`, undefined, staffCookie)).status, 403);
  assert.equal((await call(prints, { action: "prepare", registrationId: record.id }, staffCookie)).status, 403);
  assert.equal((await call(reports + "?attendance=invalid")).status, 422); assert.equal((await call(reports + "?page=NaN")).status, 422);
  assert.equal((await call(reports, {}, staffCookie, randomUUID(), "https://evil.example")).status, 403);
  assert.equal((await call(base + "/staff", { email: staffEmail, role: "RegistrationOfficer" })).status, 200);
  const waitingPrint = await call(prints, { action: "prepare", registrationId: waiting.id }, staffCookie);
  assert.equal(waitingPrint.status, 200, "A registered guest may print a QR tag before admission.");
  const waitingPrintId = (await waitingPrint.json()).data.id;
  assert.equal(await db.conferenceAdmission.count({ where: { registrationId: waiting.id } }), 0);
  assert.equal((await call(prints, { action: "finish", id: waitingPrintId, state: "Cancelled" }, staffCookie)).status, 200);
  const body = { action: "prepare", registrationId: record.id }, key = randomUUID();
  const prepares = await Promise.all([call(prints, body, staffCookie, key), call(prints, body, staffCookie, key)]);
  let id = ""; for (const response of prepares) { assert.equal(response.status, 200); const data = (await response.json()).data; if (id) assert.equal(id, data.id); id = data.id; assert.equal(data.state, "Prepared"); }
  assert.equal(await db.conferenceBadgePrint.count({ where: { registrationId: record.id } }), 1);
  assert.equal((await call(prints, { ...body, reason: "Different request content" }, staffCookie, key)).status, 409);
  assert.equal((await call(prints, body, staffCookie)).status, 422);
  const initialSnapshot = (await call(prints + "?id=" + id, undefined, staffCookie)); assert.equal(initialSnapshot.status, 200); assert.match(initialSnapshot.headers.get("cache-control")!, /no-store/);
  assert.ok(!JSON.stringify(await initialSnapshot.json()).includes("ffdgn1_"));
  await db.conferenceAttendee.update({ where: { id: record.attendeeId! }, data: { fullName: '=HYPERLINK("https://example.test")', organization: "<script>alert('fixture')</script>" } });
  const snapshotAfterEdit = (await (await call(prints + "?id=" + id, undefined, staffCookie)).json()).data.snapshot;
  assert.equal(snapshotAfterEdit.fullName, record.attendee!.fullName, "Print rendering is an immutable preparation snapshot.");
  const outsider = await db.user.create({ data: { email: "otherprinter@conference.test", name: "Other Operator", role: "events_manager", passwordHash: "not-a-login-hash" } });
  await db.conferenceStaffAssignment.create({ data: { eventId, userId: outsider.id, role: "RegistrationOfficer" } });
  const outsiderCookie = await cookie(outsider.id, "events_manager");
  assert.equal((await call(prints + "?id=" + id, undefined, outsiderCookie)).status, 403);
  assert.equal((await call(prints, { action: "finish", id, state: "Confirmed" }, outsiderCookie)).status, 403);
  assert.deepEqual((await (await call(prints + "?registrationId=" + record.id, undefined, outsiderCookie)).json()).data, []);
  assert.equal((await call(`/api/v1/conference/events/${otherEventId}/prints?id=${id}`)).status, 404);
  await testSql("CREATE TRIGGER conference_print_test_audit BEFORE INSERT ON audit_log FOR EACH ROW BEGIN IF NEW.action = 'conference.print.confirmed' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Expected print rollback'; END IF; END");
  try { assert.equal((await call(prints, { action: "finish", id, state: "Confirmed" }, staffCookie)).status, 500); assert.equal((await db.conferenceBadgePrint.findUniqueOrThrow({ where: { id } })).state, "Prepared"); assert.equal(await db.conferenceBadgePrintAction.count({ where: { printId: id } }), 0); }
  finally { await testSql("DROP TRIGGER conference_print_test_audit"); }
  const confirmations = await Promise.all([call(prints, { action: "finish", id, state: "Confirmed" }, staffCookie), call(prints, { action: "finish", id, state: "Confirmed" }, staffCookie)]);
  for (const response of confirmations) assert.equal(response.status, 200);
  assert.equal(await db.conferenceBadgePrintAction.count({ where: { printId: id } }), 1);
  assert.equal((await call(prints, { action: "finish", id, state: "Cancelled" }, staffCookie)).status, 409);
  const reprint = await call(prints, { ...body, reason: "Replacement badge for printer rehearsal" }, staffCookie); assert.equal(reprint.status, 200); const reprintId = (await reprint.json()).data.id;
  const cancelled = await call(prints, { ...body, reason: "Cancel this additional printer request" }, staffCookie); assert.equal(cancelled.status, 200); const cancelledId = (await cancelled.json()).data.id;
  assert.equal((await call(prints, { action: "finish", id: cancelledId, state: "Cancelled" }, staffCookie)).status, 200);
  assert.equal((await call(prints + "?id=" + cancelledId, undefined, staffCookie)).status, 409);
  assert.equal((await call(prints, { action: "finish", id: cancelledId, state: "Confirmed" }, staffCookie)).status, 409);
  await db.eventRegistration.update({ where: { id: record.id }, data: { status: "Cancelled" } });
  assert.equal((await call(prints, { action: "finish", id: reprintId, state: "Confirmed" }, staffCookie)).status, 409);
  assert.equal((await call(prints + "?id=" + reprintId, undefined, staffCookie)).status, 409);
  const report = (await (await call(reports)).json()).data;
  assert.equal(report.summary.total, await db.eventRegistration.count({ where: { eventId } }));
  assert.equal(report.summary.admissions, await db.conferenceAdmission.count({ where: { registration: { eventId } } }));
  assert.equal(report.summary.activeAdmitted, await db.eventRegistration.count({ where: { eventId, status: "Registered", admission: { isNot: null } } }));
  assert.equal(report.summary.waiting, report.summary.active - report.summary.activeAdmitted); assert.ok(report.summary.admissions > report.summary.activeAdmitted);
  assert.deepEqual(report.summary.printing, { Prepared: 1, Confirmed: 1, Cancelled: 2 }); assert.equal(report.summary.guestsWithConfirmedBadge, 1);
  const filtered = (await (await call(reports + "?attendance=cancelled&category=VVIP")).json()).data; assert.ok(filtered.rows.every((row: { status: string; category: string }) => row.status === "Cancelled" && row.category === "VVIP"));
  const exported = await call(reports, { attendance: "admitted", q: "HYPERLINK" }, staffCookie); assert.equal(exported.status, 200); assert.match(exported.headers.get("cache-control")!, /no-store/);
  const csv = await exported.text(); assert.ok(csv.includes("'=")); assert.ok(csv.includes("admitted_at_lagos")); assert.ok(!csv.includes("ffdgn1_") && !csv.includes("rsvp1_") && !csv.includes("credentialEnvelope"));
  assert.ok(csvCell("\t=SUM(A1)").startsWith('"\'')); assert.equal(csvCell('a,"b'), '"a,""b"');
  assert.ok(await db.auditLog.count({ where: { action: "conference.report.export" } }) > 0);
  await db.eventRegistration.update({ where: { id: record.id }, data: { status: "Registered" } });
  const reportPage = await call(`/admin/events/reports?event=${eventId}`, undefined, staffCookie); assert.equal(reportPage.status, 200); assert.ok((await reportPage.text()).includes("Attendance reporting"));
  if (process.argv.includes("--browser")) { const { checkPrintBrowser } = await import("./check-conference-browser"); await checkPrintBrowser(origin, eventId, staffCookie, reprintId); assert.equal((await db.conferenceBadgePrint.findUniqueOrThrow({ where: { id: reprintId } })).state, "Confirmed"); }
  await db.conferenceConfig.update({ where: { eventId }, data: { enabled: false } });
  assert.equal((await call(prints + "?id=" + id, undefined, staffCookie)).status, 409); assert.equal((await call(reports, undefined, staffCookie)).status, 200);
  await db.conferenceConfig.update({ where: { eventId }, data: { enabled: true } });
  await db.conferenceStaffAssignment.delete({ where: { eventId_userId: { eventId, userId: outsider.id } } });
  assert.equal((await call(reports, undefined, outsiderCookie)).status, 403);
  assert.equal((await call(base + "/staff", { email: staffEmail, role: "ReportingOfficer" })).status, 200);
  assert.equal((await call(prints + "?id=" + id, undefined, staffCookie)).status, 403); assert.equal((await call(reports, {}, staffCookie)).status, 200);
  console.log("Reporting/print API checks passed: event isolation, reporting roles, historical/current attendance, CSV escaping/formula protection, private audited export, idempotent preparation, immutable snapshots, owner controls, rollback, concurrent confirmations, reprints/cancellation and disabled/revoked access.");
}
