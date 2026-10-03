import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";
import { formText } from "@/lib/cms-validation";
import { imagePathResolves } from "@/lib/media-path";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STATUSES = ["Active", "Standing", "Ad-hoc"] as const;
type Input = { slug?: string; name?: string; mandate?: string; chair?: string; meetings?: number; status?: string; published?: boolean; members?: string[]; imageUrl?: string; imageAlt?: string };

/**
 * Shared committee image rules. A committee card image must resolve to a
 * MediaAsset or an existing file under /public, and alt text is required
 * whenever an image is set, because nothing else supplies a description.
 */
async function readImage(raw: { imageUrl?: string; imageAlt?: string }) {
  const imageUrl = typeof raw.imageUrl === "string" ? raw.imageUrl.trim().slice(0, 500) : "";
  const imageAlt = formText(raw.imageAlt).slice(0, 300);
  if (imageUrl && !(await imagePathResolves(imageUrl))) return { error: "Committee image must be a media library item or an existing file under /public." };
  if (imageUrl && !imageAlt) return { error: "Alt text is required when an image is attached to a committee." };
  return { value: { imageUrl: imageUrl || null, imageAlt: imageUrl ? imageAlt : null } };
}

async function parse(raw: unknown) {
  const input = (raw ?? {}) as Input;
  const slug = formText(input.slug);
  const name = formText(input.name);
  const mandate = formText(input.mandate);
  const chair = formText(input.chair);
  const status = formText(input.status) || "Active";
  const meetings = input.meetings ?? 0;
  const members = input.members ?? [];
  if (!SLUG.test(slug) || slug.length > 128) return { error: "Use a lowercase URL slug with letters, numbers, and hyphens." };
  if (!name || name.length > 192 || !mandate || mandate.length > 5000) return { error: "Name and mandate are required." };
  if (!SLUG.test(chair) || chair.length > 128) return { error: "Chair must be a member slug." };
  if (!(STATUSES as readonly string[]).includes(status)) return { error: "Choose Active, Standing, or Ad-hoc." };
  if (!Number.isInteger(meetings) || meetings < 0 || meetings > 10000) return { error: "Meeting count must be a non-negative whole number." };
  if (typeof input.published !== "boolean") return { error: "Choose whether this committee is published." };
  if (!Array.isArray(members) || members.some((member) => typeof member !== "string" || !SLUG.test(member))) return { error: "Committee members must be member slugs." };
  const image = await readImage(input);
  if ("error" in image) return { error: image.error };
  return { value: { slug, name, mandate, chair, meetings, status, published: input.published, members: [...new Set(members)], ...image.value } };
}

async function validMembers(slugs: string[]) {
  return !slugs.length || (await db.member.count({ where: { slug: { in: slugs } } })) === slugs.length;
}

export async function POST(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Committee management requires MySQL.", 503);
    const auth = await requirePermission("committees.manage");
    const gate = await rateLimit(`cms.committees:${auth.user.id}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many committee edits. Try again shortly.", 429);
    const parsed = await parse(await req.json().catch(() => null));
    if (!parsed.value) return fail("VALIDATION", parsed.error ?? "Invalid committee.", 422);
    if (!(await db.member.findUnique({ where: { slug: parsed.value.chair }, select: { id: true } }))) return fail("VALIDATION", "Committee chair was not found in the member directory.", 422);
    if (!(await validMembers(parsed.value.members))) return fail("VALIDATION", "One or more committee members were not found.", 422);
    if (await db.committee.findUnique({ where: { slug: parsed.value.slug }, select: { id: true } })) return fail("CONFLICT", "That committee slug is already in use.", 409);
    const { members, chair, ...data } = parsed.value;
    const committee = await db.committee.create({
      data: { ...data, chairSlug: chair, seats: { create: members.map((slug) => ({ member: { connect: { slug } } })) } },
      select: { slug: true, name: true, published: true },
    });
    await audit("committees.create", `committee:${committee.slug}`, { newValue: committee.name, ip: clientIp(req.headers), actorOverride: auth });
    revalidatePublicSite(`committee created ${committee.slug}`);
    return ok(committee, { revalidated: true });
  } catch (e) { return failFrom(e); }
}

export const dynamic = "force-dynamic";