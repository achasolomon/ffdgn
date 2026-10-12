import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { decryptSecret, hashCredential, invitationOrigin } from "./credentials";
import { validStaffToken } from "./staff-invitations";
import { emailFailure, transport } from "./email-worker";
import { staffInvitationEmail } from "./email-template";
import { emailLogoAttachment } from "./brand";

export async function processStaffEmailJob() {
  const { smtp, from, fromName } = transport(), origin = invitationOrigin(), owner = randomUUID();
  const job = await db.$transaction(async tx => {
    await tx.conferenceStaffInvitation.updateMany({ where: { state: "Processing", leaseUntil: { lt: new Date() } }, data: { state: "Uncertain", errorCode: "WORKER_LEASE_EXPIRED", leaseOwner: null, leaseUntil: null } });
    const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM conference_staff_invitations WHERE state = 'Queued' AND available_at <= NOW(3) ORDER BY available_at, id LIMIT 1 FOR UPDATE SKIP LOCKED`;
    if (!rows.length) return null;
    return tx.conferenceStaffInvitation.update({ where: { id: rows[0].id }, data: { state: "Processing", attempts: { increment: 1 }, leaseOwner: owner, leaseUntil: new Date(Date.now() + 120_000), errorCode: null }, include: { user: true } });
  });
  if (!job) { smtp.close(); return null; }
  let state: "Queued" | "Accepted" | "Failed" | "Uncertain" | "Cancelled" = "Failed", errorCode: string | null = null, started = false;
  try {
    const assigned = await db.conferenceStaffAssignment.findUnique({ where: { eventId_userId: { eventId: job.eventId, userId: job.userId } } });
    if (job.consumedAt || job.expiresAt <= new Date() || !job.credentialEnvelope || !job.user.isActive || job.user.role !== "guest_desk" || !assigned) { state = "Cancelled"; errorCode = "STAFF_INVITATION_INACTIVE"; }
    else {
      const credentials = decryptSecret(job.credentialEnvelope, `staff:${job.id}`) as { token?: unknown };
      if (!validStaffToken(credentials.token) || hashCredential(credentials.token) !== job.tokenHash) throw new Error("Invalid staff credential.");
      const url = `${origin}/staff/setup#${credentials.token}`;
      const current = await db.conferenceStaffInvitation.findUnique({ where: { id: job.id }, include: { user: true } });
      const stillAssigned = await db.conferenceStaffAssignment.findUnique({ where: { eventId_userId: { eventId: job.eventId, userId: job.userId } } });
      if (!current || current.tokenHash !== job.tokenHash || current.consumedAt || current.expiresAt <= new Date() || !current.user.isActive || current.user.role !== "guest_desk" || !stillAssigned || current.leaseOwner !== owner) { state = "Cancelled"; errorCode = "STAFF_INVITATION_INACTIVE"; }
      else {
        const event = await db.forumEvent.findUniqueOrThrow({ where: { id: job.eventId }, select: { title: true } });
        const duty = { Manager: "Event guest-desk manager", RegistrationOfficer: "Guest registration, tags and gate check-in", ReportingOfficer: "Attendance viewing", GateOfficer: "Gate check-in and tags" }[stillAssigned.role];
        const content = staffInvitationEmail({ name: job.user.name, email: job.user.email, eventTitle: event.title, duty, setupUrl: url, expiresAt: job.expiresAt });
        const logo = await emailLogoAttachment();
        started = true;
        const result = await smtp.sendMail({ from: { name: fromName, address: from }, to: { name: job.user.name, address: job.user.email }, messageId: `<staff-${job.id}-${job.tokenHash.slice(0, 12)}@${new URL(origin).hostname}>`, ...content, attachments: [logo] });
        state = result.accepted?.some((address: string | { address: string }) => (typeof address === "string" ? address : address.address).toLowerCase() === job.user.email.toLowerCase()) ? "Accepted" : "Failed";
        if (state === "Failed") errorCode = "SMTP_RECIPIENT_REJECTED";
      }
    }
  } catch (error) { if (!started) errorCode = "STAFF_INVITATION_RENDER_FAILED"; else { const failure = emailFailure(error, job.attempts); state = failure.state; errorCode = failure.code; } }
  finally { smtp.close(); }
  await db.conferenceStaffInvitation.updateMany({ where: { id: job.id, tokenHash: job.tokenHash, state: "Processing", leaseOwner: owner }, data: { state, errorCode, leaseOwner: null, leaseUntil: null, ...(state === "Queued" ? { availableAt: new Date(Date.now() + job.attempts * 60_000) } : {}) } });
  return { id: job.id, state, errorCode };
}
