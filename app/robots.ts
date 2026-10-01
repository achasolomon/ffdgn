import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ffdgn.org.ng";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Member portal, Secretariat console and the write APIs are never
        // indexable. Login is excluded because it is an entry point to those.
        disallow: ["/portal", "/portal/", "/admin", "/admin/", "/api/", "/login"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}