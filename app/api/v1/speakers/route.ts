import { db, dbReady, fail, failFrom, ok } from "../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp } from "@/lib/rate-limit";

const shape = {
  id: false,
  slug: true, name: true, honorific: true, role: true, keynote: true,
  org: true, bio: true, photoUrl: true, position: true,
  event: { select: { slug: true, title: true } },
};

/**
 * GET /api/v1/speakers — public conference faculty, keynotes first.
 * Optional `?event=<slug>` filter.
 */
export async function GET(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Speakers require the MySQL database.", 503);
    const eventSlug = new URL(req.url).searchParams.get("event");
    const rows = await db.speaker.findMany({
      where: {
        visibility: "PUBLIC",
        ...(eventSlug ? { event: { slug: eventSlug } } : {}),
      },
      select: shape,
      orderBy: [{ keynote: "desc" }, { position: "asc" }],
    });
    return ok(rows, { source: "mysql", total: rows.length });
  } catch (e) {
    return failFrom(e);
  }
}

/**
 * POST /api/v1/speakers — catalogue a speaker. Requires `events.manage`.
 * Body: { slug, name, role, eventSlug?, keynote?, honorific?, org?, bio?, photoUrl? }.
 */
export async function POST(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Speakers require the MySQL database.", 503);
    const auth = await requirePermission("events.edit");
    const body = (await req.json().catch(() => null)) as {
      slug?: string; name?: string; role?: string; eventSlug?: string;
      keynote?: boolean; honorific?: string; org?: string; bio?: string; photoUrl?: string;
    } | null;
    if (!body) return fail("VALIDATION", "Request body is required.", 422);
    const slug = (body.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    const name = (body.name ?? "").trim();
    const role = (body.role ?? "").trim();
    if (!slug || !name || !role) return fail("VALIDATION", "`slug`, `name` and `role` are required.", 422);
    if (await db.speaker.findUnique({ where: { slug } })) {
      return fail("CONFLICT", "A speaker with this slug already exists.", 409);
    }
    let eventId: string | null = null;
    if (body.eventSlug) {
      const event = await db.forumEvent.findUnique({ where: { slug: body.eventSlug }, select: { id: true } });
      if (!event) return fail("VALIDATION", "Unknown eventSlug.", 422);
      eventId = event.id;
    }
    const position = await db.speaker.count({ where: { eventId } });
    const created = await db.speaker.create({
      data: {
        slug, name, role, eventId, keynote: !!body.keynote,
        honorific: body.honorific?.slice(0, 64) ?? null,
        org: body.org?.slice(0, 192) ?? null,
        bio: body.bio?.slice(0, 4000) ?? null,
        photoUrl: body.photoUrl?.slice(0, 512) ?? null,
        position,
      },
      select: { slug: true, name: true, role: true },
    });
    await audit("speakers.create", `speaker:${slug}`, {
      newValue: `${name} — ${role}`, ip: clientIp(req.headers), actorOverride: auth,
    });
    return ok(created);
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
