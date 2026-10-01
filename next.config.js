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
   * Static response headers applied to every route.
   *
   * Content-Security-Policy is NOT set here. It must carry a per-request nonce
   * so that `'unsafe-inline'` is unnecessary in `script-src`; Next.js also
   * propagates the `x-nonce` request header onto the framework's own bootstrap
   * scripts. See `proxy.ts`, which mints the nonce and sets the header.
   */
  async headers() {
    const headers = [
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

  typedRoutes: false,
};

module.exports = nextConfig;