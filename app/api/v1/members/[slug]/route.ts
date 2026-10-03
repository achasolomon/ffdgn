import { getMember } from "@/lib/data";
import { db, dbReady, fail, failFrom, ok, toPublicMember } from "../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (await dbReady()) {
    const m = await db.member.findUnique({ where: { slug }, include: { service: true } });
    if (!m || m.visibility !== "PUBLIC") return fail("NOT_FOUND", "Member not found.", 404);
    return ok({ ...toPublicMember(m), source: "mysql" });
  }
  const m = getMember(slug);
  if (!m || m.visibility !== "PUBLIC") return fail("NOT_FOUND", "Member not found.", 404);
  return ok(m);
}

const STATUSES = ["Active", "Associate", "Honorary", "Pending"] as const;
const VISIBILITIES = ["PUBLIC", "MEMBERS_ONLY", "COMMITTEE_ONLY", "SECRETARIAT_ONLY", "PRIVATE"] as const;
const CATEGORIES = ["Former", "Serving", "Secretariat"] as const;
const REGIONS = ["North-Central", "North-East", "North-West", "South-East", "South-South", "South-West"] as const;
type ServiceInput = { office?: string; state?: string; startYear?: number; endYear?: number };
type MemberInput = {
  status?: string; visibility?: string; fullName?: string; title?: string; state?: string;
  region?: string; category?: string; leadershipRole?: string; photoUrl?: string;
  bio?: string; service?: ServiceInput[];
};

/**
 * PATCH /api/v1/members/:slug — Secretariat membership management.
 * Edits profile details, service history, status, and directory visibility.
 * Requires `members.update`.
 * Every change is audit-logged with previous → new values (§30).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    if (!(await dbReady())) return fail("UNAVAILABLE", "Membership management requires the MySQL database.", 503);
    // Authorize before reading the record so slug existence stays opaque to
    // unauthenticated callers.
    const auth = await requirePermission("members.update");

    const body = (await req.json().catch(() => null)) as MemberInput | null;
    if (!body || !Object.keys(body).some((key) => ["status", "visibility", "fullName", "title", "state", "region", "category", "leadershipRole", "photoUrl", "bio", "service"].includes(key))) {
      return fail("VALIDATION", "Provide at least one editable member field.", 422);
    }
    if (body.status !== undefined && !(STATUSES as readonly string[]).includes(body.status)) {
      return fail("VALIDATION", `Unknown status. Allowed: ${STATUSES.join(", ")}.`, 422);
    }
    if (body.visibility !== undefined && !(VISIBILITIES as readonly string[]).includes(body.visibility)) {
      return fail("VALIDATION", `Unknown visibility. Allowed: ${VISIBILITIES.join(", ")}.`, 422);
    }
    if (body.category !== undefined && !(CATEGORIES as readonly string[]).includes(body.category)) return fail("VALIDATION", "Unknown member category.", 422);
    if (body.region !== undefined && !(REGIONS as readonly string[]).includes(body.region)) return fail("VALIDATION", "Choose a valid Nigerian region.", 422);
    if (body.fullName !== undefined && (typeof body.fullName !== "string" || !body.fullName.trim() || body.fullName.trim().length > 192)) return fail("VALIDATION", "Full name is required (max 192 characters).", 422);
    if (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 128)) return fail("VALIDATION", "Office title is required (max 128 characters).", 422);
    if (body.state !== undefined && (typeof body.state !== "string" || !body.state.trim() || body.state.trim().length > 64)) return fail("VALIDATION", "State is required (max 64 characters).", 422);
    if (body.leadershipRole !== undefined && (typeof body.leadershipRole !== "string" || body.leadershipRole.length > 128)) return fail("VALIDATION", "Leadership role must be at most 128 characters.", 422);
    if (body.photoUrl !== undefined && (typeof body.photoUrl !== "string" || (body.photoUrl && (!body.photoUrl.startsWith("/") || body.photoUrl.startsWith("//") || body.photoUrl.length > 512)))) return fail("VALIDATION", "Photo must be a same-site media path.", 422);
    if (body.bio !== undefined && (typeof body.bio !== "string" || body.bio.length > 10000)) return fail("VALIDATION", "Biography must be at most 10,000 characters.", 422);
    if (body.service !== undefined && (!Array.isArray(body.service) || body.service.length > 30 || body.service.some((item) => !item || typeof item.office !== "string" || !item.office.trim() || item.office.length > 128 || typeof item.state !== "string" || !item.state.trim() || item.state.length > 64 || !Number.isInteger(item.startYear) || !Number.isInteger(item.endYear) || item.startYear! < 1900 || item.endYear! > 2200 || item.endYear! < item.startYear!))) {
      return fail("VALIDATION", "Service history needs an office, state, and valid years (maximum 30 records).", 422);
    }

    const m = await db.member.findUnique({ where: { slug } });
    if (!m) return fail("NOT_FOUND", "Member not found.", 404);

    const profileData = {
      ...(body.fullName !== undefined ? { fullName: body.fullName.trim() } : {}),
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.state !== undefined ? { state: body.state.trim() } : {}),
      ...(body.region !== undefined ? { region: body.region } : {}),
      ...(body.category !== undefined ? { category: body.category as never } : {}),
      ...(body.leadershipRole !== undefined ? { leadershipRole: body.leadershipRole.trim() || null } : {}),
      ...(body.photoUrl !== undefined ? { photoUrl: body.photoUrl.trim() || null } : {}),
      ...(body.bio !== undefined ? { bio: body.bio.trim() || null } : {}),
      ...(body.status ? { status: body.status as never } : {}),
      ...(body.visibility ? { visibility: body.visibility as never } : {}),
    };
    const updated = await db.$transaction(async (tx) => {
      const member = await tx.member.update({ where: { id: m.id }, data: profileData, select: { slug: true, fullName: true, status: true, visibility: true } });
      if (body.service !== undefined) {
        await tx.serviceRecord.deleteMany({ where: { memberId: m.id } });
        if (body.service.length) await tx.serviceRecord.createMany({ data: body.service.map((record) => ({
          memberId: m.id, office: record.office!.trim(), state: record.state!.trim(), startYear: record.startYear!, endYear: record.endYear!,
        })) });
      }
      return member;
    });

    const changes: string[] = [];
    if (body.status && body.status !== m.status) {
      changes.push(`status ${m.status}→${body.status}`);
      await audit("members.status.change", `member:${m.slug}`, {
        previousValue: m.status, newValue: body.status, ip: clientIp(req.headers), actorOverride: auth,
      });
    }
    if (body.visibility && body.visibility !== m.visibility) {
      changes.push(`visibility ${m.visibility}→${body.visibility}`);
      await audit("members.visibility.change", `member:${m.slug}`, {
        previousValue: m.visibility, newValue: body.visibility, ip: clientIp(req.headers), actorOverride: auth,
      });
    }
    const profileFields = ["fullName", "title", "state", "region", "category", "leadershipRole", "photoUrl", "bio", "service"] as const;
    const changedProfile = profileFields.filter((field) => field in body);
    if (changedProfile.length) {
      changes.push(`profile ${changedProfile.join(", ")}`);
      await audit("members.profile.update", `member:${m.slug}`, {
        previousValue: m.fullName, newValue: updated.fullName, ip: clientIp(req.headers), actorOverride: auth,
      });
    }
    // Directory, homepage counts and member pages all read this record.
    if (changes.length > 0) revalidatePublicSite(`member ${m.slug}: ${changes.join(", ")}`);
    return ok({ ...updated, changes });
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
