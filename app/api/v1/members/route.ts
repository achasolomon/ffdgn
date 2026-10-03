import { dbReady, db, ok, failFrom, paging, pageOf, toPublicMember, members } from "../_lib";
import { fail } from "../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";

/** GET /api/v1/members — public records only (visibility = PUBLIC). */
export async function GET(req: Request) {
  try {
    const { page, perPage, q } = paging(req);
    if (await dbReady()) {
      const where = {
        visibility: "PUBLIC" as const,
        ...(q ? { OR: [{ fullName: { contains: q } }, { title: { contains: q } }] } : {}),
      };
      const [total, rows] = await Promise.all([
        db.member.count({ where }),
        db.member.findMany({ where, include: { service: true }, orderBy: { fullName: "asc" }, skip: (page - 1) * perPage, take: perPage }),
      ]);
      return ok(rows.map(toPublicMember), { page, per_page: perPage, total, total_pages: Math.max(1, Math.ceil(total / perPage)), source: "mysql" });
    }
    // Preview fallback (no DATABASE_URL): seeded CMS records.
    const filtered = members.filter(
      (m) => m.visibility === "PUBLIC" && (!q || `${m.name} ${m.title}`.toLowerCase().includes(q.toLowerCase()))
    );
    return pageOf(filtered, page, perPage);
  } catch (e) {
    return failFrom(e);
  }
}

const MEMBER_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MEMBER_CATEGORIES = ["Former", "Serving", "Secretariat"] as const;
const MEMBER_STATUSES = ["Active", "Associate", "Honorary", "Pending"] as const;
const MEMBER_VISIBILITIES = ["PUBLIC", "MEMBERS_ONLY", "COMMITTEE_ONLY", "SECRETARIAT_ONLY", "PRIVATE"] as const;
const MEMBER_REGIONS = ["North-Central", "North-East", "North-West", "South-East", "South-South", "South-West"] as const;

type CreateMemberBody = {
  slug?: string; fullName?: string; title?: string; state?: string; region?: string;
  category?: string; status?: string; visibility?: string; leadershipRole?: string;
  photoUrl?: string; bio?: string; service?: { office?: string; state?: string; startYear?: number; endYear?: number }[];
};

export async function POST(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Membership management requires MySQL.", 503);
    const auth = await requirePermission("members.create");
    const gate = await rateLimit(`members.create:${auth.user.id}`, 40, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many member records created. Try again shortly.", 429);
    const body = (await req.json().catch(() => null)) as CreateMemberBody | null;
    if (!body) return fail("VALIDATION", "Request body is required.", 422);
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const state = typeof body.state === "string" ? body.state.trim() : "";
    const region = typeof body.region === "string" ? body.region : "";
    const category = typeof body.category === "string" ? body.category : "";
    const status = typeof body.status === "string" ? body.status : "Pending";
    const visibility = typeof body.visibility === "string" ? body.visibility : "SECRETARIAT_ONLY";
    const leadershipRole = typeof body.leadershipRole === "string" ? body.leadershipRole.trim() : "";
    const photoUrl = typeof body.photoUrl === "string" ? body.photoUrl.trim() : "";
    const bio = typeof body.bio === "string" ? body.bio.trim() : "";
    const service = body.service ?? [];
    if (!MEMBER_SLUG.test(slug) || slug.length > 128) return fail("VALIDATION", "Slug must use lowercase letters, numbers, and hyphens.", 422);
    if (!fullName || fullName.length > 192 || !title || title.length > 128 || !state || state.length > 64) return fail("VALIDATION", "Full name, office title, and state are required.", 422);
    if (!(MEMBER_REGIONS as readonly string[]).includes(region)) return fail("VALIDATION", "Choose a valid Nigerian region.", 422);
    if (!(MEMBER_CATEGORIES as readonly string[]).includes(category)) return fail("VALIDATION", "Choose a valid member category.", 422);
    if (!(MEMBER_STATUSES as readonly string[]).includes(status) || !(MEMBER_VISIBILITIES as readonly string[]).includes(visibility)) return fail("VALIDATION", "Choose a valid membership status and directory visibility.", 422);
    if (leadershipRole.length > 128 || bio.length > 10000 || (photoUrl && (!photoUrl.startsWith("/") || photoUrl.startsWith("//") || photoUrl.length > 512))) return fail("VALIDATION", "Leadership role, biography, or photo path is invalid.", 422);
    if (!Array.isArray(service) || service.length > 30 || service.some((item) => !item || typeof item.office !== "string" || !item.office.trim() || item.office.length > 128 || typeof item.state !== "string" || !item.state.trim() || item.state.length > 64 || !Number.isInteger(item.startYear) || !Number.isInteger(item.endYear) || item.startYear! < 1900 || item.endYear! > 2200 || item.endYear! < item.startYear!)) return fail("VALIDATION", "Service history needs an office, state, and valid years (maximum 30 records).", 422);
    if (await db.member.findUnique({ where: { slug }, select: { id: true } })) return fail("CONFLICT", "That member slug is already in use.", 409);

    const member = await db.member.create({
      data: {
        slug, fullName, title, state, region, category: category as never, status: status as never,
        visibility: visibility as never, leadershipRole: leadershipRole || null,
        photoUrl: photoUrl || null, bio: bio || null,
        service: { create: service.map((record) => ({ office: record.office!.trim(), state: record.state!.trim(), startYear: record.startYear!, endYear: record.endYear! })) },
      },
      select: { slug: true, fullName: true, status: true, visibility: true },
    });
    await audit("members.create", `member:${slug}`, { newValue: `${fullName} · ${category}`, ip: clientIp(req.headers), actorOverride: auth });
    revalidatePublicSite(`member created ${slug}`);
    return ok(member, { revalidated: true });
  } catch (e) { return failFrom(e); }
}

export const dynamic = "force-dynamic";
