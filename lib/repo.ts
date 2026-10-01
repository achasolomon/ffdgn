import { db, dbReady } from "./db";
import type { Committee, ForumEvent, KnowledgeDoc, Member, NewsItem, Partnership } from "./types";
import * as seed from "./data";

/**
 * DB-first institutional repository — MySQL is the single source of truth.
 * The static baseline (lib/data.ts) is used ONLY when no database is
 * configured (preview builds). No public surface imports static content
 * directly once a database is present.
 */

const iso = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const pretty = (s: string) => s.replace(/_/g, " ");

// ——— Members ———
export async function listMembers(): Promise<Member[]> {
  if (await dbReady()) {
    const rows = await db.member.findMany({
      include: {
        service: true,
        committeeSeats: { include: { committee: true } },
        engagedEvents: { include: { event: true } },
        authoredDocs: { include: { doc: true } },
      },
      orderBy: { fullName: "asc" },
    });
    return rows.map((m) => ({
      slug: m.slug, name: m.fullName, title: m.title, state: m.state, region: m.region as Member["region"],
      category: m.category as "Former" | "Serving" | "Secretariat", status: m.status as Member["status"],
      service: m.service.map((s) => ({ office: s.office, state: s.state, startYear: s.startYear, endYear: s.endYear })),
      committees: m.committeeSeats.map((s) => s.committee.slug),
      leadershipRole: m.leadershipRole ?? undefined,
      photo: m.photoUrl ?? undefined,
      bio: m.bio ?? "", visibility: m.visibility as Member["visibility"],
      publications: m.authoredDocs.map((p) => p.doc.slug),
      events: m.engagedEvents.map((e) => e.event.slug),
    }));
  }
  return seed.members;
}

export async function getMemberRepo(slug: string): Promise<Member | null> {
  const all = await listMembers();
  return all.find((m) => m.slug === slug) ?? null;
}

export async function memberName(slug: string): Promise<string> {
  const m = await getMemberRepo(slug);
  return m?.name ?? slug;
}

// ——— Events ———
export async function listEvents(): Promise<ForumEvent[]> {
  if (await dbReady()) {
    const rows = await db.forumEvent.findMany({
      include: {
        programme: { orderBy: { position: "asc" } },
        documents: true,
        speakers: { include: { member: true }, orderBy: { position: "asc" } },
      },
      orderBy: { startDate: "desc" },
    });
    return rows.map((e) => ({
      slug: e.slug, title: e.title, theme: e.theme, kind: e.kind as ForumEvent["kind"],
      startDate: iso(e.startDate), endDate: iso(e.endDate),
      venue: e.venue, city: e.city, status: e.status as ForumEvent["status"], summary: e.summary,
      programme: e.programme.map((p) => ({ time: p.slotTime, session: p.session, speaker: p.speaker ?? undefined })),
      speakers: e.speakers.map((s) => s.member.slug),
      documents: e.documents.map((d) => d.slug), gallery: [],
      communique: e.documents.find((d) => d.type === "Communiqué")?.slug,
      coverUrl: e.coverUrl ?? undefined,
      guests: e.guestList ? e.guestList.split("\n").map((g) => g.trim()).filter(Boolean) : [],
    }));
  }
  return seed.events;
}

export async function getEventRepo(slug: string): Promise<ForumEvent | null> {
  const all = await listEvents();
  return all.find((e) => e.slug === slug) ?? null;
}

// ——— Knowledge ———
export async function listDocs(): Promise<KnowledgeDoc[]> {
  if (await dbReady()) {
    const rows = await db.knowledgeDoc.findMany({
      include: { event: { select: { slug: true } } },
      orderBy: [{ year: "desc" }, { title: "asc" }],
    });
    return rows.map((d) => ({
      slug: d.slug, title: d.title, type: pretty(d.type) as KnowledgeDoc["type"],
      status: pretty(d.status) as KnowledgeDoc["status"],
      published: d.publishedOn ? iso(d.publishedOn) : "", author: d.author, topic: d.topic, year: d.year,
      committee: d.committee ?? undefined, event: d.event?.slug,
      pages: d.pages, size: d.sizeLabel, summary: d.summary,
      visibility: d.visibility as KnowledgeDoc["visibility"], downloads: d.downloads,
    }));
  }
  return seed.documents;
}

export async function getDocRepo(slug: string): Promise<KnowledgeDoc | null> {
  const all = await listDocs();
  return all.find((d) => d.slug === slug) ?? null;
}

// ——— News ———
export async function listNews(): Promise<NewsItem[]> {
  if (await dbReady()) {
    const rows = await db.newsArticle.findMany({
      include: { event: { select: { slug: true } }, linkedDocs: { include: { doc: { select: { slug: true } } } } },
      orderBy: { date: "desc" },
    });
    return rows.map((n) => ({
      slug: n.slug, title: n.title, category: n.category as NewsItem["category"],
      date: iso(n.date), location: n.location, excerpt: n.excerpt,
      body: n.body.split("\n\n"), image: n.imageUrl ?? undefined,
      relatedEvent: n.event?.slug, relatedDocs: n.linkedDocs.map((l) => l.doc.slug), official: n.official,
    }));
  }
  return seed.news;
}

export async function getNewsRepo(slug: string): Promise<NewsItem | null> {
  const all = await listNews();
  return all.find((n) => n.slug === slug) ?? null;
}

// ——— Committees & partnerships ———
export async function listCommittees(): Promise<Committee[]> {
  if (await dbReady()) {
    const rows = await db.committee.findMany({
      include: { seats: { include: { member: true } } },
      orderBy: { name: "asc" },
    });
    const docs = await listDocs();
    return rows.map((c) => ({
      slug: c.slug, name: c.name, mandate: c.mandate, chair: c.chairSlug,
      members: c.seats.map((s) => s.member.slug), meetings: c.meetings,
      documents: docs.filter((d) => d.committee === c.slug).map((d) => d.slug),
      status: c.status as Committee["status"],
    }));
  }
  return seed.committees;
}

export async function listPartnerships(): Promise<Partnership[]> {
  if (await dbReady()) {
    const rows = await db.partnership.findMany({
      include: {
        cooperation: { orderBy: { position: "asc" } },
        events: { include: { event: true } },
      },
      orderBy: { name: "asc" },
    });
    return rows.map((p) => ({
      slug: p.slug, name: p.name, type: p.type, since: p.since, purpose: p.purpose,
      cooperation: p.cooperation.map((c) => c.area), events: p.events.map((e) => e.event.slug),
      logo: p.logoUrl ?? undefined,
    }));
  }
  return seed.partnerships;
}

// ——— CMS-managed site content ———
export async function getSettings(): Promise<Record<string, string>> {
  if (await dbReady()) {
    const rows = await db.siteSetting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }
  return {
    "hero.eyebrow": "A national forum",
    "hero.title": "Experience in Service.\nKnowledge for the Future.",
    "hero.lede": "A national forum bringing together former Deputy Governors to share experience, strengthen institutional knowledge, support constructive dialogue and contribute to Nigeria's development.",
    "hero.cta_primary": "Explore the Forum",
    "hero.cta_secondary": "Discover Our Work",
    "site.established": "2008",
    "site.seat": "Abuja, Nigeria",
    "site.character": "Non-partisan",
  };
}

export async function listMetrics(): Promise<{ value: string; label: string; href: string }[]> {
  if (await dbReady()) {
    const rows = await db.siteMetric.findMany({ orderBy: { position: "asc" } });
    return rows.map((m) => ({ value: m.value, label: m.label, href: m.href }));
  }
  return seed.metrics;
}

export async function listFocusAreas(): Promise<{ slug: string; title: string; text: string; href: string; image?: string }[]> {
  if (await dbReady()) {
    return (await db.focusArea.findMany({ orderBy: { position: "asc" } })).map((f) => ({
      slug: f.slug, title: f.title, text: f.text, href: f.href, image: f.imageUrl ?? undefined,
    }));
  }
  return seed.roles.map((r, i) => ({ ...r, href: ["/knowledge", "/knowledge", "/committees", "/committees", "/about", "/partnerships"][i] ?? "/about", image: undefined }));
}

export async function listTimeline(): Promise<{ year: number; title: string; summary: string; image?: string; links: { label: string; href: string }[] }[]> {
  if (await dbReady()) {
    const rows = await db.timelineEntry.findMany({ include: { links: true }, orderBy: { position: "asc" } });
    return rows.map((t) => ({ year: t.year, title: t.title, summary: t.summary, image: t.imageUrl ?? undefined, links: t.links.map((l) => ({ label: l.label, href: l.href })) }));
  }
  return seed.timeline.map((t) => ({ ...t, image: undefined }));
}

export interface LeadershipEntry {
  role: string; tier: number; remit: string;
  member: { slug: string; name: string; title: string; state: string; photo?: string } | null;
}
export async function listLeadership(): Promise<LeadershipEntry[]> {
  if (await dbReady()) {
    const seats = await db.leadershipSeat.findMany({ orderBy: { position: "asc" } });
    const members = await listMembers();
    return seats.map((s) => {
      const m = members.find((x) => x.slug === s.memberSlug);
      return {
        role: s.role, tier: s.tier, remit: s.remit,
        member: m ? { slug: m.slug, name: m.name, title: m.title, state: m.state, photo: m.photo } : null,
      };
    });
  }
  return seed.leadership.map((l) => {
    const m = seed.members.find((x) => x.slug === l.memberSlug);
    return { role: l.role, tier: l.tier, remit: l.remit, member: m ? { slug: m.slug, name: m.name, title: m.title, state: m.state } : null };
  });
}

// ——— Title resolvers for cross-linked surfaces (memory engine) ———
export async function getCommitteesMap(): Promise<Map<string, string>> {
  const all = await listCommittees();
  return new Map(all.map((c) => [c.slug, c.name]));
}

export async function getEventTitles(slugs: string[]): Promise<Map<string, string>> {
  if (!slugs.length) return new Map();
  const all = await listEvents();
  return new Map(all.filter((e) => slugs.includes(e.slug)).map((e) => [e.slug, e.title]));
}

export async function getDocTitles(slugs: string[]): Promise<Map<string, string>> {
  if (!slugs.length) return new Map();
  const all = await listDocs();
  return new Map(all.filter((d) => slugs.includes(d.slug)).map((d) => [d.slug, d.title]));
}

// ——— Media library ———
export interface MediaItem {
  id: string; title: string; description?: string;
  kind: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO";
  category: string; url: string; thumbnailUrl?: string;
  provider?: string; providerId?: string; durationSecs?: number;
  photographer?: string; copyright?: string; altText?: string;
  eventSlug?: string; createdAt: string;
}

export async function listMedia(opts?: { kind?: string; category?: string; eventSlug?: string }): Promise<MediaItem[]> {
  if (await dbReady()) {
    const rows = await db.mediaAsset.findMany({
      where: {
        visibility: "PUBLIC",
        ...(opts?.kind ? { kind: opts.kind as never } : {}),
        ...(opts?.category ? { category: opts.category } : {}),
        ...(opts?.eventSlug ? { event: { slug: opts.eventSlug } } : {}),
      },
      include: { event: { select: { slug: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((a) => ({
      id: a.id, title: a.title, description: a.description ?? undefined,
      kind: a.kind as MediaItem["kind"], category: a.category, url: a.url,
      thumbnailUrl: a.thumbnailUrl ?? undefined, provider: a.provider ?? undefined,
      providerId: a.providerId ?? undefined, durationSecs: a.durationSecs ?? undefined,
      photographer: a.photographer ?? undefined, copyright: a.copyright ?? undefined,
      altText: a.altText ?? undefined, eventSlug: a.event?.slug,
      createdAt: new Date(a.createdAt).toISOString().slice(0, 10),
    }));
  }
  return [];
}

export async function listVideos(): Promise<MediaItem[]> {
  return listMedia({ kind: "VIDEO" });
}

export async function getEventGallery(eventSlug: string): Promise<MediaItem[]> {
  return listMedia({ eventSlug });
}

export function videoEmbedUrl(item: MediaItem): string | null {
  if (item.kind !== "VIDEO" || !item.providerId) return null;
  if (item.provider === "YOUTUBE") return `https://www.youtube-nocookie.com/embed/${item.providerId}`;
  if (item.provider === "VIMEO") return `https://player.vimeo.com/video/${item.providerId}`;
  return null;
}

// ——— Institutional search (DB-first; seed fallback when no database) ———
export interface SearchHit { kind: string; title: string; subtitle: string; href: string }

export async function searchAll(query: string): Promise<Record<string, SearchHit[]>> {
  const q = query.trim().toLowerCase();
  if (!q) return {};
  const [members, events, docs, news, committees, partnerships] = await Promise.all([
    listMembers(), listEvents(), listDocs(), listNews(), listCommittees(), listPartnerships(),
  ]);
  const has = (...fields: (string | number | undefined)[]) =>
    fields.some((f) => String(f ?? "").toLowerCase().includes(q));
  return {
    Members: members.filter((m) => m.visibility === "PUBLIC" && has(m.name, m.title)).map((m) => ({
      kind: "Members", title: m.name, subtitle: m.title, href: `/members/${m.slug}`,
    })),
    Events: events.filter((e) => has(e.title, e.theme, e.city)).map((e) => ({
      kind: "Events", title: e.title, subtitle: `${e.theme} · ${e.city}`, href: `/events/${e.slug}`,
    })),
    Publications: docs.filter((d) => d.status === "Published" && d.visibility === "PUBLIC" && has(d.title, d.topic, d.type)).map((d) => ({
      kind: "Publications", title: d.title, subtitle: `${d.type} · ${d.year}`, href: `/knowledge/${d.slug}`,
    })),
    News: news.filter((n) => has(n.title, n.excerpt)).map((n) => ({
      kind: "News", title: n.title, subtitle: `${n.category} · ${n.date}`, href: `/news/${n.slug}`,
    })),
    Committees: committees.filter((c) => has(c.name, c.mandate)).map((c) => ({
      kind: "Committees", title: c.name, subtitle: c.status, href: `/committees`,
    })),
    Partnerships: partnerships.filter((p) => has(p.name, p.purpose)).map((p) => ({
      kind: "Partnerships", title: p.name, subtitle: p.type, href: `/partnerships`,
    })),
  };
}
