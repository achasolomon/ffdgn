import { speakerInput } from "@/lib/speaker-input";
import { revalidatePublicSite } from "@/lib/revalidate";
import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp } from "@/lib/rate-limit";

/**
 * PATCH /api/v1/speakers/:slug — update bio, photo, role, order, visibility.
 * Requires `events.edit`. Audited.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Speakers require the MySQL database.", 503);
    const auth = await requirePermission("events.edit");
    const { slug } = await params;
    const s = await db.speaker.findUnique({ where: { slug } });
    if (!s) return fail("NOT_FOUND", "Speaker not found.", 404);
    let data;
    try { ({ data } = await speakerInput(await req.json().catch(() => null), false)); }
    catch (error) { return fail("VALIDATION", error instanceof Error ? error.message : "Invalid speaker.", 422); }
    if (!Object.keys(data).length) return fail("VALIDATION", "Nothing to update.", 422);
    const updated = await db.speaker.update({
      where: { id: s.id }, data: data as never,
      select: { slug: true, name: true, role: true, position: true, visibility: true },
    });
    await audit("speakers.update", `speaker:${s.slug}`, {
      previousValue: `${s.name} — ${s.role}`, newValue: `${updated.name} — ${updated.role}`,
      ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite("speaker " + slug);
    return ok(updated);
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
