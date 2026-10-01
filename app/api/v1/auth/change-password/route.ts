import bcrypt from "bcryptjs";
import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requireAuth, audit } from "@/lib/server-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * POST /api/v1/auth/change-password — authenticated users only.
 * Requires current password; re-hashes with bcrypt cost 12; audited.
 */
export async function POST(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Password change requires the MySQL database.", 503);
    const gate = rateLimit(`pw:${clientIp(req.headers)}`, 10, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many attempts. Try again later.", 429);

    const auth = await requireAuth();
    const body = (await req.json().catch(() => null)) as { currentPassword?: string; newPassword?: string } | null;
    if (!body?.currentPassword || !body?.newPassword) return fail("VALIDATION", "Current and new passwords are required.", 422);
    if (body.newPassword.length < 12) return fail("VALIDATION", "New password must be at least 12 characters.", 422);

    const user = await db.user.findUnique({ where: { id: auth.user.id } });
    if (!user) return fail("NOT_FOUND", "Account not found.", 404);
    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) return fail("FORBIDDEN", "Current password is incorrect.", 403);

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(body.newPassword, 12), failedLogins: 0, lockedUntil: null },
    });
    await audit("auth.password.change", `user:${user.email}`, { ip: clientIp(req.headers) });
    return ok({ changed: true });
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
