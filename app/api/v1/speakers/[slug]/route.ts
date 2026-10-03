import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp } from "@/lib/rate-limit";

/**
 * PATCH /api/v1/speakers/:slug — update bio, photo, role, order, visibility.
 * Requires `events.manage`. Audited.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Speakers require the MySQL database.", 503);
    const auth = await requirePermission("events.edit");
    const { slug } = await params;
    const body = (await req.json().catch(() => null)) as {
      name?: string; role?: string; honorific?: string; org?: string;
      bio?: string; photoUrl?: string; position?: number; visibility?: string;
    } | null;
    if (!body) return fail("VALIDATION", "Request body is required.", 422);

    const s = await db.speaker.findUnique({ where: { slug } });
    if (!s) return fail("NOT_FOUND", "Speaker not found.", 404);

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name.trim().slice(0, 192) || s.name;
    if (body.role !== undefined) data.role = body.role.trim().slice(0, 128) || s.role;
    if (body.honorific !== undefined) data.honorific = body.honorific.trim().slice(0, 64) || null;
    if (body.org !== undefined) data.org = body.org.trim().slice(0, 192) || null;
    if (body.bio !== undefined) data.bio = body.bio.trim().slice(0, 4000) || null;
    if (body.photoUrl !== undefined) data.photoUrl = body.photoUrl.trim().slice(0, 512) || null;
    if (typeof body.position === "number") data.position = body.position;
    if (body.visibility !== undefined) {
      const allowed = ["PUBLIC", "MEMBERS_ONLY", "COMMITTEE_ONLY", "SECRETARIAT_ONLY", "PRIVATE"];
      if (!allowed.includes(body.visibility)) return fail("VALIDATION", "Unknown visibility.", 422);
      data.visibility = body.visibility;
    }
    if (Object.keys(data).length === 0) return fail("VALIDATION", "Nothing to update.", 422);

    const updated = await db.speaker.update({
      where: { id: s.id }, data: data as never,
      select: { slug: true, name: true, role: true, position: true, visibility: true },
    });
    await audit("speakers.update", `speaker:${s.slug}`, {
      previousValue: `${s.name} — ${s.role}`, newValue: `${updated.name} — ${updated.role}`,
      ip: clientIp(req.headers), actorOverride: auth,
    });
    return ok(updated);
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
