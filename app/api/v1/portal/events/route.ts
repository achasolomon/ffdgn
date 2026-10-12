import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requireAuth } from "@/lib/server-auth";
import { conferenceEnabled } from "@/lib/conference/server";

export async function GET() {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Member events require MySQL.", 503);
    const auth = await requireAuth();
    const events = await db.forumEvent.findMany({
      where: { published: true },
      orderBy: [{ startDate: "desc" }],
      take: 100,
      select: {
        id: true, slug: true, title: true, kind: true, startDate: true, endDate: true,
        venue: true, city: true, status: true, summary: true,
        registrations: { where: { userId: auth.user.id }, select: { status: true } },
        _count: { select: { registrations: { where: { status: "Registered" } } } },
      },
    });
    const configs = conferenceEnabled() ? await db.conferenceConfig.findMany({ where: { eventId: { in: events.map(event => event.id) } }, select: { event: { select: { slug: true } }, enabled: true, publicRegistrationEnabled: true } }) : [];
    const allowed = new Map(configs.map(config => [config.event.slug, !config.enabled || config.publicRegistrationEnabled]));
    return ok(events.map((event) => ({
      slug: event.slug, title: event.title, kind: event.kind,
      startDate: event.startDate.toISOString().slice(0, 10),
      endDate: event.endDate.toISOString().slice(0, 10),
      venue: event.venue, city: event.city, status: event.status, summary: event.summary,
      registration: event.registrations[0]?.status ?? null,
      registrationAllowed: allowed.get(event.slug) ?? true,
      registrations: event._count.registrations,
    })));
  } catch (error) { return failFrom(error); }
}

export const dynamic = "force-dynamic";
