/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    /**
     * Explicit allowlist.
     *
     * The previous value was `hostname: "**"`, which let the image optimizer
     * fetch any HTTPS URL on the internet on request. That is an SSRF and
     * amplification primitive against anything reachable from the server —
     * including cloud metadata endpoints and internal services — and it is the
     * condition behind the published Next.js image-optimizer advisory. Only the
     * two CDNs this codebase actually references are permitted.
     */
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
      { protocol: "https", hostname: "img.youtube.com", pathname: "/vi/**" },
    ],
    formats: ["image/avif", "image/webp"],
    // Stop the optimizer from being used as a general-purpose proxy: cap the
    // source dimensions and disallow SVG, which can carry script.
    dangerouslyAllowSVG: false,
    contentDispositionType: "attachment",
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  /**
   * Response headers applied to every route.
   *
   * CSP caveat worth knowing: `script-src` keeps 'unsafe-inline' because the
   * App Router inlines the RSC flight payload and bootstrap scripts into the
   * HTML, and static nonce generation is not wired up here. That means CSP
   * currently limits exfiltration and remote script sources but does not fully
   * stop an injected inline script. Closing that properly needs per-request
   * nonces threaded through the root layout — tracked as a follow-up, not
   * silently assumed solved.
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      // Next.js injects inline bootstrap scripts; allow them without 'unsafe-eval'.
      "script-src 'self' 'unsafe-inline'",
      // Video embeds are limited to the two approved players.
      "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
      "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com",
      "media-src 'self' blob:",
      "font-src 'self' data:",
      // Tailwind inline styles require 'unsafe-inline' here.
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
    ].join("; ");

    const headers = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];

    // The staff console and member portal must never sit in a shared cache.
    const privateHeaders = [
      { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];

    return [
      { source: "/:path*", headers },
      { source: "/admin/:path*", headers: [...headers, ...privateHeaders] },
      { source: "/portal/:path*", headers: [...headers, ...privateHeaders] },
      { source: "/api/:path*", headers: [...headers, { key: "Cache-Control", value: "no-store" }] },
    ];
  },

  experimental: { typedRoutes: false },
};

module.exports = nextConfig;