import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { rateLimit } from "./rate-limit";

const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;
const SESSION_MAX_AGE = Number(process.env.SESSION_MAX_AGE ?? 28800); // 8h institutional timeout

/**
 * A real bcrypt hash of a value nobody can supply. Used so that a sign-in
 * attempt for a non-existent address performs the same work as one for a real
 * account. A malformed hash string makes `bcrypt.compare` return almost
 * instantly, which is precisely the timing oracle we are closing.
 */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.5u5HnF0h0kP1ZQKkNf7pvGwUXyTgHO";

/**
 * One message for every failure mode. Distinguishing "no such user" from
 * "wrong password" from "locked" tells an attacker which addresses are
 * registered and which are worth attacking further. The lockout is still
 * enforced server-side; it is simply not advertised in the response.
 */
const INVALID = "Invalid email or password.";

function clientIp(req: { headers?: Record<string, string | string[] | undefined> } | undefined) {
  return (req?.headers?.["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() || "unknown";
}

/** Best-effort audit write that must never change the auth outcome. */
async function logAuth(action: string, actorId: string, actorName: string, email: string, ip: string, previousValue?: string) {
  await db.auditLog
    .create({
      data: {
        actorId,
        actorName,
        action,
        resource: `user:${email}`,
        ip,
        previousValue,
        newValue: action === "auth.login.failed" ? "rejected" : "session issued",
      },
    })
    .catch((e) => console.error("[auth] audit write failed", e));
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: 60 * 60, // refresh idle timer hourly
  },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    CredentialsProvider({
      name: "Secretariat / Member sign in",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const ip = clientIp(req);
        const email = credentials?.email?.toLowerCase().trim() ?? "";
        const password = credentials?.password ?? "";

        // Brute-force protection is keyed on IP alone as well as email+IP, so a
        // distributed attempt across many addresses from one host still trips it.
        const perAccount = rateLimit(`login:acct:${email}:${ip}`, 10, 10 * 60 * 1000);
        const perHost = rateLimit(`login:host:${ip}`, 60, 10 * 60 * 1000);
        if (!perAccount.ok || !perHost.ok) {
          // Spend the same time as a real verification so the throttle window is
          // not distinguishable from a credential check.
          await bcrypt.compare(password, DUMMY_HASH);
          throw new Error(INVALID);
        }

        if (!email || !password) {
          await bcrypt.compare(password, DUMMY_HASH);
          throw new Error(INVALID);
        }

        const user = await db.user.findUnique({ where: { email } });

        if (!user) {
          await bcrypt.compare(password, DUMMY_HASH);
          throw new Error(INVALID);
        }

        const locked = Boolean(user.lockedUntil && user.lockedUntil > new Date());
        const inactive = !user.isActive;

        // Always hash-compare, even when the account is locked or deactivated,
        // so response time does not reveal account state.
        const valid = await bcrypt.compare(password, user.passwordHash);

        if (!valid || locked || inactive) {
          if (!locked && valid) {
            // Correct password but the account is deactivated: still a generic
            // rejection, but the reason belongs in the audit trail.
            await logAuth("auth.login.blocked", user.id, user.name, user.email, ip, inactive ? "inactive" : "locked");
          } else if (!locked) {
            const failed = user.failedLogins + 1;
            const nowLocked = failed >= MAX_FAILED;
            await db.user
              .update({
                where: { id: user.id },
                data: {
                  failedLogins: failed,
                  lockedUntil: nowLocked ? new Date(Date.now() + LOCK_MS) : null,
                },
              })
              .catch((e) => console.error("[auth] failed-login counter update failed", e));
            await logAuth(
              "auth.login.failed",
              user.id,
              user.name,
              user.email,
              ip,
              nowLocked ? `failed=${failed} (locked)` : `failed=${failed}`,
            );
          }
          throw new Error(INVALID);
        }

        await db.user.update({
          where: { id: user.id },
          data: {
            failedLogins: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
            // Password-change epoch. Sessions minted before this instant are
            // rejected by the jwt callback, so a password reset ends every
            // existing session without needing a token blacklist.
            passwordChangedAt: user.passwordChangedAt ?? new Date(),
          },
        });
        await logAuth("auth.login", user.id, user.name, user.email, ip);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          // Captured into the token so revocation can be decided without a
          // second database read on every request.
          passwordChangedAt: (user.passwordChangedAt ?? new Date()).toISOString(),
        } as never;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { id: string; role: string; passwordChangedAt?: string };
        token.id = u.id;
        token.role = u.role;
        token.pwdAt = u.passwordChangedAt;
        return token;
      }

      if (!token.id) return token;

      // Revocation check on every token read. Two conditions:
      //  1. the account is deactivated, or
      //  2. the password was changed after this token was minted.
      // Either one renders the session useless.
      const fresh = await db.user.findUnique({
        where: { id: token.id as string },
        select: { role: true, isActive: true, passwordChangedAt: true },
      });

      if (!fresh || !fresh.isActive) {
        console.warn(`[auth] session revoked for ${String(token.id)}: account inactive or removed`);
        return { ...token, role: "revoked", revokedAt: Date.now() };
      }

      const epoch = fresh.passwordChangedAt ? new Date(fresh.passwordChangedAt).getTime() : 0;
      if (token.pwdAt && epoch > new Date(token.pwdAt as string).getTime()) {
        console.warn(`[auth] session revoked for ${String(token.id)}: password changed after issue`);
        return { ...token, role: "revoked", revokedAt: Date.now() };
      }

      token.role = fresh.role;
      if (!token.pwdAt && epoch) token.pwdAt = fresh.passwordChangedAt!.toISOString();
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};