import { cookies } from "next/headers";
import { db, dbReady } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { credentialKey, decryptSecret, encryptSecret, hashCredential, invitationCredentials, invitationOrigin, validRsvpToken } from "./credentials";
import { activeInvitation } from "./invitations";
import { conferenceEnabled, problem } from "./server";

export const GUEST_COOKIE = "conference-guest";
export const GUEST_COOKIE_PATH = "/api/v1/conference/guest";
type GuestSession = { invitationId: string; generation: number; expires: number };
export const GUEST_HEADERS = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };

export async function guestGate(req: Request, exchange = false) {
  if (!conferenceEnabled()) problem(404, "NOT_FOUND", "Invitations are unavailable.");
  const limit = await rateLimit(`conference.guest:${exchange ? "exchange" : "read"}:${clientIp(req.headers)}`, exchange ? 30 : 120, 60_000);
  if (!limit.ok) problem(429, "RATE_LIMITED", "Please wait before trying again.");
  try { credentialKey(); } catch { problem(503, "UNAVAILABLE", "Invitation service is unavailable."); }
  if (!(await dbReady())) problem(503, "UNAVAILABLE", "Invitation service is unavailable.");
}

export async function exchangeGuestToken(token: unknown) {
  if (!validRsvpToken(token)) problem(410, "INVITATION_UNAVAILABLE", "This invitation is invalid, expired or revoked.");
  const invitation = await db.conferenceInvitation.findUnique({ where: { rsvpHash: hashCredential(token as string) }, include: { registration: { include: { event: { include: { conferenceConfig: true } } } } } });
  if (!invitation || !activeInvitation(invitation, invitation.registration.status, invitation.registration.event.conferenceConfig?.enabled ?? false)) problem(410, "INVITATION_UNAVAILABLE", "This invitation is invalid, expired or revoked.");
  const expires = Math.min(Date.now() + 3600_000, invitation.expiresAt.getTime());
  const envelope = encryptSecret({ invitationId: invitation.id, generation: invitation.generation, expires }, "conference-guest-session");
  (await cookies()).set(GUEST_COOKIE, envelope, { httpOnly: true, secure: invitationOrigin().startsWith("https:"), sameSite: "lax", path: GUEST_COOKIE_PATH, maxAge: Math.max(1, Math.floor((expires - Date.now()) / 1000)) });
}

export async function guestInvitation(tx = db) {
  const envelope = (await cookies()).get(GUEST_COOKIE)?.value;
  let session: GuestSession;
  try {
    if (!envelope) throw new Error("Missing guest session.");
    session = decryptSecret(envelope, "conference-guest-session") as GuestSession;
    if (!session || typeof session.invitationId !== "string" || !Number.isInteger(session.generation) || !Number.isFinite(session.expires) || session.expires <= Date.now()) throw new Error("Expired session.");
  } catch { problem(401, "GUEST_SESSION", "Open the RSVP link in your invitation email to continue."); }
  const invitation = await tx.conferenceInvitation.findUnique({ where: { id: session!.invitationId }, include: { registration: { include: { attendee: true, user: { select: { name: true } }, event: { include: { conferenceConfig: true } } } } } });
  if (!invitation || invitation.generation !== session!.generation || !activeInvitation(invitation, invitation.registration.status, invitation.registration.event.conferenceConfig?.enabled ?? false)) problem(410, "INVITATION_UNAVAILABLE", "This invitation is invalid, expired or revoked.");
  return invitation;
}

export function guestDetails(invitation: Awaited<ReturnType<typeof guestInvitation>>) {
  const registration = invitation.registration, event = registration.event, credentials = invitationCredentials(invitation);
  return { fullName: registration.attendee?.fullName ?? registration.user?.name ?? "Invited guest", eventTitle: event.title, startDate: event.startDate, endDate: event.endDate, venue: event.venue, city: event.city, category: registration.guestCategory, qrToken: credentials.qrToken, rsvpUrl: `${invitationOrigin()}/invite#${credentials.rsvpToken}` };
}
