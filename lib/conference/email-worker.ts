import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { emailLogoAttachment } from "./brand";
import { activeInvitation, credentialKey, invitationCredentials, invitationOrigin } from "./credentials";
import { eventDates, invitationEmail, invitationPdf, qrImage, walkinEmail, type InvitationDetails } from "./render-invitation";
import { badgePdf, BADGE_LAYOUT_VERSION } from "./badge";

const MAX_ATTEMPTS = 3;
export function smtpSettings() {
  // Select one complete configuration family; never mix provider credentials.
  const conference = !!process.env.CONFERENCE_SMTP_HOST?.trim();
  if (!conference && process.env.MAIL_MAILER && process.env.MAIL_MAILER !== "smtp") throw new Error("MAIL_MAILER must be smtp.");
  const host = (conference ? process.env.CONFERENCE_SMTP_HOST : process.env.MAIL_HOST)?.trim() ?? "", user = (conference ? process.env.CONFERENCE_SMTP_USER : process.env.MAIL_USERNAME)?.trim() ?? "", password = (conference ? process.env.CONFERENCE_SMTP_PASSWORD : process.env.MAIL_PASSWORD) ?? "", from = (conference ? process.env.CONFERENCE_SMTP_FROM : process.env.MAIL_FROM_ADDRESS)?.trim() ?? "";
  const fromName = (conference ? process.env.CONFERENCE_SMTP_FROM_NAME : process.env.MAIL_FROM_NAME)?.trim() || "FFDGN Secretariat";
  const port = Number((conference ? process.env.CONFERENCE_SMTP_PORT : process.env.MAIL_PORT) || (conference ? 465 : 587));
  if (!host || !user || !password || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from) || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Conference SMTP host, port, user, password and sender address are required.");
  const localTest = process.env.NODE_ENV !== "production" && process.env.CONFERENCE_SMTP_ALLOW_LOCAL_PLAINTEXT === "true" && ["127.0.0.1", "localhost", "::1"].includes(host);
  return { host, port, from, fromName, user, password, localTest };
}
export function emailReadiness() {
  try { smtpSettings(); return true; } catch { return false; }
}
export function transport() {
  const settings = smtpSettings();
  return { from: settings.from, fromName: settings.fromName, smtp: nodemailer.createTransport({ host: settings.host, port: settings.port, secure: settings.port === 465, requireTLS: !settings.localTest && settings.port !== 465, ignoreTLS: settings.localTest, auth: { user: settings.user, pass: settings.password }, tls: { minVersion: "TLSv1.2", rejectUnauthorized: true }, connectionTimeout: 15_000, greetingTimeout: 15_000, socketTimeout: 45_000, disableFileAccess: true, disableUrlAccess: true }) };
}

export function emailFailure(error: unknown, attempts: number): { state: "Queued" | "Failed" | "Uncertain"; code: string } {
  const detail = error as { code?: string; command?: string; responseCode?: number };
  const code = typeof detail?.code === "string" && /^[A-Z0-9_]{1,40}$/.test(detail.code) ? detail.code : "SMTP_UNKNOWN";
  if (detail?.responseCode && detail.responseCode >= 400 && detail.responseCode < 500) return { state: attempts < MAX_ATTEMPTS ? "Queued" : "Failed", code };
  if (["EAUTH", "EMESSAGE", "EENVELOPE"].includes(code) || (detail?.responseCode && detail.responseCode >= 500)) return { state: "Failed", code };
  const safeRetry = code === "ECONNECTION" || code === "ETLS" || (code === "ETIMEDOUT" && detail?.command === "CONN");
  if (safeRetry) return { state: attempts < MAX_ATTEMPTS ? "Queued" : "Failed", code };
  // A dropped connection during DATA may have happened after acceptance. Never automatically resend it.
  return { state: "Uncertain", code };
}

export async function processEmailJob() {
  if (process.env.CONFERENCE_MODULE_ENABLED !== "true") throw new Error("Conference operations must be enabled before running the email worker.");
  // Validate configuration before claiming work; a missing SMTP password never burns attempts.
  credentialKey();
  const { smtp, from, fromName } = transport(), origin = invitationOrigin();
  const owner = randomUUID();
  const job = await db.$transaction(async tx => {
    const stale = await tx.conferenceEmailJob.findMany({ where: { state: "Processing", leaseUntil: { lt: new Date() } }, select: { id: true, attempts: true }, take: 100 });
    for (const row of stale) {
      const updated = await tx.conferenceEmailJob.updateMany({ where: { id: row.id, state: "Processing", leaseUntil: { lt: new Date() } }, data: { state: "Uncertain", errorCode: "WORKER_LEASE_EXPIRED", leaseOwner: null, leaseUntil: null } });
      if (updated.count) await tx.conferenceEmailAttempt.updateMany({ where: { jobId: row.id, attempt: row.attempts, state: "Processing" }, data: { state: "Uncertain", errorCode: "WORKER_LEASE_EXPIRED", finishedAt: new Date() } });
    }
    const candidates = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM conference_email_jobs WHERE state = 'Queued' AND available_at <= NOW(3) ORDER BY available_at, id LIMIT 1 FOR UPDATE SKIP LOCKED`;
    if (!candidates.length) return null;
    const claimed = await tx.conferenceEmailJob.update({ where: { id: candidates[0].id }, data: { state: "Processing", attempts: { increment: 1 }, leaseOwner: owner, leaseUntil: new Date(Date.now() + 120_000), errorCode: null } });
    await tx.conferenceEmailAttempt.create({ data: { jobId: claimed.id, attempt: claimed.attempts, state: "Processing" } });
    return claimed;
  });
  if (!job) { smtp.close(); const { processStaffEmailJob } = await import("./staff-email-worker"); return processStaffEmailJob(); }
  let state: "Queued" | "Accepted" | "Failed" | "Uncertain" | "Cancelled" = "Failed", errorCode: string | null = null, messageId: string | null = null;
  let smtpStarted = false;
  try {
    const invitation = await db.conferenceInvitation.findUniqueOrThrow({ where: { id: job.invitationId }, include: { registration: { include: { attendee: true, user: { select: { name: true, email: true } }, event: { include: { conferenceConfig: true } } } } } });
    const registration = invitation.registration, event = registration.event;
    if (invitation.generation !== job.generation || !activeInvitation(invitation, registration.status, event.conferenceConfig?.enabled ?? false)) { state = "Cancelled"; errorCode = "INVITATION_INACTIVE"; }
    else {
      const credentials = invitationCredentials(invitation);
      const details: InvitationDetails = { fullName: registration.attendee?.fullName ?? registration.user?.name ?? "Invited guest", eventTitle: event.title, startDate: event.startDate, endDate: event.endDate, venue: event.venue, city: event.city, category: registration.guestCategory, qrToken: credentials.qrToken, rsvpUrl: `${origin}/invite#${credentials.rsvpToken}` };
      const walkin = registration.invitationSource === "Walk-in registration";
      const image = await qrImage(credentials.qrToken), pdf = await invitationPdf(details, image), content = walkin ? walkinEmail(details) : invitationEmail(details), logo = await emailLogoAttachment();
      const tag = walkin ? await badgePdf({ fullName: details.fullName, organization: registration.attendee?.organization ?? "", jobTitle: registration.attendee?.jobTitle ?? "", category: details.category, eventTitle: details.eventTitle, admissionId: "", registrationId: registration.id, qrToken: credentials.qrToken }) : null;
      // Recheck after rendering, immediately before handing data to SMTP.
      const current = await db.conferenceInvitation.findUnique({ where: { id: invitation.id }, include: { registration: { include: { event: { include: { conferenceConfig: true } } } } } });
      if (!current || current.generation !== job.generation || !activeInvitation(current, current.registration.status, current.registration.event.conferenceConfig?.enabled ?? false)) { state = "Cancelled"; errorCode = "INVITATION_INACTIVE"; }
      else {
        smtpStarted = true;
        const info = await smtp.sendMail({ from: { name: fromName, address: from }, to: { name: details.fullName, address: job.recipient }, messageId: `<${job.id}@${new URL(origin).hostname}>`, ...content, headers: { "X-FFDGN-Tag-Layout": BADGE_LAYOUT_VERSION }, attachments: [ ...(tag ? [{ filename: "guest-tag.pdf", content: Buffer.from(tag), contentType: "application/pdf" }] : []), logo, { filename: "entry-qr.png", content: image, contentType: "image/png", cid: "conference-qr@ffdgn" }, { filename: "entry-qr-download.png", content: image, contentType: "image/png" }, { filename: "conference-invitation.pdf", content: Buffer.from(pdf), contentType: "application/pdf" } ] });
        if (!info.accepted?.some((address: string | { address: string }) => (typeof address === "string" ? address : address.address).toLowerCase() === job.recipient.toLowerCase())) { state = "Failed"; errorCode = "SMTP_RECIPIENT_REJECTED"; }
        else { state = "Accepted"; messageId = info.messageId; }
      }
    }
  } catch (error) {
    if (!smtpStarted) { state = "Failed"; errorCode = "INVITATION_RENDER_FAILED"; }
    else { const failure = emailFailure(error, job.attempts); state = failure.state; errorCode = failure.code; }
  } finally { smtp.close(); }
  await db.$transaction(async tx => {
    await tx.conferenceEmailAttempt.update({ where: { jobId_attempt: { jobId: job.id, attempt: job.attempts } }, data: { state, errorCode, finishedAt: new Date() } });
    await tx.conferenceEmailJob.updateMany({ where: { id: job.id, state: "Processing", leaseOwner: owner }, data: { state, errorCode, messageId, leaseOwner: null, leaseUntil: null, ...(state === "Accepted" ? { acceptedAt: new Date() } : {}), ...(state === "Queued" ? { availableAt: new Date(Date.now() + job.attempts * 60_000) } : {}) } });
  });
  return { id: job.id, state, errorCode };
}

export { eventDates };
