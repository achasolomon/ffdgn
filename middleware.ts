import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { PORTAL_ROLES, STAFF_ROLES, type Role } from "./lib/auth";

/**
 * Authentication + private-surface headers.
 * - /portal/** : any authenticated institutional role
 * - /admin/**  : staff roles only (auditor included, read-only enforced per-action)
 * Auth itself is verified server-side again in pages/API via lib/server-auth.ts.
 */
export default withAuth(
  function middleware(req) {
    const res = NextResponse.next();
    const path = req.nextUrl.pathname;
    if (path.startsWith("/portal") || path.startsWith("/admin")) {
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return res;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        const role = token?.role as string | undefined;
        if (!token || !role || role === "revoked") return false;
        if (path.startsWith("/admin")) return (STAFF_ROLES as string[]).includes(role);
        if (path.startsWith("/portal")) return (PORTAL_ROLES as string[]).includes(role);
        return true;
      },
    },
    pages: { signIn: "/login" },
  }
);

export const config = { matcher: ["/portal/:path*", "/admin/:path*"] };
