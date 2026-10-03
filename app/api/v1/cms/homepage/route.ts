import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";
import { imagePathResolves } from "@/lib/media-path";

type Kind = "focus" | "timeline" | "leadership";
type Body = Record<string, unknown>;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INTERNAL_PATH = /^\/(?!\/)[A-Za-z0-9\-_/?.=&%#]*$/;

const text = (body: Body, key: string, max: number) => typeof body[key] === "string" ? (body[key] as string).trim().slice(0, max) : "";
const positiveInt = (value: unknown, min = 0, max = 10000) => typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

async function save(req: Request, body: Body, id?: string) {
  if (!(await dbReady())) return fail("UNAVAILABLE", "Homepage content management requires MySQL.", 503);
  const auth = await requirePermission("settings.manage");
  const gate = await rateLimit(`cms.homepage:${auth.user.id}`, 80, 10 * 60 * 1000);
  if (!gate.ok) return fail("RATE_LIMITED", "Too many homepage content edits. Try again shortly.", 429);
  const kind = body.kind as Kind;
  if (!("focus timeline leadership".split(" ") as string[]).includes(kind)) return fail("VALIDATION", "Choose focus, timeline, or leadership content.", 422);

  if (kind === "focus") {
    const slug = text(body, "slug", 64);
    const title = text(body, "title", 128);
    const content = text(body, "text", 5000);
    const href = text(body, "href", 255);
    const imageUrl = text(body, "imageUrl", 512);
    const position = body.position;
    if (!SLUG.test(slug) || !title || !content || !INTERNAL_PATH.test(href)) return fail("VALIDATION", "Focus area needs a valid slug, title, description, and internal link.", 422);
    if (imageUrl && !(INTERNAL_PATH.test(imageUrl) && (await imagePathResolves(imageUrl)))) return fail("VALIDATION", "Image must be a same-site path that resolves to a media library asset or a file under /public.", 422);
    if (!positiveInt(position)) return fail("VALIDATION", "Position must be a non-negative whole number.", 422);
    if (typeof body.published !== "boolean") return fail("VALIDATION", "Choose whether this focus area is published.", 422);
    const existing = id ? await db.focusArea.findUnique({ where: { id } }) : null;
    if (id && !existing) return fail("NOT_FOUND", "Focus area not found.", 404);
    if (!id && await db.focusArea.findUnique({ where: { slug }, select: { id: true } })) return fail("CONFLICT", "That focus-area slug is already in use.", 409);
    const data = { slug, title, text: content, href, imageUrl: imageUrl || null, position: position as number, published: body.published };
    const row = id ? await db.focusArea.update({ where: { id }, data }) : await db.focusArea.create({ data });
    await audit(id ? "homepage.focus.update" : "homepage.focus.create", `focus:${row.slug}`, { previousValue: existing?.title, newValue: row.title, ip: clientIp(req.headers), actorOverride: auth });
    revalidatePublicSite(`focus area ${row.slug}`);
    return ok(row, { revalidated: true });
  }

  if (kind === "timeline") {
    const year = body.year;
    const title = text(body, "title", 255);
    const summary = text(body, "summary", 5000);
    const imageUrl = text(body, "imageUrl", 512);
    const position = body.position;
    const links = body.links;
    if (!positiveInt(year, 1800, 2200) || !positiveInt(position) || !title || !summary) return fail("VALIDATION", "Timeline needs a valid year, title, summary, and position.", 422);
    if (imageUrl && !(INTERNAL_PATH.test(imageUrl) && (await imagePathResolves(imageUrl)))) return fail("VALIDATION", "Image must be a same-site path that resolves to a media library asset or a file under /public.", 422);
    if (typeof body.published !== "boolean") return fail("VALIDATION", "Choose whether this timeline entry is published.", 422);
    if (!Array.isArray(links) || links.length > 20 || links.some((link) => !link || typeof link.label !== "string" || !link.label.trim() || link.label.length > 128 || typeof link.href !== "string" || !INTERNAL_PATH.test(link.href))) return fail("VALIDATION", "Timeline links need a label and valid internal path (maximum 20).", 422);
    const existing = id ? await db.timelineEntry.findUnique({ where: { id } }) : null;
    if (id && !existing) return fail("NOT_FOUND", "Timeline entry not found.", 404);
    const data = {
      year: year as number, title, summary, imageUrl: imageUrl || null, position: position as number, published: body.published,
      links: { ...(id ? { deleteMany: {} } : {}), create: (links as { label: string; href: string }[]).map((link) => ({ label: link.label.trim(), href: link.href })) },
    };
    const row = id ? await db.timelineEntry.update({ where: { id }, data }) : await db.timelineEntry.create({ data });
    await audit(id ? "homepage.timeline.update" : "homepage.timeline.create", `timeline:${row.id}`, { previousValue: existing?.title, newValue: `${row.year}: ${row.title}`, ip: clientIp(req.headers), actorOverride: auth });
    revalidatePublicSite(`timeline ${row.year}`);
    return ok(row, { revalidated: true });
  }

  const role = text(body, "role", 128);
  const remit = text(body, "remit", 3000);
  const memberSlug = text(body, "memberSlug", 128);
  const tier = body.tier;
  const position = body.position;
  const imageUrl = text(body, "imageUrl", 512);
  // Tier 0 is valid and in use: the Grand Patron and National Patrons sit at 0,
  // above the National Chairman at 1. Rejecting 0 made those seats unsaveable.
  if (!role || !remit || !SLUG.test(memberSlug) || !positiveInt(tier, 0, 10) || !positiveInt(position)) return fail("VALIDATION", "Leadership seat needs a role, remit, member, tier, and position.", 422);
  if (imageUrl && !(INTERNAL_PATH.test(imageUrl) && (await imagePathResolves(imageUrl)))) return fail("VALIDATION", "Portrait must be a same-site path that resolves to a media library asset or a file under /public.", 422);
  if (typeof body.published !== "boolean") return fail("VALIDATION", "Choose whether this leadership seat is published.", 422);
  const member = await db.member.findUnique({ where: { slug: memberSlug }, select: { id: true, photoUrl: true } });
  if (!member) return fail("VALIDATION", "Leadership member was not found.", 422);
  const existing = id ? await db.leadershipSeat.findUnique({ where: { id } }) : null;
  if (id && !existing) return fail("NOT_FOUND", "Leadership seat not found.", 404);
  const data = { role, remit, memberSlug, tier: tier as number, position: position as number, published: body.published };
  const row = id ? await db.leadershipSeat.update({ where: { id }, data }) : await db.leadershipSeat.create({ data });
  // A portrait belongs to the member, not the seat: /leadership and the member
  // profile both read Member.photoUrl. Editing the seat's member therefore does
  // not carry the old portrait across, which is the correct behaviour.
  if (imageUrl !== (member.photoUrl ?? "")) {
    await db.member.update({ where: { id: member.id }, data: { photoUrl: imageUrl || null } });
    await audit("homepage.member.photo.update", `member:${memberSlug}`, { previousValue: member.photoUrl ?? "(none)", newValue: imageUrl || "(none)", ip: clientIp(req.headers), actorOverride: auth });
  }
  await audit(id ? "homepage.leadership.update" : "homepage.leadership.create", `leadership:${row.id}`, { previousValue: existing?.role, newValue: `${row.role}: ${row.memberSlug}`, ip: clientIp(req.headers), actorOverride: auth });
  revalidatePublicSite(`leadership seat ${row.id}`);
  return ok(row, { revalidated: true });
}

export async function POST(req: Request) {
  try {
    const body = ((await req.json().catch(() => null)) ?? {}) as Body;
    // save() treats a missing id as "create", so a POST that carries an id would
    // silently insert a second copy instead of editing. Insisting on PATCH keeps
    // a mistaken verb from duplicating a record.
    if (typeof body.id === "string" && body.id) return fail("VALIDATION", "Use PATCH to update an existing record.", 405);
    return await save(req, body);
  }
  catch (e) { return failFrom(e); }
}

export async function PATCH(req: Request) {
  try {
    const body = ((await req.json().catch(() => null)) ?? {}) as Body;
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return fail("VALIDATION", "Record id is required.", 422);
    return await save(req, body, id);
  } catch (e) { return failFrom(e); }
}

export const dynamic = "force-dynamic";