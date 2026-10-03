import type { MetadataRoute } from "next";
import { listDocs, listEvents, listNews, listMembers } from "@/lib/repo";
import { STATIC_ROUTES, type StaticRoute } from "@/lib/routes";
import { listPublishedWebsitePages } from "@/lib/website-repo";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ffdgn.org.ng";

type Entry = { path: string; lastModified?: Date; changeFrequency?: "daily" | "weekly" | "monthly" | "yearly"; priority: number };

/**
 * Per-route weight and cadence.
 *
 * Keyed off lib/routes.ts so the sitemap cannot drift from the set of real
 * pages: adding a route without an entry here fails typecheck, and deleting a
 * page leaves a key that no longer matches STATIC_ROUTES.
 */
const STATIC_META: Record<StaticRoute, Omit<Entry, "path">> = {
  "/": { priority: 1, changeFrequency: "weekly" },
  "/about": { priority: 0.7 },
  "/about/history": { priority: 0.6 },
  "/about/governance": { priority: 0.6 },
  "/leadership": { priority: 0.7 },
  "/members": { priority: 0.7 },
  "/events": { priority: 0.7 },
  "/knowledge": { priority: 0.8 },
  "/news": { priority: 0.8 },
  "/committees": { priority: 0.6 },
  "/peer-review": { priority: 0.6 },
  "/mentorship": { priority: 0.6 },
  "/partnerships": { priority: 0.6 },
  "/programs": { priority: 0.7 },
  "/polish-nigeria": { priority: 0.7 },
  "/renewed-hope": { priority: 0.7 },
  "/media/photos": { priority: 0.5 },
  "/media/videos": { priority: 0.5 },
  "/contact": { priority: 0.6 },
  "/accessibility": { priority: 0.2, changeFrequency: "yearly" },
  "/privacy": { priority: 0.2, changeFrequency: "yearly" },
  "/search": { priority: 0.1, changeFrequency: "monthly" },
  // The human-readable index of this very sitemap: useful for crawlers that do
  // not consume sitemap.xml, harmless otherwise.
  "/sitemap": { priority: 0.1, changeFrequency: "monthly" },
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: Entry[] = STATIC_ROUTES.filter(path => path !== "/partnerships").map((path) => ({ path, ...STATIC_META[path] }));
  const authored = await listPublishedWebsitePages();
  for (const draft of authored) {
    if (!staticRoutes.some(entry => entry.path === draft.page.path)) staticRoutes.push({path:draft.page.path,priority:0.6,lastModified:new Date(draft.savedAt)});
  }

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

  return [...new Map([...staticRoutes, ...dynamicRoutes].map(entry=>[entry.path,entry])).values()].map((e) => ({
    url: `${BASE}${e.path}`,
    lastModified: e.lastModified ?? now,
    changeFrequency: e.changeFrequency ?? ("weekly" as const),
    priority: e.priority,
  }));
}
