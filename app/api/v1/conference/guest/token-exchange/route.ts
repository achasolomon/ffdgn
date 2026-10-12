import { ok, failFrom } from "@/app/api/v1/_lib";
import { conferenceError, problem, readBody } from "@/lib/conference/server";
import { trustedMutationOrigin } from "@/lib/conference/input";
import { exchangeGuestToken, guestGate, GUEST_HEADERS } from "@/lib/conference/guest-session";

export async function POST(req: Request) {
  try {
    await guestGate(req, true);
    if (!trustedMutationOrigin(req.headers.get("origin"), process.env.NEXTAUTH_URL ?? "")) problem(403, "ORIGIN", "Open the invitation on the configured application site.");
    const body = await readBody(req); await exchangeGuestToken(body.token);
    const response = ok({ ready: true }); for (const [name, value] of Object.entries(GUEST_HEADERS)) response.headers.set(name, value); return response;
  } catch (error) { const response = failFrom(conferenceError(error)); for (const [name, value] of Object.entries(GUEST_HEADERS)) response.headers.set(name, value); return response; }
}
export const dynamic = "force-dynamic";
