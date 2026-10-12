import bcrypt from "bcryptjs";
import { createHmac, randomBytes } from "node:crypto";
import { newStaffInvitation } from "@/lib/conference/staff-invitations";
import { emailReadiness } from "@/lib/conference/email-worker";
import { ConferenceStaffRole, Prisma } from "@prisma/client";
import { db, ok, failFrom } from "@/app/api/v1/_lib";
import { conferenceAuth, conferenceError, mutationGuard, problem, readBody, transactionalAudit } from "@/lib/conference/server";

export async function POST(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params, { auth } = await conferenceAuth(eventId, "settings");
    await mutationGuard(req, auth);
    if (!["super_admin", "secretariat_admin"].includes(auth.user.role)) problem(403, "FORBIDDEN", "Only administrators can create guest desk accounts.");
    const body = await readBody(req), key = req.headers.get("idempotency-key");
    if (!key || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key)) problem(422, "IDEMPOTENCY", "Supply a UUID Idempotency-Key.");
    const name = typeof body.name === "string" ? body.name.trim() : "", email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "", password = typeof body.password === "string" ? body.password : "";
    if (!name || name.length > 192 || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problem(422, "VALIDATION", "Enter a staff name and valid email address.");
    const invite = body.password === undefined;
    if (!invite && (password.length < 6 || Buffer.byteLength(password, "utf8") > 72)) problem(422, "VALIDATION", "Use a password of at least 6 characters and no more than 72 bytes.");
    if (!Object.values(ConferenceStaffRole).includes(body.role as ConferenceStaffRole)) problem(422, "VALIDATION", "Choose a staff duty from the list.");
    const role = body.role as ConferenceStaffRole, secret = process.env.NEXTAUTH_SECRET;
    if (!secret) problem(503, "SETUP", "Account setup is unavailable. Contact your administrator.");
    // A keyed fingerprint includes the supplied password without persisting an
    // unkeyed password digest or ever returning/logging credentials.
    const fingerprint = createHmac("sha256", secret).update(JSON.stringify({ name, email, password, role })).digest("hex"), requestKey = `staff-create:${eventId}:${key.toLowerCase()}`;
    const passwordHash = await bcrypt.hash(invite ? randomBytes(48).toString("base64url") : password, 12);
    const setup = invite ? newStaffInvitation() : null;
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
      const current = await conferenceAuth(eventId, "settings", tx);
      if (!["super_admin", "secretariat_admin"].includes(current.auth.user.role)) problem(403, "FORBIDDEN", "Only administrators can create guest desk accounts.");
      const prior = await tx.conferenceDispatch.findUnique({ where: { requestKey } });
      if (prior) {
        if (prior.actorId !== auth.user.id || prior.fingerprint !== fingerprint) problem(409, "IDEMPOTENCY_CONFLICT", "This request was already used for different account details.");
        return prior.result;
      }
      if (await tx.user.findUnique({ where: { email }, select: { id: true } })) problem(409, "DUPLICATE", "An account already uses this email. Use Add an existing staff account below, or choose another email. Existing accounts are not changed.");
      const user = await tx.user.create({ data: { name, email, passwordHash, role: "guest_desk", passwordChangedAt: new Date() }, select: { id: true, name: true, email: true, role: true } });
      await tx.conferenceStaffAssignment.create({ data: { eventId, userId: user.id, role } });
      if (setup) await tx.conferenceStaffInvitation.create({ data: { ...setup, userId: user.id, eventId } });
      await transactionalAudit(tx, auth, eventId, "conference.staff.account.create", `user=${user.id}; access=guest_desk; duty=${role}`);
      const result = { userId: user.id, name: user.name, email: user.email, access: "guest_desk", duty: role, ...(setup ? { invitation: "Queued", emailConfigured: emailReadiness() } : {}) };
      await tx.conferenceDispatch.create({ data: { eventId, actorId: auth.user.id, requestKey, fingerprint, result } });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    const response = ok(result); response.headers.set("Cache-Control", "private, no-store"); return response;
  } catch (error) { const response = failFrom(conferenceError(error)); response.headers.set("Cache-Control", "private, no-store"); return response; }
}
export const dynamic = "force-dynamic";
