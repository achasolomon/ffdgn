import { ok, failFrom } from "@/app/api/v1/_lib";
import { conferenceAuth, conferenceError, mutationGuard, problem, readBody } from "@/lib/conference/server";
import { prepareBadgePrint, readBadgePrint, finishBadgePrint, listBadgePrints } from "@/lib/conference/printing";

type Context = { params: Promise<{ eventId: string }> };
function privateResponse(response: Response) { response.headers.set("Cache-Control", "private, no-store"); return response; }
export async function GET(req: Request, { params }: Context) {
  try { const { eventId } = await params; const { auth } = await conferenceAuth(eventId, "gate"); const query = new URL(req.url).searchParams; return privateResponse(ok(query.has("registrationId") ? await listBadgePrints(eventId, query.get("registrationId") ?? "", auth) : await readBadgePrint(eventId, query.get("id") ?? "", auth))); }
  catch (error) { return privateResponse(failFrom(conferenceError(error))); }
}
export async function POST(req: Request, { params }: Context) {
  try {
    const { eventId } = await params; const { auth } = await conferenceAuth(eventId, "gate"); await mutationGuard(req, auth, "gate");
    const body = await readBody(req);
    if (body.action !== "prepare" && body.action !== "finish") problem(422, "VALIDATION", "Choose prepare or finish.");
    return privateResponse(ok(body.action === "prepare" ? await prepareBadgePrint(eventId, auth, body, req.headers.get("idempotency-key")) : await finishBadgePrint(eventId, auth, body)));
  } catch (error) { return privateResponse(failFrom(conferenceError(error))); }
}
export const dynamic = "force-dynamic";
