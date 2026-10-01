import type { MetadataRoute } from "next";
import { listDocs, listEvents, listNews, listMembers } from "@/lib/repo";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ffdgn.org.ng";

type Entry = { path: string; lastModified?: Date; changeFrequency?: "daily" | "weekly" | "monthly" | "yearly"; priority: number };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: Entry[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/about", priority: 0.7 },
    { path: "/about/history", priority: 0.6 },
    { path: "/about/governance", priority: 0.6 },
    { path: "/leadership", priority: 0.7 },
    { path: "/members", priority: 0.7 },
    { path: "/events", priority: 0.7 },
    { path: "/knowledge", priority: 0.8 },
    { path: "/news", priority: 0.8 },
    { path: "/committees", priority: 0.6 },
    { path: "/partnerships", priority: 0.6 },
    { path: "/media/photos", priority: 0.5 },
    { path: "/media/videos", priority: 0.5 },
    { path: "/contact", priority: 0.6 },
    { path: "/accessibility", priority: 0.2, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
    { path: "/search", priority: 0.1, changeFrequency: "monthly" },
  ];

  const dynamicRoutes: Entry[] = [];

  // Content that is only discoverable through the database. Restricted and
  // unpublished records are deliberately excluded.
  const [news, docs, events, members] = await Promise.all([
    listNews().catch(() => []),
    listDocs().catch(() => []),
    listEvents().catch(() => []),
    listMembers().catch(() => []),
  ]);

  for (const n of news) {
    if (!n.official) continue; // reproduced media coverage is not canonical
    dynamicRoutes.push({
      path: `/news/${n.slug}`,
      lastModified: new Date(n.date),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  for (const d of docs) {
    if (d.status !== "Published" || d.visibility !== "PUBLIC") continue;
    dynamicRoutes.push({
      path: `/knowledge/${d.slug}`,
      lastModified: new Date(d.published),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  for (const e of events) {
    dynamicRoutes.push({
      path: `/events/${e.slug}`,
      lastModified: new Date(e.startDate),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  for (const m of members) {
    dynamicRoutes.push({
      path: `/members/${m.slug}`,
      changeFrequency: "yearly",
      priority: 0.4,
    });
  }

  return [...staticRoutes, ...dynamicRoutes].map((e) => ({
    url: `${BASE}${e.path}`,
    lastModified: e.lastModified ?? now,
    changeFrequency: e.changeFrequency ?? ("weekly" as const),
    priority: e.priority,
  }));
}