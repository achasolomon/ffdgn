import { EXTRA_SITE_DEFAULTS } from "./site-settings-fields";
import { db, dbReady } from "./db";
import type { Committee, ForumEvent, KnowledgeDoc, Member, NewsItem, Partnership } from "./types";
import * as seed from "./data";
import { NAV, FOOTER_COLUMNS, asRoute, type NavItem } from "./routes";
import { fallbackInstitutionalPage, INSTITUTIONAL_PAGES, PEER_REVIEW_MEMBERS, type InstitutionalPageContent, type InstitutionalSectionContent, type PeerReviewMemberContent } from "./institutional-pages";

/**
 * DB-first institutional repository — MySQL is the single source of truth.
 * The static baseline (lib/data.ts) is used ONLY when no database is
 * configured (preview builds). No public surface imports static content
 * directly once a database is present.
 */

const iso = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const pretty = (s: string) => s.replace(/_/g, " ");

/**
 * Detail lookups fetch one row.
 *
 * `getMemberRepo` used to call `listMembers()` and then scan the array, so
 * opening a single member profile pulled the entire membership table — with
 * every service record, committee seat, event and publication — into memory and
 * threw all but one away. Each mapper below is shared with its list function so
 * the two cannot drift: the detail page and the directory entry are built by the
 * same code from the same shape.
 */
type RowOf<T extends (...args: never[]) => Promise<unknown[]>> = Awaited<ReturnType<T>>[number];

const memberInclude = {
  service: true,
  committeeSeats: { include: { committee: true } },
  engagedEvents: { include: { event: true } },
  authoredDocs: { include: { doc: true } },
} as const;

// ——— Members ———
export async function listMembers(): Promise<Member[]> {
  if (await dbReady()) {
    const rows = await db.member.findMany({ include: memberInclude, orderBy: { fullName: "asc" } });
    return rows.map(toMember);
  }
  return seed.members;
}

function toMember(m: RowOf<typeof db.member.findMany<{ include: typeof memberInclude }>>): Member {
  return {
    slug: m.slug, name: m.fullName, title: m.title, state: m.state,
    region: m.region as Member["region"], category: m.category as "Former" | "Serving" | "Secretariat",
    status: m.status as Member["status"],
    service: m.service.map((s) => ({ office: s.office, state: s.state, startYear: s.startYear, endYear: s.endYear })),
    committees: m.committeeSeats.map((s) => s.committee.slug),
    leadershipRole: m.leadershipRole ?? undefined,
    photo: m.photoUrl ?? undefined,
    bio: m.bio ?? "", visibility: m.visibility as Member["visibility"],
    publications: m.authoredDocs.map((p) => p.doc.slug),
    events: m.engagedEvents.map((e) => e.event.slug),
  };
}

export async function getMemberRepo(slug: string): Promise<Member | null> {
  if (await dbReady()) {
    const row = await db.member.findUnique({ where: { slug }, include: memberInclude });
    return row ? toMember(row) : null;
  }
  return seed.members.find((m) => m.slug === slug) ?? null;
}

export async function memberName(slug: string): Promise<string> {
  const m = await getMemberRepo(slug);
  return m?.name ?? slug;
}

// ——— Events ———
const eventInclude = {
  programme: { orderBy: { position: "asc" } },
  documents: true,
  speakers: { include: { member: true }, orderBy: { position: "asc" } },
} as const;

export async function listEvents(): Promise<ForumEvent[]> {
  if (await dbReady()) {
    const rows = await db.forumEvent.findMany({ where: { published: true }, include: eventInclude, orderBy: { startDate: "desc" } });
    return rows.map(toEvent);
  }
  return seed.events;
}

function toEvent(e: RowOf<typeof db.forumEvent.findMany<{ include: typeof eventInclude }>>): ForumEvent {
  return {
    slug: e.slug, title: e.title, theme: e.theme, kind: e.kind as ForumEvent["kind"],
    startDate: iso(e.startDate), endDate: iso(e.endDate),
    venue: e.venue, city: e.city, status: e.status as ForumEvent["status"], summary: e.summary,
    highlights: e.highlights ?? undefined,
    programme: e.programme.map((p) => ({ time: p.slotTime, session: p.session, speaker: p.speaker ?? undefined })),
    speakers: e.speakers.map((s) => s.member.slug),
    documents: e.documents.map((d) => d.slug), gallery: [],
    communique: e.documents.find((d) => d.type === "Communiqué")?.slug,
    coverUrl: e.coverUrl ?? undefined,
    guests: e.guestList ? e.guestList.split("\n").map((g) => g.trim()).filter(Boolean) : [],
  };
}

export async function getEventRepo(slug: string): Promise<ForumEvent | null> {
  if (await dbReady()) {
    const row = await db.forumEvent.findFirst({ where: { slug, published: true }, include: eventInclude });
    return row ? toEvent(row) : null;
  }
  return seed.events.find((e) => e.slug === slug) ?? null;
}

// ——— Knowledge ———
const docInclude = { event: { select: { slug: true } } } as const;

export async function listDocs(): Promise<KnowledgeDoc[]> {
  if (await dbReady()) {
    const rows = await db.knowledgeDoc.findMany({ include: docInclude, orderBy: [{ year: "desc" }, { title: "asc" }] });
    return rows.map(toDoc);
  }
  return seed.documents;
}

function toDoc(d: RowOf<typeof db.knowledgeDoc.findMany<{ include: typeof docInclude }>>): KnowledgeDoc {
  return {
    slug: d.slug, title: d.title, type: pretty(d.type) as KnowledgeDoc["type"],
    status: pretty(d.status) as KnowledgeDoc["status"],
    published: d.publishedOn ? iso(d.publishedOn) : "", author: d.author, topic: d.topic, year: d.year,
    committee: d.committee ?? undefined, event: d.event?.slug,
    pages: d.pages, size: d.sizeLabel, summary: d.summary,
    visibility: d.visibility as KnowledgeDoc["visibility"], downloads: d.downloads,
    fileUrl: d.fileUrl ?? undefined,
  };
}

export async function getDocRepo(slug: string): Promise<KnowledgeDoc | null> {
  if (await dbReady()) {
    const row = await db.knowledgeDoc.findUnique({ where: { slug }, include: docInclude });
    return row ? toDoc(row) : null;
  }
  return seed.documents.find((d) => d.slug === slug) ?? null;
}

// ——— News ———
const newsInclude = {
  event: { select: { slug: true } },
  linkedDocs: { include: { doc: { select: { slug: true } } } },
} as const;

export async function listNews(): Promise<NewsItem[]> {
  if (await dbReady()) {
    const rows = await db.newsArticle.findMany({ where: { status: "Published" }, include: newsInclude, orderBy: { date: "desc" } });
    return rows.map(toNews);
  }
  return seed.news;
}

function toNews(n: RowOf<typeof db.newsArticle.findMany<{ include: typeof newsInclude }>>): NewsItem {
  return {
    slug: n.slug, title: n.title, category: n.category as NewsItem["category"],
    date: iso(n.date), location: n.location, excerpt: n.excerpt,
    body: n.body.split("\n\n"), image: n.imageUrl ?? undefined,
    relatedEvent: n.event?.slug, relatedDocs: n.linkedDocs.map((l) => l.doc.slug), official: n.official,
  };
}

export async function getNewsRepo(slug: string): Promise<NewsItem | null> {
  if (await dbReady()) {
    const row = await db.newsArticle.findFirst({ where: { slug, status: "Published" }, include: newsInclude });
    return row ? toNews(row) : null;
  }
  return seed.news.find((n) => n.slug === slug) ?? null;
}

// ——— Committees & partnerships ———
export async function listCommittees(): Promise<Committee[]> {
  if (await dbReady()) {
    const rows = await db.committee.findMany({
      where: { published: true },
      include: { seats: { include: { member: true } } },
      orderBy: { name: "asc" },
    });
    const docs = await listDocs();
      return rows.map((c) => ({
        slug: c.slug, name: c.name, mandate: c.mandate, chair: c.chairSlug,
        members: c.seats.map((s) => s.member.slug), meetings: c.meetings,
        documents: docs.filter((d) => d.committee === c.slug).map((d) => d.slug),
        status: c.status as Committee["status"],
        imageUrl: c.imageUrl ?? undefined, imageAlt: c.imageAlt ?? undefined,
      }));
  }
  return seed.committees;
}

export async function listPartnerships(): Promise<Partnership[]> {
  if (await dbReady()) {
    const rows = await db.partnership.findMany({
      where: { published: true },
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
  const defaults = {
    ...EXTRA_SITE_DEFAULTS,
    "site.title": "Forum of Former Deputy Governors of Nigeria",
    "site.description": "A national forum bringing together former Deputy Governors to share experience, strengthen institutional knowledge and contribute to Nigeria's development.",
    "site.phone": "+234 9 4612 3456",
    "site.email": "info@ffdgn.org.ng",
    "site.address": "Abuja, Nigeria",
    "contact.address": "No. 12 Pope John Paul II Street, Maitama, Abuja, Nigeria",
    "contact.hours": "Mon – Fri, 8:00 AM – 5:00 PM",
    "contact.conference_title": "5th National Conference enquiries",
    "contact.conference_phone": "0803 301 3624 · 0916 894 2222",
    "contact.conference_email": "annualconference@ffdgn.org.ng",
    "hero.image_1": "/assets/hero/fdg.jpg",
    "hero.image_2": "/assets/hero/fdg2.jpg",
    "hero.image_3": "/assets/hero/national.jpg",
    "hero.image_1_alt": "Forum leaders at a national engagement",
    "hero.image_2_alt": "Forum members in session",
    "hero.image_3_alt": "National institutional setting",
    "hero.eyebrow": "A national forum",
    "hero.title": "Experience in Service.\nKnowledge for the Future.",
    "hero.lede": "A national forum bringing together former Deputy Governors to share experience, strengthen institutional knowledge, support constructive dialogue and contribute to Nigeria's development.",
    "hero.cta_primary": "Explore the Forum",
    "hero.cta_secondary": "Discover Our Work",
    "home.about_eyebrow": "About FFDGN",
    "home.about_title": "Forum of Former Deputy Governors of Nigeria",
    "home.about_body": "The Forum of Former Deputy Governors of Nigeria (FFDGN) is a non-partisan organisation bringing together former and serving Deputy Governors to contribute to national development. Through knowledge sharing, policy advocacy, mentorship and constructive dialogue, the Forum puts leadership experience to work for stronger institutions and a better Nigeria.",
    "home.about_cta": "Learn more about us",
    "home.about_image": "/assets/hero/fdg.jpg",
    "home.about_image_alt": "Forum members together at an institutional engagement",
    "site.established": "2008",
    "site.seat": "Abuja, Nigeria",
    "site.character": "Non-partisan",
    "event.conference_label": "20–21 October 2026 · Abuja",
    "event.conference_title": "Annual Conference 2026",
    "event.conference_href": "/events/fifth-national-conference-2026",
    "event.conference_banner_detail": "20–21 October 2026 · Abuja Continental Hotel",
    // Right-hand column of the full-width logo row. The ad defaults to the
    // Forum's own conference so an unconfigured install still shows a live,
    // correct banner beside the seal rather than nothing at all.
    "header.ad_eyebrow": "20 – 21 October 2026",
    "header.ad_title": "5th National Conference 2026",
    "header.ad_detail": "Abuja Continental Hotel · Abuja, Nigeria",
    "header.ad_cta": "Register now",
    "header.ad_href": "/events/fifth-national-conference-2026",
    "header.ad_image": "/assets/brand/adbanner.png",
  };
  if (await dbReady()) {
    const rows = await db.siteSetting.findMany({ where: { NOT: { key: { startsWith: "website." } } } });
    return { ...defaults, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
  }
  return defaults;
}

const safePath = (value: unknown): value is string => typeof value === "string" && value.length <= 255 && /^\/(?!\/)[A-Za-z0-9\-_/?.=&%#]*$/.test(value);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isNavChild = (value: unknown): value is { label: string; href: string; desc: string } =>
  isRecord(value) && typeof value.label === "string" && !!value.label.trim() && safePath(value.href) && typeof value.desc === "string";
const isNavItem = (value: unknown): value is { label: string; href: string; children: { label: string; href: string; desc: string }[] } =>
  isRecord(value) && typeof value.label === "string" && !!value.label.trim() && safePath(value.href) &&
  Array.isArray(value.children) && value.children.length <= 20 && value.children.every(isNavChild);
const isFooterLink = (value: unknown): value is { label: string; href: string } =>
  isRecord(value) && typeof value.label === "string" && !!value.label.trim() && safePath(value.href);
const isFooterColumn = (value: unknown): value is { heading: string; links: { label: string; href: string }[] } =>
  isRecord(value) && typeof value.heading === "string" && !!value.heading.trim() &&
  Array.isArray(value.links) && value.links.length <= 20 && value.links.every(isFooterLink);

// Upgrade saved menus that still file Renewed Hope under The Forum.
function programNavigation(items: NavItem[]): NavItem[] {
  // Keep temporarily hidden partnerships out of public menus, without replacing
  // editor-authored groups or forcing future pages back to fixed destinations.
  return items.filter(item => item.href !== "/partnerships").map(item => ({...item, children:item.children.filter(child => child.href !== "/partnerships")}));
}
export async function getSiteNavigation(): Promise<NavItem[]> {
  if (!(await dbReady())) return NAV;
  const row = await db.siteSetting.findUnique({ where: { key: "navigation.primary" }, select: { value: true } });
  if (!row) return NAV;
  try {
    const parsed = JSON.parse(row.value) as unknown;
    if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 12) return NAV;
    const items = parsed.filter(isNavItem);
    if (items.length !== parsed.length) return NAV;
    return programNavigation(items.map((item) => ({
      label: item.label,
      href: asRoute(item.href),
      children: item.children.map((child) => ({ label: child.label, href: asRoute(child.href), desc: child.desc })),
    })));
  } catch { return NAV; }
}

export async function getSiteFooter(): Promise<typeof FOOTER_COLUMNS> {
  if (!(await dbReady())) return FOOTER_COLUMNS;
  const row = await db.siteSetting.findUnique({ where: { key: "navigation.footer" }, select: { value: true } });
  if (!row) return FOOTER_COLUMNS;
  try {
    const parsed = JSON.parse(row.value) as unknown;
    if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 8) return FOOTER_COLUMNS;
    const columns = parsed.filter(isFooterColumn);
    if (columns.length !== parsed.length) return FOOTER_COLUMNS;
    return columns.map((column) => ({
      heading: column.heading,
      links: column.links.filter(link => link.href !== "/partnerships").map((link) => ({ label: link.label, href: asRoute(link.href) })),
    }));
  } catch { return FOOTER_COLUMNS; }
}

export async function getInstitutionalPage(slug: string): Promise<InstitutionalPageContent | null> {
  const fallback = fallbackInstitutionalPage(slug);
  if (!(await dbReady())) return fallback;
  const row = await db.institutionalPage.findUnique({
    where: { slug },
    include: { sections: { where: { published: true }, orderBy: { position: "asc" } } },
  });
  if (!row) return fallback;
  if (!row.published) return null;
  return {
    slug: row.slug as InstitutionalPageContent["slug"], title: row.title, eyebrow: row.eyebrow,
    lede: row.lede, body: row.body, sections: toSections(row.sections),
  };
}

function toSections(rows: { id: string; title: string; body: string; imageUrl: string | null; imageAlt: string | null; position: number; published: boolean }[]): InstitutionalSectionContent[] {
  return rows.map((section) => ({
    id: section.id,
    title: section.title,
    body: section.body,
    imageUrl: section.imageUrl ?? undefined,
    imageAlt: section.imageAlt ?? undefined,
    position: section.position,
    published: section.published,
  }));
}

export async function listInstitutionalPages(options: { includeUnpublished?: boolean } = {}): Promise<InstitutionalPageContent[]> {
  if (!(await dbReady())) {
    return INSTITUTIONAL_PAGES;
  }
  const rows = await db.institutionalPage.findMany({
    orderBy: { slug: "asc" },
    include: { sections: { where: options.includeUnpublished ? {} : { published: true }, orderBy: { position: "asc" } } },
  });
  const saved = new Map(rows.filter((row) => options.includeUnpublished || row.published).map((row) => [row.slug, row]));
  return INSTITUTIONAL_PAGES.map((fallback) => {
    const row = saved.get(fallback.slug);
    if (!row) return fallback;
    return {
      slug: row.slug as InstitutionalPageContent["slug"], title: row.title, eyebrow: row.eyebrow,
      lede: row.lede, body: row.body, sections: toSections(row.sections),
    };
  });
}

export async function listPeerReviewMembers(options: { includeUnpublished?: boolean } = {}): Promise<PeerReviewMemberContent[]> {
  // The fallback roster is seed content, not drafts, so the flag has nothing
  // to filter on while the database is unreachable.
  if (!(await dbReady())) return PEER_REVIEW_MEMBERS;
  const rows = await db.peerReviewMember.findMany({
    where: options.includeUnpublished ? {} : { published: true },
    orderBy: { position: "asc" },
  });
  return rows.map((m) => ({
    id: m.id,
    position: m.position,
    name: m.name,
    zone: m.zone,
    role: m.role,
    phone: m.phone ?? undefined,
    email: m.email ?? undefined,
    published: m.published,
  }));
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
    return (await db.focusArea.findMany({ where: { published: true }, orderBy: { position: "asc" } })).map((f) => ({
      slug: f.slug, title: f.title, text: f.text, href: f.href, image: f.imageUrl ?? undefined,
    }));
  }
  return seed.roles.map((r, i) => ({ ...r, href: ["/knowledge", "/knowledge", "/committees", "/committees", "/about", "/partnerships"][i] ?? "/about", image: undefined }));
}

export async function listTimeline(): Promise<{ year: number; title: string; summary: string; image?: string; links: { label: string; href: string }[] }[]> {
  if (await dbReady()) {
    const rows = await db.timelineEntry.findMany({ where: { published: true }, include: { links: true }, orderBy: { position: "asc" } });
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
    const seats = await db.leadershipSeat.findMany({ where: { published: true }, orderBy: { position: "asc" } });
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
    return { role: l.role, tier: l.tier, remit: l.remit, member: m ? { slug: m.slug, name: m.name, title: m.title, state: m.state, photo: m.photo } : null };
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

/**
 * Full metadata for a set of document slugs, in the order given.
 *
 * `getDocTitles` only answers "what is this called?"; a page rendering download
 * controls also needs to know whether a file was ever uploaded and who may read
 * it, so that it never offers a button the download endpoint will refuse.
 */
export async function getDocsBySlug(slugs: string[]): Promise<KnowledgeDoc[]> {
  if (!slugs.length) return [];
  const all = await listDocs();
  const order = new Map(slugs.map((slug, index) => [slug, index]));
  return all
    .filter((document) => order.has(document.slug))
    .sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
}

// ——— Speakers (CMS-managed conference faculty) ———
export interface SpeakerItem {
  slug: string; name: string; honorific?: string; role: string; keynote: boolean;
  org?: string; bio?: string; photo?: string; eventSlug?: string;
}

export async function listSpeakers(eventSlug?: string): Promise<SpeakerItem[]> {
  if (await dbReady()) {
    const rows = await db.speaker.findMany({
      where: {
        visibility: "PUBLIC",
        ...(eventSlug ? { event: { slug: eventSlug } } : {}),
      },
      include: { event: { select: { slug: true, title: true } } },
      orderBy: [{ keynote: "desc" }, { position: "asc" }],
    });
    return rows.map((s) => ({
      slug: s.slug, name: s.name, honorific: s.honorific ?? undefined, role: s.role,
      keynote: s.keynote, org: s.org ?? undefined, bio: s.bio ?? undefined,
      photo: s.photoUrl ?? undefined, eventSlug: s.event?.slug,
    }));
  }
  return [];
}

export async function getSpeakerRepo(slug: string): Promise<(SpeakerItem & { eventTitle?: string }) | null> {
  if (await dbReady()) {
    const s = await db.speaker.findUnique({
      where: { slug },
      include: { event: { select: { slug: true, title: true } } },
    });
    if (!s || s.visibility !== "PUBLIC") return null;
    return {
      slug: s.slug, name: s.name, honorific: s.honorific ?? undefined, role: s.role,
      keynote: s.keynote, org: s.org ?? undefined, bio: s.bio ?? undefined,
      photo: s.photoUrl ?? undefined, eventSlug: s.event?.slug, eventTitle: s.event?.title,
    };
  }
  return null;
}

// ——— Media library ———
export interface MediaItem {
  id: string; title: string; description?: string;
  kind: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO";
  category: string; url: string; thumbnailUrl?: string;
  provider?: string; providerId?: string; durationSecs?: number;
  photographer?: string; copyright?: string; altText?: string;
  eventSlug?: string; createdAt: string;
  /**
   * The year this asset is filed under, for gallery filtering.
   *
   * Capture year when the editor supplied one, otherwise the linked event's
   * year, otherwise the upload year. `createdAt` alone would collapse the whole
   * archive into the year the records happened to be imported.
   */
  inGallery: boolean;
  year: number;
}

/**
 * Resolve the display year for a stored asset. Kept in one place so the
 * gallery, the facets and the event pages cannot disagree about which year a
 * photograph belongs to.
 */
function mediaYear(row: { year: number | null; createdAt: Date; event: { startDate: Date } | null }): number {
  if (row.year) return row.year;
  if (row.event) return new Date(row.event.startDate).getUTCFullYear();
  return new Date(row.createdAt).getUTCFullYear();
}

export function isGalleryPhotograph(item: Pick<MediaItem, "kind" | "category" | "url" | "inGallery">): boolean {
  return item.kind === "IMAGE" && item.inGallery &&
    !/^(brand|hero|portrait|partner|logo|banner|flyer|document)$/i.test(item.category.trim()) &&
    !/\/assets\/(brand|hero|leadership|partners)\//i.test(item.url) &&
    !/(?:^|[\/_-])(logo|banner|flyer)(?:[\/_\-.]|$)/i.test(item.url);
}
export async function listMedia(opts?: {
  kind?: string; category?: string; eventSlug?: string;
  /**
   * Only assets an editor marked as gallery material. The media picker and the
   * admin list leave this off so brand marks and partner logos stay reachable.
   */
  galleryOnly?: boolean;
}): Promise<MediaItem[]> {
  if (await dbReady()) {
    const rows = await db.mediaAsset.findMany({
      where: {
        visibility: "PUBLIC",
        ...(opts?.kind ? { kind: opts.kind as never } : {}),
        ...(opts?.category ? { category: opts.category } : {}),
        ...(opts?.eventSlug ? { event: { slug: opts.eventSlug } } : {}),
        ...(opts?.galleryOnly ? { inGallery: true } : {}),
      },
      include: { event: { select: { slug: true, startDate: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((a) => ({
      id: a.id, title: a.title, description: a.description ?? undefined,
      kind: a.kind as MediaItem["kind"], category: a.category, url: a.url,
      thumbnailUrl: a.thumbnailUrl ?? undefined, provider: a.provider ?? undefined,
      providerId: a.providerId ?? undefined, durationSecs: a.durationSecs ?? undefined,
      photographer: a.photographer ?? undefined, copyright: a.copyright ?? undefined,
      altText: a.altText ?? undefined, eventSlug: a.event?.slug,
      inGallery: a.inGallery, year: mediaYear(a),
      createdAt: new Date(a.createdAt).toISOString().slice(0, 10),
    }));
  }
  return [];
}

export type MediaFacets = { categories: string[]; years: number[]; events: { slug: string; title: string }[] };

/**
 * Distinct categories, years and events present in the gallery, so the filter
 * UI offers only choices that actually return something. Hand-written chips for
 * a fixed list had already drifted from the data: three live categories were
 * missing and two offered ones had no images behind them.
 */
export async function listMediaFacets(kind?: string): Promise<MediaFacets> {
  if (!(await dbReady())) return { categories: [], years: [], events: [] };
  const rows = await db.mediaAsset.findMany({
    where: { visibility: "PUBLIC", inGallery: true, ...(kind ? { kind: kind as never } : {}) },
    select: { category: true, year: true, createdAt: true, event: { select: { slug: true, title: true, startDate: true } } },
  });
  const categories = new Set<string>();
  const years = new Set<number>();
  const events = new Map<string, { slug: string; title: string; startDate: Date }>();
  for (const row of rows) {
    categories.add(row.category);
    years.add(mediaYear(row));
    if (row.event) events.set(row.event.slug, { slug: row.event.slug, title: row.event.title, startDate: row.event.startDate });
  }
  return {
    categories: [...categories].sort((a, b) => a.localeCompare(b)),
    years: [...years].sort((a, b) => b - a),
    events: [...events.values()].sort((a, b) => b.startDate.getTime() - a.startDate.getTime()).map(({ slug, title }) => ({ slug, title })),
  };
}

export async function listVideos(): Promise<MediaItem[]> {
  return listMedia({ kind: "VIDEO", galleryOnly: true });
}

export async function getEventGallery(eventSlug: string): Promise<MediaItem[]> {
  const [items, event] = await Promise.all([listMedia({ eventSlug, kind: "IMAGE", galleryOnly: true }), getEventRepo(eventSlug)]);
  return items.filter(item => isGalleryPhotograph(item) && item.url !== event?.coverUrl);
}

export function videoEmbedUrl(item: MediaItem): string | null {
  if (item.kind !== "VIDEO" || !item.providerId) return null;
  if (item.provider === "YOUTUBE") return `https://www.youtube-nocookie.com/embed/${item.providerId}`;
  if (item.provider === "VIMEO") return `https://player.vimeo.com/video/${item.providerId}`;
  return null;
}

// ——— Institutional search (DB-first; seed fallback when no database) ———
export interface SearchHit { kind: string; title: string; subtitle: string; href: string }

/** Per-section result ceiling. A search page showing 400 rows is not a result. */
const SEARCH_LIMIT = 25;

/**
 * Search pushes the filter into SQL rather than pulling every table into memory
 * and scanning it.
 *
 * `searchAll` used to load all members, events, documents, news, committees and
 * partnerships — with their relations — and then run `String.includes` over the
 * lot, on every keystroke-driven submit. The database already indexes these
 * columns, so the filtering belongs there.
 *
 * `contains` is a LIKE '%term%' scan, so this is not free, but it returns 25 rows
 * per section instead of every row with its joins, and it bounds the response
 * regardless of how large the institution grows. Note the visibility filter is
 * applied in SQL: the in-memory version filtered members and documents after
 * fetching, which meant a search result set briefly contained restricted records
 * before they were discarded.
 */
export async function searchAll(query: string): Promise<Record<string, SearchHit[]>> {
  const q = query.trim();
  if (!q) return {};

  if (await dbReady()) {
    const [members, events, docs, news, committees, partnerships] = await Promise.all([
      db.member.findMany({
        where: {
          visibility: "PUBLIC",
          OR: [{ fullName: { contains: q } }, { title: { contains: q } }],
        },
        take: SEARCH_LIMIT,
        orderBy: { fullName: "asc" },
        select: { slug: true, fullName: true, title: true },
      }),
      db.forumEvent.findMany({
        where: { OR: [{ title: { contains: q } }, { theme: { contains: q } }, { city: { contains: q } }] },
        take: SEARCH_LIMIT,
        orderBy: { startDate: "desc" },
        select: { slug: true, title: true, theme: true, city: true },
      }),
      db.knowledgeDoc.findMany({
        where: {
          status: "Published",
          visibility: "PUBLIC",
          OR: [{ title: { contains: q } }, { topic: { contains: q } }],
        },
        take: SEARCH_LIMIT,
        orderBy: { year: "desc" },
        select: { slug: true, title: true, topic: true, type: true, year: true },
      }),
      db.newsArticle.findMany({
        where: { OR: [{ title: { contains: q } }, { excerpt: { contains: q } }] },
        take: SEARCH_LIMIT,
        orderBy: { date: "desc" },
        select: { slug: true, title: true, category: true, date: true },
      }),
      db.committee.findMany({
        where: { OR: [{ name: { contains: q } }, { mandate: { contains: q } }] },
        take: SEARCH_LIMIT,
        orderBy: { name: "asc" },
        select: { slug: true, name: true, status: true },
      }),
      db.partnership.findMany({
        where: { OR: [{ name: { contains: q } }, { purpose: { contains: q } }] },
        take: SEARCH_LIMIT,
        orderBy: { name: "asc" },
        select: { slug: true, name: true, type: true },
      }),
    ]);

    return {
      Members: members.map((m) => ({
        kind: "Members", title: m.fullName, subtitle: m.title, href: `/members/${m.slug}`,
      })),
      Events: events.map((e) => ({
        kind: "Events", title: e.title, subtitle: `${e.theme} · ${e.city}`, href: `/events/${e.slug}`,
      })),
      Publications: docs.map((d) => ({
        kind: "Publications", title: d.title, subtitle: `${pretty(d.type)} · ${d.year}`, href: `/knowledge/${d.slug}`,
      })),
      News: news.map((n) => ({
        kind: "News", title: n.title, subtitle: `${n.category} · ${iso(n.date)}`, href: `/news/${n.slug}`,
      })),
      Committees: committees.map((c) => ({
        kind: "Committees", title: c.name, subtitle: pretty(c.status), href: `/committees#${c.slug}`,
      })),
      Partnerships: partnerships.map((p) => ({
        kind: "Partnerships", title: p.name, subtitle: p.type, href: `/partnerships#${p.slug}`,
      })),
    };
  }

  // Seed fallback (preview builds with no database).
  const lower = q.toLowerCase();
  const has = (...fields: (string | number | undefined)[]) =>
    fields.some((f) => String(f ?? "").toLowerCase().includes(lower));
  const cap = <T>(a: T[]) => a.slice(0, SEARCH_LIMIT);
  return {
    Members: cap(seed.members.filter((m) => m.visibility === "PUBLIC" && has(m.name, m.title))).map((m) => ({
      kind: "Members", title: m.name, subtitle: m.title, href: `/members/${m.slug}`,
    })),
    Events: cap(seed.events.filter((e) => has(e.title, e.theme, e.city))).map((e) => ({
      kind: "Events", title: e.title, subtitle: `${e.theme} · ${e.city}`, href: `/events/${e.slug}`,
    })),
    Publications: cap(seed.documents.filter((d) => d.status === "Published" && d.visibility === "PUBLIC" && has(d.title, d.topic, d.type))).map((d) => ({
      kind: "Publications", title: d.title, subtitle: `${d.type} · ${d.year}`, href: `/knowledge/${d.slug}`,
    })),
    News: cap(seed.news.filter((n) => has(n.title, n.excerpt))).map((n) => ({
      kind: "News", title: n.title, subtitle: `${n.category} · ${n.date}`, href: `/news/${n.slug}`,
    })),
    Committees: cap(seed.committees.filter((c) => has(c.name, c.mandate))).map((c) => ({
      kind: "Committees", title: c.name, subtitle: c.status, href: `/committees`,
    })),
    Partnerships: cap(seed.partnerships.filter((p) => has(p.name, p.purpose))).map((p) => ({
      kind: "Partnerships", title: p.name, subtitle: p.type, href: `/partnerships`,
    })),
  };
}
