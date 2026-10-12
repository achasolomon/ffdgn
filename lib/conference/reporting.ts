import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/server-auth";
import { conferenceAuth, problem, transactionalAudit } from "./server";
import { GUEST_CATEGORIES } from "./input";

export type AttendanceFilter = { attendance: "all" | "admitted" | "waiting" | "cancelled"; category: string; q: string; page: number };
export function attendanceFilter(raw: Record<string, unknown>): AttendanceFilter {
  const attendance = String(raw.attendance ?? "all"), category = String(raw.category ?? ""), q = String(raw.q ?? "").trim().slice(0, 100);
  if (!["all", "admitted", "waiting", "cancelled"].includes(attendance) || (category && !(GUEST_CATEGORIES as readonly string[]).includes(category))) problem(422, "VALIDATION", "Choose a supported attendance status and guest category.");
  const page = Number(raw.page ?? 1); if (!Number.isInteger(page) || page < 1 || page > 10000) problem(422, "VALIDATION", "Choose a valid report page.");
  return { attendance: attendance as AttendanceFilter["attendance"], category, q, page };
}
function whereFor(eventId: string, filter: AttendanceFilter): Prisma.EventRegistrationWhereInput {
  return { eventId, ...(filter.category ? { guestCategory: filter.category } : {}), ...(filter.attendance === "admitted" ? { admission: { isNot: null } } : filter.attendance === "waiting" ? { status: "Registered", admission: { is: null } } : filter.attendance === "cancelled" ? { status: "Cancelled" } : {}), ...(filter.q ? { OR: [{ attendee: { fullName: { contains: filter.q } } }, { attendee: { email: { contains: filter.q } } }, { user: { name: { contains: filter.q } } }, { user: { email: { contains: filter.q } } }] } : {}) };
}
const reportSelect = { id: true, guestCategory: true, status: true, conferenceRsvp: true, attendee: { select: { fullName: true, email: true, organization: true } }, user: { select: { name: true, email: true } }, admission: { select: { createdAt: true, actorName: true, method: true } }, badgePrints: { select: { state: true } } } satisfies Prisma.EventRegistrationSelect;
type Row = Prisma.EventRegistrationGetPayload<{ select: typeof reportSelect }>;
function reportRow(row: Row) {
  return { id: row.id, fullName: row.attendee?.fullName ?? row.user?.name ?? "Invited guest", email: row.attendee?.email ?? row.user?.email ?? "", organization: row.attendee?.organization ?? "", category: row.guestCategory, status: row.status, rsvp: row.conferenceRsvp, admission: row.admission ? { at: row.admission.createdAt.toISOString(), operator: row.admission.actorName, method: row.admission.method } : null, printing: { prepared: row.badgePrints.filter(item => item.state === "Prepared").length, confirmed: row.badgePrints.filter(item => item.state === "Confirmed").length, cancelled: row.badgePrints.filter(item => item.state === "Cancelled").length } };
}
export async function attendanceReport(eventId: string, filter: AttendanceFilter) {
  return db.$transaction(async tx => {
    const base = { eventId }, where = whereFor(eventId, filter);
    const total = await tx.eventRegistration.count({ where: base });
    const active = await tx.eventRegistration.count({ where: { ...base, status: "Registered" } });
    const admissions = await tx.eventRegistration.count({ where: { ...base, admission: { isNot: null } } });
    const activeAdmitted = await tx.eventRegistration.count({ where: { ...base, status: "Registered", admission: { isNot: null } } });
    const rsvp = await tx.eventRegistration.groupBy({ by: ["conferenceRsvp"], where: { ...base, status: "Registered" }, _count: { _all: true } });
    const categories = await tx.eventRegistration.groupBy({ by: ["guestCategory"], where: base, _count: { _all: true }, orderBy: { guestCategory: "asc" } });
    const categoryActive = await tx.eventRegistration.groupBy({ by: ["guestCategory"], where: { ...base, status: "Registered" }, _count: { _all: true } });
    const categoryAdmitted = await tx.eventRegistration.groupBy({ by: ["guestCategory"], where: { ...base, status: "Registered", admission: { isNot: null } }, _count: { _all: true } });
    const methods = await tx.conferenceAdmission.groupBy({ by: ["method"], where: { registration: base }, _count: { _all: true } });
    const printing = await tx.conferenceBadgePrint.groupBy({ by: ["state"], where: { registration: base }, _count: { _all: true } });
    const guestsWithConfirmedBadge = await tx.eventRegistration.count({ where: { ...base, badgePrints: { some: { state: "Confirmed" } } } });
    const matching = await tx.eventRegistration.count({ where });
    const rows = await tx.eventRegistration.findMany({ where, select: reportSelect, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 25, skip: (filter.page - 1) * 25 });
    return { asOf: new Date().toISOString(), timezone: "Africa/Lagos", summary: { total, active, cancelled: total - active, admissions, activeAdmitted, waiting: active - activeAdmitted, attendancePercent: active ? Math.round(activeAdmitted / active * 1000) / 10 : 0, rsvp: Object.fromEntries(["Pending", "Accepted", "Declined"].map(state => [state, rsvp.find(item => item.conferenceRsvp === state)?._count._all ?? 0])), methods: Object.fromEntries(methods.map(item => [item.method, item._count._all])), printing: Object.fromEntries(["Prepared", "Confirmed", "Cancelled"].map(state => [state, printing.find(item => item.state === state)?._count._all ?? 0])), guestsWithConfirmedBadge }, categories: categories.map(item => ({ category: item.guestCategory, total: item._count._all, active: categoryActive.find(row => row.guestCategory === item.guestCategory)?._count._all ?? 0, admitted: categoryAdmitted.find(row => row.guestCategory === item.guestCategory)?._count._all ?? 0 })), rows: rows.map(reportRow), matching, page: filter.page, pages: Math.max(1, Math.ceil(matching / 25)) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000 });
}
export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  // Quoting handles delimiters; a separate apostrophe prevents spreadsheet formulas.
  if (/^[\s\uFEFF]*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
export async function exportAttendance(eventId: string, auth: AuthContext, filter: AttendanceFilter) {
  return db.$transaction(async tx => {
    await conferenceAuth(eventId, "view", tx);
    const where = whereFor(eventId, filter), count = await tx.eventRegistration.count({ where });
    if (count > 10000) problem(413, "EXPORT_LIMIT", "Export at most 10,000 matching registrations. Narrow the category or attendance filter.");
    const headers = ["registration_id", "full_name", "email", "organization", "category", "registration_status", "rsvp", "admitted_at_utc", "admitted_at_lagos", "admission_method", "admitted_by", "prepared_print_requests", "operator_confirmed_prints", "cancelled_print_requests"];
    const lines = [headers.map(csvCell).join(",")];
    for (let skip = 0; skip < count; skip += 500) {
      const rows = await tx.eventRegistration.findMany({ where, select: reportSelect, orderBy: { id: "asc" }, take: 500, skip });
      for (const item of rows) { const row = reportRow(item); lines.push([row.id, row.fullName, row.email, row.organization, row.category, row.status, row.rsvp, row.admission?.at ?? "", row.admission ? new Date(row.admission.at).toLocaleString("en-GB", { timeZone: "Africa/Lagos", hour12: false }) : "", row.admission?.method ?? "", row.admission?.operator ?? "", row.printing.prepared, row.printing.confirmed, row.printing.cancelled].map(csvCell).join(",")); }
    }
    await transactionalAudit(tx, auth, eventId, "conference.report.export", `rows=${count}; attendance=${filter.attendance}; category=${filter.category || "all"}`);
    return "\uFEFF" + lines.join("\r\n") + "\r\n";
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30000 });
}
