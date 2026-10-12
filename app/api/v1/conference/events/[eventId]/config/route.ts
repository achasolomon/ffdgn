import { db, ok, failFrom } from "@/app/api/v1/_lib";
import { checkCapacity, conferenceAuth, conferenceError, mutationGuard, problem, readBody, transactionalAudit } from "@/lib/conference/server";

type Context = { params: Promise<{ eventId: string }> };
export async function GET(_req: Request, { params }: Context) {
  try { const { eventId } = await params; const { event } = await conferenceAuth(eventId); return ok(event.conferenceConfig); }
  catch (error) { return failFrom(conferenceError(error)); }
}
export async function PATCH(req: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const { auth } = await conferenceAuth(eventId, "settings"); await mutationGuard(req, auth);
    const body = await readBody(req);
    if (typeof body.enabled !== "boolean" || !(body.capacity === null || (typeof body.capacity === "number" && Number.isInteger(body.capacity) && body.capacity > 0 && body.capacity <= 100_000))) problem(422, "VALIDATION", "Supply enabled and a capacity between 1 and 100,000, or null for unlimited.");
    if (body.requireAcceptedRsvp !== undefined && typeof body.requireAcceptedRsvp !== "boolean") problem(422, "VALIDATION", "Accepted-RSVP admission must be a boolean.");
    const enabled = body.enabled as boolean, capacity = body.capacity as number | null;
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
      await conferenceAuth(eventId, "settings", tx);
      await tx.$queryRaw`SELECT event_id FROM conference_config WHERE event_id = ${eventId} FOR UPDATE`;
      await checkCapacity(tx, eventId, capacity, 0);
      const admissionPolicy = body.requireAcceptedRsvp === undefined ? {} : { requireAcceptedRsvp: body.requireAcceptedRsvp as boolean };
      const config = await tx.conferenceConfig.upsert({ where: { eventId }, create: { eventId, enabled, capacity, ...admissionPolicy }, update: { enabled, capacity, ...admissionPolicy } });
      await transactionalAudit(tx, auth, eventId, "conference.config.update", `enabled=${enabled}; capacity=${capacity ?? "unlimited"}; requireAcceptedRsvp=${config.requireAcceptedRsvp}`);
      return config;
    });
    return ok(result);
  } catch (error) { return failFrom(conferenceError(error)); }
}
export const dynamic = "force-dynamic";
