import { db, dbReady, fail, failFrom, ok } from "../../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";
import { formText } from "@/lib/cms-validation";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
type Input = { name?: string; type?: string; since?: number; purpose?: string; logoUrl?: string; published?: boolean; cooperation?: string[]; events?: string[] };

function parse(raw: unknown) {
  const input = (raw ?? {}) as Input;
  const name = formText(input.name);
  const type = formText(input.type);
  const since = input.since ?? 0;
  const purpose = formText(input.purpose);
  const logoUrl = formText(input.logoUrl);
  const cooperation = input.cooperation ?? [];
  const events = input.events ?? [];
  if (!name || name.length > 192 || !type || type.length > 64 || !purpose || purpose.length > 5000) return { error: "Name, partnership type, and purpose are required." };
  if (!Number.isInteger(since) || since < 1900 || since > 2200) return { error: "Enter a valid starting year." };
  if (typeof input.published !== "boolean") return { error: "Choose whether this partnership is published." };
  if (logoUrl && (!logoUrl.startsWith("/") || logoUrl.startsWith("//") || logoUrl.length > 512)) return { error: "Logo must be a same-site media path." };
  if (!Array.isArray(cooperation) || cooperation.length > 30 || cooperation.some((area) => typeof area !== "string" || !area.trim() || area.length > 255)) return { error: "Cooperation areas must be non-empty text (maximum 30)." };
  if (!Array.isArray(events) || events.some((event) => typeof event !== "string" || !SLUG.test(event))) return { error: "Related events must be valid event slugs." };
  return { value: { name, type, since, purpose, logoUrl: logoUrl || null, published: input.published, cooperation: cooperation.map((area) => area.trim()), events: [...new Set(events)] } };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Partnership management requires MySQL.", 503);
    const auth = await requirePermission("partnerships.manage");
    const gate = await rateLimit(`cms.partnerships:${auth.user.id}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many partnership edits. Try again shortly.", 429);
    const { slug } = await params;
    const existing = await db.partnership.findUnique({ where: { slug } });
    if (!existing) return fail("NOT_FOUND", "Partnership not found.", 404);
    const parsed = parse(await req.json().catch(() => null));
    if (!parsed.value) return fail("VALIDATION", parsed.error ?? "Invalid partnership.", 422);
    if (parsed.value.events.length && (await db.forumEvent.count({ where: { slug: { in: parsed.value.events } } })) !== parsed.value.events.length) return fail("VALIDATION", "One or more related events were not found.", 422);
    const { cooperation, events, ...data } = parsed.value;
    const updated = await db.$transaction(async (tx) => {
      const partnership = await tx.partnership.update({ where: { id: existing.id }, data, select: { slug: true, name: true, published: true } });
      await tx.partnershipCooperation.deleteMany({ where: { partnershipId: existing.id } });
      if (cooperation.length) await tx.partnershipCooperation.createMany({ data: cooperation.map((area, position) => ({ partnershipId: existing.id, area, position })) });
      await tx.partnershipEvent.deleteMany({ where: { partnershipId: existing.id } });
      if (events.length) {
        const eventRows = await tx.forumEvent.findMany({ where: { slug: { in: events } }, select: { id: true } });
        await tx.partnershipEvent.createMany({ data: eventRows.map((event) => ({ partnershipId: existing.id, eventId: event.id })) });
      }
      return partnership;
    });
    await audit("partnerships.update", `partnership:${slug}`, { previousValue: existing.name, newValue: updated.name, ip: clientIp(req.headers), actorOverride: auth });
    revalidatePublicSite(`partnership updated ${slug}`);
    return ok(updated, { revalidated: true });
  } catch (e) { return failFrom(e); }
}

export const dynamic = "force-dynamic";