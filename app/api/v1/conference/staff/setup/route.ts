import bcrypt from "bcryptjs";
import { db, ok, failFrom } from "@/app/api/v1/_lib";
import { conferenceEnabled, conferenceError, problem, readBody } from "@/lib/conference/server";
import { trustedMutationOrigin } from "@/lib/conference/input";
import { validStaffToken } from "@/lib/conference/staff-invitations";
import { hashCredential } from "@/lib/conference/credentials";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    if (!conferenceEnabled()) problem(404, "NOT_FOUND", "Staff setup is unavailable.");
    if (!trustedMutationOrigin(req.headers.get("origin"), process.env.NEXTAUTH_URL ?? "")) problem(403, "ORIGIN", "Open the invitation on this website.");
    if (!(await rateLimit(`staff.setup:${clientIp(req.headers)}`, 20, 60_000)).ok) problem(429, "RATE_LIMITED", "Please wait a minute and try again.");
    const body = await readBody(req);
    if (!validStaffToken(body.token)) problem(422, "INVITATION", "This invitation is invalid or expired. Ask your administrator for a new link.");
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 6 || Buffer.byteLength(password, "utf8") > 72) problem(422, "PASSWORD", "Choose at least 6 characters, up to 72 bytes.");
    const tokenHash = hashCredential(body.token), passwordHash = await bcrypt.hash(password, 12);
    await db.$transaction(async tx => {
      const invitation = await tx.conferenceStaffInvitation.findUnique({ where: { tokenHash }, include: { user: true } });
      if (!invitation || invitation.consumedAt || invitation.expiresAt <= new Date() || invitation.user.role !== "guest_desk" || !invitation.user.isActive) problem(410, "INVITATION", "This invitation was used or expired. Ask your administrator for a new link.");
      // Lock the account, then recheck assignment and claim the token atomically.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${invitation.userId} FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({ where: { id: invitation.userId } });
      const assignment = await tx.conferenceStaffAssignment.findUnique({ where: { eventId_userId: { eventId: invitation.eventId, userId: user.id } } });
      if (!user.isActive || user.role !== "guest_desk" || !assignment) problem(410, "INVITATION", "Your staff access is no longer available. Contact your administrator.");
      const claimed = await tx.conferenceStaffInvitation.updateMany({ where: { id: invitation.id, tokenHash, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date(), credentialEnvelope: null, state: "Cancelled", leaseOwner: null, leaseUntil: null } });
      if (!claimed.count) problem(410, "INVITATION", "This invitation was used or expired. Ask your administrator for a new link.");
      await tx.user.update({ where: { id: user.id }, data: { passwordHash, passwordChangedAt: new Date(), failedLogins: 0, lockedUntil: null } });
      await tx.auditLog.create({ data: { actorId: user.id, actorName: user.name, action: "conference.staff.password.setup", resource: `conference:${invitation.eventId}`, ip: clientIp(req.headers), newValue: "Staff password created; invitation consumed" } });
    });
    const response = ok({ ready: true }); response.headers.set("Cache-Control", "private, no-store"); return response;
  } catch (error) { const response = failFrom(conferenceError(error)); response.headers.set("Cache-Control", "private, no-store"); return response; }
}
export const dynamic = "force-dynamic";
