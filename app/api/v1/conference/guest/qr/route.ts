import { failFrom } from "@/app/api/v1/_lib";
import { conferenceError } from "@/lib/conference/server";
import { guestDetails, guestGate, guestInvitation, GUEST_HEADERS } from "@/lib/conference/guest-session";
import { qrImage } from "@/lib/conference/render-invitation";

export async function GET(req: Request) {
  try {
    await guestGate(req); const details = guestDetails(await guestInvitation());
    const image = await qrImage(details.qrToken);
    return new Response(new Uint8Array(image), { headers: { ...GUEST_HEADERS, "Content-Type": "image/png", "Content-Disposition": new URL(req.url).searchParams.get("download") === "1" ? 'attachment; filename="entry-qr.png"' : "inline" } });
  } catch (error) { const response = failFrom(conferenceError(error)); for (const [name, value] of Object.entries(GUEST_HEADERS)) response.headers.set(name, value); return response; }
}
export const dynamic = "force-dynamic";
