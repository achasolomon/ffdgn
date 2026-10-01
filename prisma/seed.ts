/**
 * FFDGN institutional seed — loads the CMS baseline (lib/data.ts) into MySQL.
 * Run: `npx prisma migrate dev` then `npm run db:seed`.
 *
 * Dev credentials below are for local use only and must be rotated in every
 * deployed environment (see .env.example / deployment notes in README).
 */
import { PrismaClient, DocStatus, EventStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { committees, documents, events, leadership, members, metrics, news, partnerships, roles, timeline } from "../lib/data";

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

const DEV_USERS = [
  { email: "superadmin@ffdgn.org.ng", name: "Super Administrator", role: "super_admin" as const, password: "FFDGN-Super-2026!" },
  { email: "secretariat@ffdgn.org.ng", name: "Secretariat Admin", role: "secretariat_admin" as const, password: "FFDGN-Secret-2026!" },
  { email: "editor@ffdgn.org.ng", name: "Content Editor", role: "content_editor" as const, password: "FFDGN-Edit-2026!" },
  { email: "events@ffdgn.org.ng", name: "Events Manager", role: "events_manager" as const, password: "FFDGN-Event-2026!" },
  { email: "auditor@ffdgn.org.ng", name: "Auditor (read-only)", role: "auditor" as const, password: "FFDGN-Audit-2026!" },
  { email: "member@ffdgn.org.ng", name: "H.E. Atim Tyonongu", role: "member" as const, password: "FFDGN-Member-2026!" },
];

const toDocStatus = (s: string): DocStatus =>
  s.replace(/ /g, "_") as DocStatus; // "Editorial Review" -> Editorial_Review
const toEventStatus = (s: string): EventStatus => s as EventStatus;

async function main() {
  console.log("Seeding FFDGN institutional baseline…");

  // Users (auth) — bcrypt-hashed, never plaintext.
  for (const u of DEV_USERS) {
    const passwordHash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash, isActive: true },
      create: { email: u.email, name: u.name, role: u.role, passwordHash },
    });
  }
  const memberUser = await prisma.user.findUniqueOrThrow({ where: { email: "member@ffdgn.org.ng" } });
  const secretariat = await prisma.user.findUniqueOrThrow({ where: { email: "secretariat@ffdgn.org.ng" } });

  // Members + service history.
  for (const m of members) {
    const member = await prisma.member.upsert({
      where: { slug: m.slug },
      update: {
        fullName: m.name, title: m.title, state: m.state, region: m.region,
        category: m.category, status: m.status, leadershipRole: m.leadershipRole ?? null,
        bio: m.bio, visibility: m.visibility, photoUrl: m.photo ?? `/media/portraits/${m.slug}.svg`,
        userId: m.slug === "atim-tyonongu" ? memberUser.id : null,
      },
      create: {
        slug: m.slug, fullName: m.name, title: m.title, state: m.state, region: m.region,
        category: m.category, status: m.status, leadershipRole: m.leadershipRole ?? null,
        bio: m.bio, visibility: m.visibility, photoUrl: m.photo ?? `/media/portraits/${m.slug}.svg`,
        userId: m.slug === "atim-tyonongu" ? memberUser.id : null,
      },
    });
    await prisma.serviceRecord.deleteMany({ where: { memberId: member.id } });
    for (const s of m.service) {
      await prisma.serviceRecord.create({
        data: { memberId: member.id, office: s.office, state: s.state, startYear: s.startYear, endYear: s.endYear },
      });
    }
  }

  // Events + programme.
  const EVENT_COVERS: Record<string, string> = {
    "national-conference-2025": "/assets/events/national-conference-2025.jpg",
    "national-conference-2024": "/assets/events/3rd-annual-conference.jpg",
    "fifth-national-conference-2026": "/assets/events/conference.png",
  };
  for (const e of events) {
    const event = await prisma.forumEvent.upsert({
      where: { slug: e.slug },
      update: {
        title: e.title, theme: e.theme, kind: e.kind,
        startDate: new Date(e.startDate), endDate: new Date(e.endDate),
        venue: e.venue, city: e.city, status: toEventStatus(e.status), summary: e.summary,
        coverUrl: EVENT_COVERS[e.slug] ?? e.coverUrl ?? null,
        guestList: e.guests?.join("\n") ?? null,
      },
      create: {
        slug: e.slug, title: e.title, theme: e.theme, kind: e.kind,
        startDate: new Date(e.startDate), endDate: new Date(e.endDate),
        venue: e.venue, city: e.city, status: toEventStatus(e.status), summary: e.summary,
        coverUrl: EVENT_COVERS[e.slug] ?? e.coverUrl ?? null,
        guestList: e.guests?.join("\n") ?? null,
      },
    });
    await prisma.eventProgramme.deleteMany({ where: { eventId: event.id } });
    for (const [i, p] of e.programme.entries()) {
      await prisma.eventProgramme.create({
        data: { eventId: event.id, slotTime: p.time, session: p.session, speaker: p.speaker ?? null, position: i },
      });
    }
  }

  // Documents (approval workflow states preserved).
  for (const d of documents) {
    const event = d.event ? await prisma.forumEvent.findUnique({ where: { slug: d.event } }) : null;
    await prisma.knowledgeDoc.upsert({
      where: { slug: d.slug },
      update: {
        title: d.title, type: d.type, status: toDocStatus(d.status),
        publishedOn: new Date(d.published), author: d.author, topic: d.topic, year: d.year,
        committee: d.committee ?? null, eventId: event?.id ?? null,
        pages: d.pages, sizeLabel: d.size, summary: d.summary,
        visibility: d.visibility, downloads: d.downloads,
      },
      create: {
        slug: d.slug, title: d.title, type: d.type, status: toDocStatus(d.status),
        publishedOn: new Date(d.published), author: d.author, topic: d.topic, year: d.year,
        committee: d.committee ?? null, eventId: event?.id ?? null,
        pages: d.pages, sizeLabel: d.size, summary: d.summary,
        visibility: d.visibility, downloads: d.downloads,
      },
    });
  }

  // News (+ event/doc links), committees (+ seats), partnerships (+ cooperation/events).
  const NEWS_IMAGES: Record<string, string> = {
    "state-federal-collaboration-call": "/media/news/collaboration.svg",
    "polish-nigeria-partnership": "/media/news/partnership.svg",
    "strategic-meeting-2025": "/media/news/meeting.svg",
    "2024-communique-publication": "/media/news/communique.svg",
  };
  for (const n of news) {
    const event = n.relatedEvent ? await prisma.forumEvent.findUnique({ where: { slug: n.relatedEvent } }) : null;
    const article = await prisma.newsArticle.upsert({
      where: { slug: n.slug },
      update: { title: n.title, category: n.category, date: new Date(n.date), location: n.location, excerpt: n.excerpt, body: n.body.join("\n\n"), official: n.official, eventId: event?.id ?? null, imageUrl: NEWS_IMAGES[n.slug] ?? null },
      create: { slug: n.slug, title: n.title, category: n.category, date: new Date(n.date), location: n.location, excerpt: n.excerpt, body: n.body.join("\n\n"), official: n.official, eventId: event?.id ?? null, imageUrl: NEWS_IMAGES[n.slug] ?? null },
    });
    await prisma.newsDoc.deleteMany({ where: { newsId: article.id } });
    for (const slug of n.relatedDocs ?? []) {
      const doc = await prisma.knowledgeDoc.findUnique({ where: { slug } });
      if (doc) await prisma.newsDoc.create({ data: { newsId: article.id, docId: doc.id } });
    }
  }
  for (const c of committees) {
    const committee = await prisma.committee.upsert({
      where: { slug: c.slug },
      update: { name: c.name, mandate: c.mandate, chairSlug: c.chair, meetings: c.meetings, status: c.status },
      create: { slug: c.slug, name: c.name, mandate: c.mandate, chairSlug: c.chair, meetings: c.meetings, status: c.status },
    });
    await prisma.committeeSeat.deleteMany({ where: { committeeId: committee.id } });
    for (const slug of c.members) {
      const member = await prisma.member.findUnique({ where: { slug } });
      if (member) await prisma.committeeSeat.create({ data: { committeeId: committee.id, memberId: member.id } });
    }
  }
  for (const p of partnerships) {
    const partnership = await prisma.partnership.upsert({
      where: { slug: p.slug },
      update: { name: p.name, type: p.type, since: p.since, purpose: p.purpose },
      create: { slug: p.slug, name: p.name, type: p.type, since: p.since, purpose: p.purpose },
    });
    await prisma.partnershipCooperation.deleteMany({ where: { partnershipId: partnership.id } });
    for (const [i, area] of p.cooperation.entries()) {
      await prisma.partnershipCooperation.create({ data: { partnershipId: partnership.id, area, position: i } });
    }
    await prisma.partnershipEvent.deleteMany({ where: { partnershipId: partnership.id } });
    for (const slug of p.events) {
      const event = await prisma.forumEvent.findUnique({ where: { slug } });
      if (event) await prisma.partnershipEvent.create({ data: { partnershipId: partnership.id, eventId: event.id } });
    }
  }

  // Institutional relation joins (memory engine): event speakers, member events/publications.
  const memberBySlug = new Map((await prisma.member.findMany({ select: { id: true, slug: true } })).map((m) => [m.slug, m.id]));
  const eventBySlug = new Map((await prisma.forumEvent.findMany({ select: { id: true, slug: true } })).map((e) => [e.slug, e.id]));
  const docBySlug = new Map((await prisma.knowledgeDoc.findMany({ select: { id: true, slug: true } })).map((d) => [d.slug, d.id]));
  for (const e of events) {
    const eventId = eventBySlug.get(e.slug);
    if (!eventId) continue;
    await prisma.eventSpeaker.deleteMany({ where: { eventId } });
    for (const [i, slug] of e.speakers.entries()) {
      const memberId = memberBySlug.get(slug);
      if (memberId) await prisma.eventSpeaker.create({ data: { eventId, memberId, position: i } });
    }
  }
  for (const m of members) {
    const memberId = memberBySlug.get(m.slug);
    if (!memberId) continue;
    await prisma.memberEvent.deleteMany({ where: { memberId } });
    for (const slug of m.events) {
      const eventId = eventBySlug.get(slug);
      if (eventId) await prisma.memberEvent.create({ data: { memberId, eventId } });
    }
    await prisma.memberPublication.deleteMany({ where: { memberId } });
    for (const slug of m.publications) {
      const docId = docBySlug.get(slug);
      if (docId) await prisma.memberPublication.create({ data: { memberId, docId } });
    }
  }

  // CMS-managed content: settings, metrics, focus areas, timeline, leadership.
  const SETTINGS: [string, string][] = [
    ["hero.eyebrow", "A national forum"],
    ["hero.title", "Experience in Service.\nKnowledge for the Future."],
    ["hero.lede", "A national forum bringing together former Deputy Governors to share experience, strengthen institutional knowledge, support constructive dialogue and contribute to Nigeria's development."],
    ["hero.cta_primary", "Explore the Forum"],
    ["hero.cta_secondary", "Discover Our Work"],
    ["site.established", "2008"],
    ["site.seat", "Abuja, Nigeria"],
    ["site.character", "Non-partisan"],
  ];
  for (const [key, value] of SETTINGS) {
    await prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  for (const [i, m] of metrics.entries()) {
    await prisma.siteMetric.upsert({
      where: { key: m.label },
      update: { value: m.value, label: m.label, href: m.href, position: i },
      create: { key: m.label, value: m.value, label: m.label, href: m.href, position: i },
    });
  }
  const FOCUS_HREFS = ["/knowledge", "/knowledge", "/committees", "/committees", "/about", "/partnerships"];
  const FOCUS_IMAGES: Record<string, string> = {
    "policy-governance": "/assets/events/institutiona-dialog.jpg",
    "policy-experience": "/assets/events/policy-experience.jpg",
    "peer-review": "/assets/events/peer-review.jpg",
    "mentorship": "/assets/events/mentorship.jpg",
    "research": "/assets/events/research-knowledge.jpg",
    "partnerships": "/assets/events/strategic-partnership.jpg",
  };
  for (const [i, r] of roles.entries()) {
    await prisma.focusArea.upsert({
      where: { slug: r.slug },
      update: { title: r.title, text: r.text, href: FOCUS_HREFS[i] ?? "/about", position: i, imageUrl: FOCUS_IMAGES[r.slug] ?? null },
      create: { slug: r.slug, title: r.title, text: r.text, href: FOCUS_HREFS[i] ?? "/about", position: i, imageUrl: FOCUS_IMAGES[r.slug] ?? null },
    });
  }
  const TIMELINE_IMAGES: Record<number, string> = {
    2008: "/assets/events/inaugural-conference.jpg",
    2012: "/assets/events/national-dialogue.jpg",
    2016: "/assets/events/2016-institutional-strenghtening.jpg",
    2020: "/assets/events/2020-dialogue-series.jpg",
    2024: "/assets/events/2024-strategic-plan.jpg",
    2026: "/assets/events/2026-digital-institution.jpeg",
  };
  await prisma.timelineLink.deleteMany({});
  await prisma.timelineEntry.deleteMany({});
  for (const [i, t] of timeline.entries()) {
    const entry = await prisma.timelineEntry.create({ data: { year: t.year, title: t.title, summary: t.summary, position: i, imageUrl: TIMELINE_IMAGES[t.year] ?? null } });
    for (const l of t.links) {
      await prisma.timelineLink.create({ data: { entryId: entry.id, label: l.label, href: l.href } });
    }
  }
  await prisma.leadershipSeat.deleteMany({});
  for (const [i, l] of leadership.entries()) {
    await prisma.leadershipSeat.create({ data: { role: l.role, tier: l.tier, memberSlug: l.memberSlug, remit: l.remit, position: i } });
  }

  // Media library — every generated artwork gets a catalogued record.
  const CREDIT = "FFDGN Media Unit";
  const mediaRows: { title: string; kind: "IMAGE"; category: string; url: string; photographer: string; copyright: string; altText: string; eventSlug?: string }[] = [
    ...members.map((m) => ({
      title: `${m.name} — official portrait`, kind: "IMAGE" as const, category: "Portrait",
      url: `/media/portraits/${m.slug}.svg`, photographer: CREDIT,
      copyright: "© 2026 FFDGN. Secretariat may replace with official photography.",
      altText: `Portrait placeholder for ${m.name}, ${m.title}, ${m.state} State`,
    })),
    { title: "Annual Conference 2026 — plenary hall", kind: "IMAGE", category: "Conference", url: "/media/events/conference-2026.svg", photographer: CREDIT, copyright: "© 2026 FFDGN", altText: "Illustrated plenary hall for the 2026 Annual Conference", eventSlug: "national-conference-2026" },
    { title: "Leadership Roundtable 2025", kind: "IMAGE", category: "Conference", url: "/media/events/conference-2025.svg", photographer: CREDIT, copyright: "© 2026 FFDGN", altText: "Illustrated roundtable for the 2025 Leadership Roundtable", eventSlug: "national-conference-2025" },
    { title: "National Conference 2024", kind: "IMAGE", category: "Conference", url: "/media/events/conference-2024.svg", photographer: CREDIT, copyright: "© 2026 FFDGN", altText: "Illustrated plenary for the 2024 National Conference", eventSlug: "national-conference-2024" },
    { title: "Policy dialogue session", kind: "IMAGE", category: "Conference", url: "/media/events/dialogue-session.svg", photographer: CREDIT, copyright: "© 2026 FFDGN", altText: "Illustrated policy dialogue session" },
    { title: "Seat of the Forum — Abuja", kind: "IMAGE", category: "Site", url: "/media/site/abuja-seat.svg", photographer: CREDIT, copyright: "© 2026 FFDGN", altText: "Illustrated institutional complex in Abuja" },
    { title: "Forum assembly artwork", kind: "IMAGE", category: "Hero", url: "/media/site/hero-assembly.svg", photographer: CREDIT, copyright: "© 2026 FFDGN", altText: "Forum assembly illustration" },
    { title: "36 states, one Forum", kind: "IMAGE", category: "Site", url: "/media/site/map-states.svg", photographer: CREDIT, copyright: "© 2026 FFDGN", altText: "Stylised map showing representation across 36 states" },
    { title: "State–Federal collaboration", kind: "IMAGE", category: "Press", url: "/media/news/collaboration.svg", photographer: CREDIT, copyright: "© 2026 FFDGN", altText: "News artwork on state–federal collaboration" },
    { title: "Strategic partnerships", kind: "IMAGE", category: "Press", url: "/media/news/partnership.svg", photographer: CREDIT, copyright: "© 2026 FFDGN", altText: "News artwork on strategic partnerships" },
    { title: "Strategic meeting", kind: "IMAGE", category: "Press", url: "/media/news/meeting.svg", photographer: CREDIT, copyright: "© 2026 FFDGN", altText: "News artwork on the strategic meeting" },
    { title: "Communiqué published", kind: "IMAGE", category: "Press", url: "/media/news/communique.svg", photographer: CREDIT, copyright: "© 2026 FFDGN", altText: "News artwork on the published communiqué" },
  ];
  // NOTE: scoped to /media/* so a reseed never wipes Secretariat-synced /assets/* rows.
  await prisma.mediaAsset.deleteMany({ where: { photographer: CREDIT, url: { startsWith: "/media/" } } });
  for (const r of mediaRows) {
    await prisma.mediaAsset.create({
      data: {
        title: r.title, kind: r.kind, category: r.category, url: r.url,
        photographer: r.photographer, copyright: r.copyright, altText: r.altText,
        eventId: r.eventSlug ? eventBySlug.get(r.eventSlug) ?? null : null,
      },
    });
  }

  // Baseline audit entries.
  await prisma.auditLog.createMany({
    data: [
      { actorId: secretariat.id, actorName: secretariat.name, action: "seed.baseline", resource: "database", ip: "local", newValue: "Institutional baseline loaded" },
      { actorId: secretariat.id, actorName: secretariat.name, action: "members.status.change", resource: "Member: ngozi-eze", ip: "local", previousValue: "Pending", newValue: "Associate" },
    ],
  });

  const counts = {
    users: await prisma.user.count(), members: await prisma.member.count(),
    events: await prisma.forumEvent.count(), documents: await prisma.knowledgeDoc.count(),
    news: await prisma.newsArticle.count(), committees: await prisma.committee.count(),
  };
  console.log("Seed complete:", counts);
  console.warn("⚠ Dev credentials are local-only. Rotate NEXTAUTH_SECRET and all passwords before any deployment.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
