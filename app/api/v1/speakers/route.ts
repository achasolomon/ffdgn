import { speakerInput } from "@/lib/speaker-input";
import { revalidatePublicSite } from "@/lib/revalidate";
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
 * POST /api/v1/speakers — catalogue a speaker. Requires `events.edit`.
 * Body: { slug, name, role, eventSlug?, keynote?, honorific?, org?, bio?, photoUrl? }.
 */
export async function POST(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Speakers require the MySQL database.", 503);
    const auth = await requirePermission("events.edit");
    let input;
    try { input = await speakerInput(await req.json().catch(() => null), true); }
    catch (error) { return fail("VALIDATION", error instanceof Error ? error.message : "Invalid speaker.", 422); }
    const { body, data } = input;
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 128) return fail("VALIDATION", "Use lowercase letters, numbers and hyphens for the URL (up to 128 characters).", 422);
    if (await db.speaker.findUnique({ where: { slug } })) return fail("CONFLICT", "A speaker with this URL already exists.", 409);
    const created = await db.speaker.create({ data: { ...data, slug } as never, select: { slug: true, name: true, role: true } });
    const { name, role } = created;
    revalidatePublicSite("speaker " + slug);
    await audit("speakers.create", `speaker:${slug}`, {
      newValue: `${name} — ${role}`, ip: clientIp(req.headers), actorOverride: auth,
    });
    return ok(created);
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
