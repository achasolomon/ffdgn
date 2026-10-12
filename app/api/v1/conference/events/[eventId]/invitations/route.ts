import { db, ok, failFrom } from "@/app/api/v1/_lib";
import { conferenceAuth, conferenceError, mutationGuard, readBody } from "@/lib/conference/server";
import { dispatchInput, dispatchInvitations } from "@/lib/conference/invitations";
import { credentialKey } from "@/lib/conference/credentials";
import { emailReadiness } from "@/lib/conference/email-worker";

type Context = { params: Promise<{ eventId: string }> };
export async function GET(_req: Request, { params }: Context) {
  try {
    const { eventId } = await params; await conferenceAuth(eventId);
    const jobs = await db.conferenceEmailJob.findMany({ where: { invitation: { registration: { eventId } } }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, generation: true, state: true, attempts: true, errorCode: true, createdAt: true, acceptedAt: true, invitation: { select: { registrationId: true } } } });
    let credentialsReady = false; try { credentialKey(); credentialsReady = true; } catch { /* no secret values exposed */ }
    return ok({ jobs, smtpConfigured: emailReadiness(), credentialsReady });
  } catch (error) { return failFrom(conferenceError(error)); }
}
export async function POST(req: Request, { params }: Context) {
  try {
    const { eventId } = await params; const { auth } = await conferenceAuth(eventId, "guests"); await mutationGuard(req, auth);
    const input = dispatchInput(await readBody(req), req.headers.get("idempotency-key"));
    return ok(await dispatchInvitations(eventId, auth, input, tx => conferenceAuth(eventId, "guests", tx)));
  } catch (error) { return failFrom(conferenceError(error)); }
}
export const dynamic = "force-dynamic";
