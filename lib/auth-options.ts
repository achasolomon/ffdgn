import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { rateLimit } from "./rate-limit";

const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;
const SESSION_MAX_AGE = Number(process.env.SESSION_MAX_AGE ?? 28800); // 8h institutional timeout

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
        const email = credentials?.email?.toLowerCase().trim() ?? "";
        const password = credentials?.password ?? "";
        if (!email || !password) throw new Error("Email and password are required.");

        // Brute-force protection: 10 attempts / 10 min per email+IP.
        const ip = (req?.headers?.["x-forwarded-for"] as string | undefined)?.split(",")[0] ?? "unknown";
        const gate = rateLimit(`login:${email}:${ip}`, 10, 10 * 60 * 1000);
        if (!gate.ok) throw new Error("Too many attempts. Try again in a few minutes.");

        const user = await db.user.findUnique({ where: { email } });
        // Constant-time-ish: always hash-compare to avoid user enumeration timing.
        if (!user || !user.isActive) {
          await bcrypt.compare(password, "$2b$12$invalidinvalidinvalidinvalidinvalid12");
          throw new Error("Invalid email or password.");
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("Account temporarily locked after repeated failures. Try again later.");
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          const failed = user.failedLogins + 1;
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLogins: failed,
              lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MS) : null,
            },
          });
          throw new Error("Invalid email or password.");
        }

        await db.user.update({
          where: { id: user.id },
          data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
        });
        await db.auditLog.create({
          data: { actorId: user.id, actorName: user.name, action: "auth.login", resource: `user:${user.email}`, ip },
        });

        return { id: user.id, name: user.name, email: user.email, role: user.role } as never;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as unknown as { id: string }).id;
        token.role = (user as unknown as { role: string }).role;
      } else if (token.id) {
        // Refresh role/active flag from DB on each hourly update — revocation-safe.
        const fresh = await db.user.findUnique({ where: { id: token.id as string }, select: { role: true, isActive: true } });
        if (!fresh || !fresh.isActive) return { ...token, role: "revoked" };
        token.role = fresh.role;
      }
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
