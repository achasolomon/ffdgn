import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";
import { formText } from "@/lib/cms-validation";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
type Input = { slug?: string; name?: string; type?: string; since?: number; purpose?: string; logoUrl?: string; published?: boolean; cooperation?: string[]; events?: string[] };

function parse(raw: unknown) {
  const input = (raw ?? {}) as Input;
  const slug = formText(input.slug);
  const name = formText(input.name);
  const type = formText(input.type);
  const since = input.since ?? 0;
  const purpose = formText(input.purpose);
  const logoUrl = formText(input.logoUrl);
  const cooperation = input.cooperation ?? [];
  const events = input.events ?? [];
  if (!SLUG.test(slug) || slug.length > 128) return { error: "Use a lowercase URL slug with letters, numbers, and hyphens." };
  if (!name || name.length > 192 || !type || type.length > 64 || !purpose || purpose.length > 5000) return { error: "Name, partnership type, and purpose are required." };
  if (!Number.isInteger(since) || since < 1900 || since > 2200) return { error: "Enter a valid starting year." };
  if (typeof input.published !== "boolean") return { error: "Choose whether this partnership is published." };
  if (logoUrl && (!logoUrl.startsWith("/") || logoUrl.startsWith("//") || logoUrl.length > 512)) return { error: "Logo must be a same-site media path." };
  if (!Array.isArray(cooperation) || cooperation.length > 30 || cooperation.some((area) => typeof area !== "string" || !area.trim() || area.length > 255)) return { error: "Cooperation areas must be non-empty text (maximum 30)." };
  if (!Array.isArray(events) || events.some((event) => typeof event !== "string" || !SLUG.test(event))) return { error: "Related events must be valid event slugs." };
  return { value: { slug, name, type, since, purpose, logoUrl: logoUrl || null, published: input.published, cooperation: cooperation.map((area) => area.trim()), events: [...new Set(events)] } };
}

async function validEvents(slugs: string[]) {
  return !slugs.length || (await db.forumEvent.count({ where: { slug: { in: slugs } } })) === slugs.length;
}

export async function POST(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Partnership management requires MySQL.", 503);
    const auth = await requirePermission("partnerships.manage");
    const gate = await rateLimit(`cms.partnerships:${auth.user.id}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many partnership edits. Try again shortly.", 429);
    const parsed = parse(await req.json().catch(() => null));
    if (!parsed.value) return fail("VALIDATION", parsed.error ?? "Invalid partnership.", 422);
    if (!(await validEvents(parsed.value.events))) return fail("VALIDATION", "One or more related events were not found.", 422);
    if (await db.partnership.findUnique({ where: { slug: parsed.value.slug }, select: { id: true } })) return fail("CONFLICT", "That partnership slug is already in use.", 409);
    const { cooperation, events, ...data } = parsed.value;
    const partnership = await db.partnership.create({
      data: {
        ...data,
        cooperation: { create: cooperation.map((area, position) => ({ area, position })) },
        events: { create: events.map((slug) => ({ event: { connect: { slug } } })) },
      },
      select: { slug: true, name: true, published: true },
    });
    await audit("partnerships.create", `partnership:${partnership.slug}`, { newValue: partnership.name, ip: clientIp(req.headers), actorOverride: auth });
    revalidatePublicSite(`partnership created ${partnership.slug}`);
    return ok(partnership, { revalidated: true });
  } catch (e) { return failFrom(e); }
}

export const dynamic = "force-dynamic";