import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { PORTAL_ROLES, STAFF_ROLES } from "./lib/auth";

const DEV = process.env.NODE_ENV !== "production";

/**
 * Builds the policy for one request.
 *
 * `script-src` carries only this request's nonce plus `'strict-dynamic'`. With
 * `strict-dynamic`, scripts bearing the nonce are trusted and may load further
 * scripts, while the host allowlist no longer matters for script loading — that
 * is what makes dropping `'unsafe-inline'` safe even though Next.js emits the
 * RSC flight payload and bootstrap scripts as inline `<script>` elements.
 */
function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    [
      "script-src 'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // The dev overlay and React Fast Refresh compile strings at runtime.
      ...(DEV ? ["'unsafe-eval'"] : []),
    ].join(" "),
    // Video embeds are limited to the approved players.
    "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
    "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com",
    "media-src 'self' blob:",
    "font-src 'self' data:",
    // Tailwind emits inline styles; style nonces do not apply the same way here.
    "style-src 'self' 'unsafe-inline'",
    ...(DEV ? ["connect-src 'self' ws: wss:"] : ["connect-src 'self'"]),
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    ...(DEV ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function routeAuthorized(path: string, role: string | undefined) {
  if (path.startsWith("/admin") || path.startsWith("/site-preview")) return (STAFF_ROLES as string[]).includes(role ?? "");
  if (path.startsWith("/portal")) return (PORTAL_ROLES as string[]).includes(role ?? "");
  return true;
}

/**
 * Proxy: authentication on private surfaces, plus per-request CSP nonces.
 *
 * - /portal/** : any authenticated institutional role
 * - /admin/**  : staff roles only (auditor included, read-only enforced per-action)
 *
 * Auth is verified server-side again in pages/API via lib/server-auth.ts, so this
 * layer is a redirect guard, not the authorization boundary.
 */
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const privateSurface = pathname.startsWith("/portal") || pathname.startsWith("/admin") || pathname.startsWith("/site-preview");

  // Read the token before minting the nonce so an unauthenticated request to a
  // private surface redirects without doing CSP work that will be discarded.
  if (privateSurface) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const role = token?.role as string | undefined;
    if (!token || !role || role === "revoked" || !routeAuthorized(pathname, role)) {
      const login = new URL("/login", req.nextUrl.origin);
      login.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(login);
    }
  }

  const nonce = crypto.randomUUID().replace(/-/g, "");

  // Next.js reads `x-nonce` off the incoming request and stamps it on the
  // framework scripts it injects, so the header must travel forward.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", buildCsp(nonce));
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  if (privateSurface) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  }

  return res;
}

export const config = {
  /**
   * Everything except static assets and image optimizer output. Excluding
   * `/_next/image` avoids double-optimizing and keeps the optimizer off the
   * proxy path entirely.
   */
  matcher: [
    {
      source: "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|assets|images|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|mp4|webm|pdf|txt|xml|webmanifest)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
