import bcrypt from "bcryptjs";
import { db, dbReady, fail, failFrom, ok } from "../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { ASSIGNABLE } from "./_roles";

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
    const gate = await rateLimit(`users:create:${auth.user.id}`, 20, 60_000);
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
    if (password.length < 6) return fail("VALIDATION", "Password must be at least 6 characters.", 422);
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
