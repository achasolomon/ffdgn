import { db, dbReady, fail, failFrom, ok } from "../../../../_lib";
import { requireAuth, audit } from "@/lib/server-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { conferenceEnabled, mutationGuard, problem } from "@/lib/conference/server";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Event registration requires MySQL.", 503);
    const auth = await requireAuth();
    const gate = await rateLimit(`event.registration:${auth.user.id}`, 30, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many registration changes. Try again shortly.", 429);
    const { slug } = await params;
    const event = await db.forumEvent.findFirst({ where: { slug, published: true } });
    if (!event) return fail("NOT_FOUND", "Event not found.", 404);
    if (event.status === "Past") return fail("VALIDATION", "Registration is closed for this event.", 422);
    if (conferenceEnabled()) {
        await mutationGuard(req, auth);
        // Event-row lock also serializes configuration creation/update.
        const registration = await db.$transaction(async tx => {
          await tx.$queryRaw`SELECT id FROM events WHERE id = ${event.id} FOR UPDATE`;
          await tx.$queryRaw`SELECT event_id FROM conference_config WHERE event_id = ${event.id} FOR UPDATE`;
          const current = await tx.conferenceConfig.findUnique({ where: { eventId: event.id } });
          if (current?.enabled && !current.publicRegistrationEnabled) problem(403, "INVITATION_ONLY", "This event uses an invited guest list. Contact the Secretariat for changes.");
          const existing = await tx.eventRegistration.findUnique({ where: { userId_eventId: { userId: auth.user.id, eventId: event.id } } });
          if (current?.enabled && current.capacity !== null && existing?.status !== "Registered" && await tx.eventRegistration.count({ where: { eventId: event.id, status: "Registered" } }) >= current.capacity) problem(409, "CAPACITY", "Event capacity has been reached.");
          return tx.eventRegistration.upsert({ where: { userId_eventId: { userId: auth.user.id, eventId: event.id } }, update: { status: "Registered" }, create: { userId: auth.user.id, eventId: event.id }, select: { id: true, status: true } });
        });
        await db.notification.create({ data: { userId: auth.user.id, title: "Event registration confirmed", body: `You are registered for ${event.title}.`, href: "/portal/events" } });
        await audit("events.registration.create", `event:${slug}`, { newValue: registration.status, ip: clientIp(req.headers), actorOverride: auth });
        return ok({ slug, status: registration.status });
    }
    const registration = await db.eventRegistration.upsert({
      where: { userId_eventId: { userId: auth.user.id, eventId: event.id } },
      update: { status: "Registered" },
      create: { userId: auth.user.id, eventId: event.id, status: "Registered" },
      select: { id: true, status: true },
    });
    await db.notification.create({ data: { userId: auth.user.id, title: "Event registration confirmed", body: `You are registered for ${event.title}.`, href: `/portal/events` } });
    await audit("events.registration.create", `event:${slug}`, { newValue: registration.status, ip: clientIp(req.headers), actorOverride: auth });
    return ok({ slug, status: registration.status });
  } catch (error) { return failFrom(error); }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Event registration requires MySQL.", 503);
    const auth = await requireAuth();
    if (conferenceEnabled()) await mutationGuard(req, auth);
    const gate = await rateLimit(`event.registration:${auth.user.id}`, 30, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many registration changes. Try again shortly.", 429);
    const { slug } = await params;
    const registration = await db.eventRegistration.findFirst({ where: { userId: auth.user.id, event: { slug } }, include: { event: { select: { title: true } } } });
    if (!registration || registration.status === "Cancelled") return fail("NOT_FOUND", "Active registration not found.", 404);
    await db.eventRegistration.update({ where: { id: registration.id }, data: { status: "Cancelled" } });
    await audit("events.registration.cancel", `event:${slug}`, { previousValue: "Registered", newValue: "Cancelled", ip: clientIp(req.headers), actorOverride: auth });
    return ok({ slug, status: "Cancelled" });
  } catch (error) { return failFrom(error); }
}

export const dynamic = "force-dynamic";
