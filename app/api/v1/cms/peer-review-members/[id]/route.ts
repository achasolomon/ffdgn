import { db, dbReady, fail, failFrom, ok } from "../../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";
import { validate, type MemberBody } from "../route";

/**
 * PATCH /api/v1/cms/peer-review-members/[id] — edit one member. Requires `settings.manage`. Audited.
 * DELETE /api/v1/cms/peer-review-members/[id] — remove one member. Same capability.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "CMS requires the MySQL database.", 503);
    const auth = await requirePermission("settings.manage");
    const gate = await rateLimit(`cms.peer-review:${clientIp(req.headers)}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many edits. Try again shortly.", 429);

    const { id } = await params;
    const existing = await db.peerReviewMember.findUnique({ where: { id } });
    if (!existing) return fail("NOT_FOUND", "No such member.", 404);

    const body = (await req.json().catch(() => null)) as MemberBody | null;
    if (!body) return fail("VALIDATION", "Request body is required.", 422);

    // Partial payloads are merged onto the stored row before validating, so an
    // update can send only the fields it changed while still being checked as
    // a whole member — a bad email cannot slip in behind an untouched name.
    const merged = {
      name: body.name !== undefined ? body.name : existing.name,
      zone: body.zone !== undefined ? body.zone : existing.zone,
      role: body.role !== undefined ? body.role : existing.role,
      phone: body.phone !== undefined ? body.phone : existing.phone,
      email: body.email !== undefined ? body.email : existing.email,
      position: body.position !== undefined ? body.position : existing.position,
      published: body.published !== undefined ? body.published : existing.published,
    };
    const validated = validate(merged as MemberBody);
    if (!validated.ok) return fail("VALIDATION", validated.message, 422);

    const row = await db.peerReviewMember.update({ where: { id }, data: validated.data });
    await audit("cms.peerReviewMember.update", `peer-review-member:${id}`, {
      previousValue: `${existing.position}. ${existing.name} — ${existing.role}, ${existing.zone}`,
      newValue: `${row.position}. ${row.name} — ${row.role}, ${row.zone}`,
      ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite("peer review member updated");
    return ok(row, { revalidated: true });
  } catch (e) {
    return failFrom(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "CMS requires the MySQL database.", 503);
    const auth = await requirePermission("settings.manage");
    const gate = await rateLimit(`cms.peer-review:${clientIp(req.headers)}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many edits. Try again shortly.", 429);

    const { id } = await params;
    const existing = await db.peerReviewMember.findUnique({ where: { id } });
    if (!existing) return fail("NOT_FOUND", "No such member.", 404);

    await db.peerReviewMember.delete({ where: { id } });
    await audit("cms.peerReviewMember.delete", `peer-review-member:${id}`, {
      previousValue: `${existing.position}. ${existing.name} — ${existing.role}, ${existing.zone}`,
      ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite("peer review member removed");
    return ok({ id, deleted: true }, { revalidated: true });
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
