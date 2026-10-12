import { ok, failFrom } from "@/app/api/v1/_lib";
import { conferenceAuth, conferenceError, mutationGuard, readBody, problem } from "@/lib/conference/server";
import { admitGuest, gateInput, lookupGate, verifyGate } from "@/lib/conference/gate";

type Context = { params: Promise<{ eventId: string }> };
function privateResponse(response: Response) { response.headers.set("Cache-Control", "private, no-store"); response.headers.set("Referrer-Policy", "no-referrer"); return response; }
export async function GET(req: Request, { params }: Context) {
  try {
    const { eventId } = await params; await conferenceAuth(eventId, "gate");
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
    return privateResponse(ok(await lookupGate(eventId, q)));
  } catch (error) { return privateResponse(failFrom(conferenceError(error))); }
}
export async function POST(req: Request, { params }: Context) {
  try {
    const { eventId } = await params; const { auth } = await conferenceAuth(eventId, "gate"); await mutationGuard(req, auth, "gate");
    const body = await readBody(req);
    if (body.action !== "verify" && body.action !== "admit") problem(422, "VALIDATION", "Choose verify or admit.");
    const input = gateInput(body, body.action === "admit");
    return privateResponse(ok(body.action === "verify" ? await verifyGate(eventId, input) : await admitGuest(eventId, auth, input)));
  } catch (error) { return privateResponse(failFrom(conferenceError(error))); }
}
export const dynamic = "force-dynamic";
