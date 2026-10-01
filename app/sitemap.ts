import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://ffdgn.org.ng";
  const static_ = ["", "/about", "/about/history", "/about/governance", "/leadership", "/members", "/events", "/knowledge", "/news", "/committees", "/partnerships", "/contact"];
  return static_.map((p) => ({ url: `${base}${p || "/"}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 }));
}
