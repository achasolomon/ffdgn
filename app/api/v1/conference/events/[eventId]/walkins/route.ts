import { Prisma } from "@prisma/client";
import { ok, failFrom, db } from "@/app/api/v1/_lib";
import { validateGuest } from "@/lib/conference/input";
import { hashCredential } from "@/lib/conference/credentials";
import { addGuest, checkCapacity, conferenceAuth, conferenceError, lockConfig, mutationGuard, problem, readBody, transactionalAudit } from "@/lib/conference/server";
import { tagCredential } from "@/lib/conference/tag-credentials";
import { prepareBadgePrint } from "@/lib/conference/printing";
import { emailReadiness } from "@/lib/conference/email-worker";

export async function POST(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params, { auth } = await conferenceAuth(eventId, "guests");
    await mutationGuard(req, auth);
    const key = req.headers.get("idempotency-key");
    if (!key || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key)) problem(422, "IDEMPOTENCY", "Supply a UUID Idempotency-Key.");
    const checked = validateGuest(await readBody(req), false);
    if (!checked.value || checked.errors.length) problem(422, "VALIDATION", checked.errors.join(" "));
    const guest = { ...checked.value, invitationSource: "Walk-in registration" };
    const requestKey = `walkin:${eventId}:${key.toLowerCase()}`, fingerprint = hashCredential(JSON.stringify(guest));
    const saved = await db.$transaction(async tx => {
      const config = await lockConfig(tx, eventId); await conferenceAuth(eventId, "guests", tx);
      const prior = await tx.conferenceDispatch.findUnique({ where: { requestKey } });
      if (prior) {
        if (prior.actorId !== auth.user.id || prior.fingerprint !== fingerprint) problem(409, "IDEMPOTENCY_CONFLICT", "This request key was used for another registration.");
        return prior.result as { registrationId: string; emailQueued?: boolean };
      }
      await checkCapacity(tx, eventId, config.capacity, 1);
      const record = await addGuest(tx, eventId, guest);
      const invitation = await tagCredential(tx, eventId, record.id);
      if (guest.email) await tx.conferenceEmailJob.create({ data: { invitationId: invitation.id, generation: invitation.generation, recipient: guest.email } });
      await tx.eventRegistration.update({ where: { id: record.id }, data: { conferenceRsvp: "Accepted" } });
      await tx.conferenceRsvpAction.create({ data: { registrationId: record.id, previous: "Pending", response: "Accepted" } });
      const result = { registrationId: record.id, emailQueued: !!guest.email };
      await transactionalAudit(tx, auth, eventId, "conference.walkin.register", `registration=${record.id}; attendance=not-admitted; rsvp=Accepted; emailQueued=${result.emailQueued}`);
      await tx.conferenceDispatch.create({ data: { eventId, actorId: auth.user.id, requestKey, fingerprint, result } });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    // A retry recovers the registration and the same print request if the response
    // is lost between these transactions. Email is queued atomically with registration.
    const { registrationId, emailQueued = false } = saved;
    const print = await prepareBadgePrint(eventId, auth, { registrationId }, key);
    const response = ok({ registrationId, printId: print.id, state: print.state, emailQueued, ...(emailQueued ? { emailConfigured: emailReadiness() } : {}) });
    response.headers.set("Cache-Control", "private, no-store"); return response;
  } catch (error) { const response = failFrom(conferenceError(error)); response.headers.set("Cache-Control", "private, no-store"); return response; }
}
export const dynamic = "force-dynamic";
