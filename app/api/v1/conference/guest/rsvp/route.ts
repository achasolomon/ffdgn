import { db, ok, failFrom } from "@/app/api/v1/_lib";
import { conferenceError, problem, readBody } from "@/lib/conference/server";
import { trustedMutationOrigin } from "@/lib/conference/input";
import { guestGate, guestInvitation, GUEST_HEADERS } from "@/lib/conference/guest-session";
import { activeInvitation } from "@/lib/conference/invitations";

export async function POST(req: Request) {
  try {
    await guestGate(req);
    if (!trustedMutationOrigin(req.headers.get("origin"), process.env.NEXTAUTH_URL ?? "")) problem(403, "ORIGIN", "Open the RSVP page on the configured application site.");
    const body = await readBody(req); if (body.response !== "Accepted" && body.response !== "Declined") problem(422, "VALIDATION", "Choose Accepted or Declined.");
    const response = body.response as "Accepted" | "Declined", sessionInvitation = await guestInvitation();
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM event_registrations WHERE id = ${sessionInvitation.registrationId} FOR UPDATE`;
      const invitation = await tx.conferenceInvitation.findUniqueOrThrow({ where: { id: sessionInvitation.id }, include: { registration: { include: { event: { include: { conferenceConfig: true } } } } } });
      if (invitation.generation !== sessionInvitation.generation || !activeInvitation(invitation, invitation.registration.status, invitation.registration.event.conferenceConfig?.enabled ?? false)) problem(410, "INVITATION_UNAVAILABLE", "This invitation is invalid, expired or revoked.");
      const previous = invitation.registration.conferenceRsvp;
      if (previous !== response) {
        await tx.eventRegistration.update({ where: { id: invitation.registrationId }, data: { conferenceRsvp: response } });
        await tx.conferenceRsvpAction.create({ data: { registrationId: invitation.registrationId, previous, response } });
      }
      return { rsvp: response };
    });
    const resultResponse = ok(result); for (const [name, value] of Object.entries(GUEST_HEADERS)) resultResponse.headers.set(name, value); return resultResponse;
  } catch (error) { const response = failFrom(conferenceError(error)); for (const [name, value] of Object.entries(GUEST_HEADERS)) response.headers.set(name, value); return response; }
}
export const dynamic = "force-dynamic";
