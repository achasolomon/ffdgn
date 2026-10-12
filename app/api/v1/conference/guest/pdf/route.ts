import { failFrom } from "@/app/api/v1/_lib";
import { conferenceError } from "@/lib/conference/server";
import { guestDetails, guestGate, guestInvitation, GUEST_HEADERS } from "@/lib/conference/guest-session";
import { invitationPdf } from "@/lib/conference/render-invitation";

export async function GET(req: Request) {
  try {
    await guestGate(req); const pdf = await invitationPdf(guestDetails(await guestInvitation()));
    return new Response(new Uint8Array(pdf), { headers: { ...GUEST_HEADERS, "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="conference-invitation.pdf"' } });
  } catch (error) { const response = failFrom(conferenceError(error)); for (const [name, value] of Object.entries(GUEST_HEADERS)) response.headers.set(name, value); return response; }
}
export const dynamic = "force-dynamic";
