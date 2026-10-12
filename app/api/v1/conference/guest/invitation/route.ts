import { ok, failFrom } from "@/app/api/v1/_lib";
import { conferenceError } from "@/lib/conference/server";
import { guestGate, guestInvitation, GUEST_HEADERS } from "@/lib/conference/guest-session";

export async function GET(req: Request) {
  try {
    await guestGate(req); const invitation = await guestInvitation(); const registration = invitation.registration, event = registration.event;
    const response = ok({ fullName: registration.attendee?.fullName ?? registration.user?.name ?? "Invited guest", category: registration.guestCategory, rsvp: registration.conferenceRsvp, event: { title: event.title, startDate: event.startDate.toISOString().slice(0, 10), endDate: event.endDate.toISOString().slice(0, 10), venue: event.venue, city: event.city }, expiresAt: invitation.expiresAt });
    for (const [name, value] of Object.entries(GUEST_HEADERS)) response.headers.set(name, value); return response;
  } catch (error) { const response = failFrom(conferenceError(error)); for (const [name, value] of Object.entries(GUEST_HEADERS)) response.headers.set(name, value); return response; }
}
export const dynamic = "force-dynamic";
