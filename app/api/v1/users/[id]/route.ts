import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp } from "@/lib/rate-limit";
import { ASSIGNABLE } from "../_roles";

/**
 * PATCH /api/v1/users/:id — deactivate, reactivate or re-role an account.
 *
 * Deactivation is the revocation mechanism: the jwt callback refuses any token
 * belonging to an inactive account, so setting `isActive: false` ends every live
 * session immediately. Re-roling also takes effect on the next token read.
 * Also clears a lockout when reactivating, so a legitimate user is not left
 * locked out by an attacker who burned their failed-login counter.
 *
 * Guard rails: an administrator cannot deactivate or demote themselves, and the
 * last remaining super_admin cannot be removed from the role.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await dbReady())) return fail("UNAVAILABLE", "User management requires the MySQL database.", 503);
    const auth = await requirePermission("users.manage");

    const body = (await req.json().catch(() => null)) as { isActive?: boolean; role?: string } | null;
    if (!body || (body.isActive === undefined && body.role === undefined)) {
      return fail("VALIDATION", "Provide `isActive` and/or `role`.", 422);
    }

    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    if (!target) return fail("NOT_FOUND", "Account not found.", 404);

    if (body.role !== undefined) {
      const allowed =
        body.role === "super_admin" ? (["super_admin"] as const) : ASSIGNABLE;
      if (!(allowed as readonly string[]).includes(body.role)) {
        return fail("VALIDATION", `Unknown role. Assignable: ${[...ASSIGNABLE].join(", ")}.`, 422);
      }
      // Only an existing super_admin may mint or remove a super_admin.
      if (body.role === "super_admin" || target.role === "super_admin") {
        const me = await db.user.findUnique({ where: { id: auth.user.id }, select: { role: true } });
        if (me?.role !== "super_admin") {
          return fail("FORBIDDEN", "Only a Super Administrator can change Super Administrator accounts.", 403);
        }
      }
    }

    if (body.isActive === false && target.id === auth.user.id) {
      return fail("VALIDATION", "You cannot deactivate your own account. Ask another Super Administrator.", 422);
    }
    if (body.role !== undefined && target.role === "super_admin" && body.role !== "super_admin") {
      const remaining = await db.user.count({ where: { role: "super_admin", isActive: true } });
      if (remaining <= 1) {
        return fail("VALIDATION", "Cannot demote the last active Super Administrator.", 422);
      }
    }
    if (body.isActive === false && target.role === "super_admin") {
      const remaining = await db.user.count({ where: { role: "super_admin", isActive: true } });
      if (remaining <= 1) {
        return fail("VALIDATION", "Cannot deactivate the last active Super Administrator.", 422);
      }
    }

    const changes: string[] = [];
    if (body.isActive !== undefined && body.isActive !== target.isActive) {
      changes.push(`active ${target.isActive}→${body.isActive}`);
    }
    if (body.role !== undefined && body.role !== target.role) {
      changes.push(`role ${target.role}→${body.role}`);
    }

    const updated = await db.user.update({
      where: { id: target.id },
      data: {
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.role !== undefined ? { role: body.role as never } : {}),
        // Reactivating clears a lockout and the failed-login counter.
        ...(body.isActive === true ? { failedLogins: 0, lockedUntil: null } : {}),
      },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    for (const change of changes) {
      const [field, values] = change.split(" ");
      await audit(`users.${field}.change`, `user:${target.email}`, {
        previousValue: values?.split("→")[0],
        newValue: values?.split("→")[1],
        ip: clientIp(req.headers),
        actorOverride: auth,
      });
    }

    return ok({
      ...updated,
      changes,
      note: changes.some((c) => c.startsWith("active false"))
        ? "Sessions for this account are now invalid."
        : undefined,
    });
  } catch (e) {
    return failFrom(e);
  }
}
