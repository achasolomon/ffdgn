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

/**
 * PATCH /api/v1/members/:slug — Secretariat membership management.
 * Body may contain `status` and/or `visibility`. Requires `members.update`.
 * Every change is audit-logged with previous → new values (§30).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    if (!(await dbReady())) return fail("UNAVAILABLE", "Membership management requires the MySQL database.", 503);
    // Authorize before reading the record so slug existence stays opaque to
    // unauthenticated callers.
    const auth = await requirePermission("members.update");

    const body = (await req.json().catch(() => null)) as { status?: string; visibility?: string } | null;
    if (!body || (body.status === undefined && body.visibility === undefined)) {
      return fail("VALIDATION", "Provide `status` and/or `visibility`.", 422);
    }
    if (body.status !== undefined && !(STATUSES as readonly string[]).includes(body.status)) {
      return fail("VALIDATION", `Unknown status. Allowed: ${STATUSES.join(", ")}.`, 422);
    }
    if (body.visibility !== undefined && !(VISIBILITIES as readonly string[]).includes(body.visibility)) {
      return fail("VALIDATION", `Unknown visibility. Allowed: ${VISIBILITIES.join(", ")}.`, 422);
    }

    const m = await db.member.findUnique({ where: { slug } });
    if (!m) return fail("NOT_FOUND", "Member not found.", 404);

    const updated = await db.member.update({
      where: { id: m.id },
      data: {
        ...(body.status ? { status: body.status as never } : {}),
        ...(body.visibility ? { visibility: body.visibility as never } : {}),
      },
      select: { slug: true, fullName: true, status: true, visibility: true },
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
    // Directory, homepage counts and member pages all read this record.
    if (changes.length > 0) revalidatePublicSite(`member ${m.slug}: ${changes.join(", ")}`);
    return ok({ ...updated, changes });
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
