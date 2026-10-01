import bcrypt from "bcryptjs";
import { db, dbReady, fail, failFrom, ok } from "../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** Roles this endpoint may assign. `super_admin` is intentionally excluded. */
const ASSIGNABLE = ["member", "associate", "auditor", "content_editor", "events_manager", "knowledge_manager", "committee_manager", "communications_officer", "membership_admin", "secretariat_admin"] as const;

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
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "User management requires the MySQL database.", 503);
    const auth = await requirePermission("users.manage");

    const body = (await req.json().catch(() => null)) as { isActive?: boolean; role?: string } | null;
    if (!body || (body.isActive === undefined && body.role === undefined)) {
      return fail("VALIDATION", "Provide `isActive` and/or `role`.", 422);
    }

    const target = await db.user.findUnique({
      where: { id: params.id },
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

/**
 * POST /api/v1/users — create an institutional account.
 * Requires `users.manage` (super_admin / secretariat_admin path).
 * Passwords are bcrypt-hashed (cost 12); plaintext never stored or logged.
 */
export async function POST(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "User management requires the MySQL database.", 503);

    const auth = await requirePermission("users.manage");
    // Abuse ceiling is keyed on the authenticated actor, not the client IP —
    // otherwise one hostile network could throttle the whole Secretariat, and
    // an IP key behind a shared proxy would throttle everyone at once.
    const gate = rateLimit(`users:create:${auth.user.id}`, 20, 60_000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many account creations. Try again shortly.", 429);

    const body = (await req.json().catch(() => null)) as {
      email?: string; name?: string; password?: string; role?: string;
    } | null;
    const email = body?.email?.toLowerCase().trim() ?? "";
    const name = body?.name?.trim() ?? "";
    const password = body?.password ?? "";
    const role = body?.role ?? "member";

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("VALIDATION", "A valid email is required.", 422);
    if (!name) return fail("VALIDATION", "A display name is required.", 422);
    if (password.length < 12) return fail("VALIDATION", "Password must be at least 12 characters.", 422);
    if (!(ASSIGNABLE as readonly string[]).includes(role as never) && role !== "super_admin") {
      return fail("VALIDATION", "Unknown role.", 422);
    }
    if (role === "super_admin") {
      const me = await db.user.findUnique({ where: { id: auth.user.id }, select: { role: true } });
      if (me?.role !== "super_admin") return fail("FORBIDDEN", "Only a Super Administrator can create another.", 403);
    }

    const exists = await db.user.findUnique({ where: { email } });
    if (exists) return fail("CONFLICT", "An account with this email already exists.", 409);

    const user = await db.user.create({
      data: { email, name, role: role as never, passwordHash: await bcrypt.hash(password, 12) },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    await audit("users.create", `user:${email}`, { newValue: role, ip: clientIp(req.headers) });
    return ok(user, null);
  } catch (e) {
    return failFrom(e);
  }
}

/**
 * GET /api/v1/users — roster (no password hashes ever leave the server).
 * Requires `users.manage`.
 */
export async function GET() {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "User management requires the MySQL database.", 503);
    await requirePermission("users.manage");
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    return ok(users, { source: "mysql" });
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
