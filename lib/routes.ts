/**
 * Every internal route in one place.
 *
 * The nav, the footer, the sitemap and `scripts/check-links.ts` all read from
 * this module. Before it existed the same paths were retyped in four files, and
 * the conference banner pointed at a slug that 404'd — because nothing forced
 * the copies to agree. With the list here, `check-links.ts` can assert every href
 * resolves, and `typedRoutes` makes a typo a build failure rather than a
 * 404 discovered after deploy.
 *
 * Query strings are part of the destination: `/knowledge?type=Report` is a
 * distinct link from `/knowledge`, and dropping the parameter silently shows
 * the wrong filtered list, which is worse than a 404 because it looks correct.
 */
import type { Route } from "next";

export interface NavChild {
  label: string;
  href: Route;
  desc: string;
}

export interface NavItem {
  label: string;
  href: Route;
  children: NavChild[];
}

/** Static routes that should appear in the sitemap. */
export const STATIC_ROUTES = [
  "/",
  "/about",
  "/about/history",
  "/about/governance",
  "/leadership",
  "/members",
  "/events",
  "/knowledge",
  "/news",
  "/committees",
  "/peer-review",
  "/mentorship",
  "/partnerships",
  "/programs",
  "/polish-nigeria",
  "/renewed-hope",
  "/media/photos",
  "/media/videos",
  "/contact",
  "/accessibility",
  "/privacy",
  "/search",
  "/sitemap",
] as const satisfies readonly Route[];

export type StaticRoute = (typeof STATIC_ROUTES)[number];

/** Conference destination, shared by the nav entry and the announcement banner. */
export const CONFERENCE_TITLE = "Annual Conference 2026";
export const CONFERENCE_HREF = "/events/fifth-national-conference-2026" as Route;
export const CONFERENCE_LABEL = "20–21 October 2026 · Abuja";
/** Banner copy: the nav's short form plus the venue. */
export const CONFERENCE_BANNER_DETAIL = "20–21 October 2026 · Abuja Continental Hotel";

export const NAV: NavItem[] = [
  {
    label: "The Forum",
    href: "/about",
    children: [
      { label: "About the Forum", href: "/about", desc: "Mandate, identity and purpose" },
      { label: "History", href: "/about/history", desc: "Institutional memory through the years" },
      { label: "Governance", href: "/about/governance", desc: "How the Forum is governed" },
      { label: "Leadership", href: "/leadership", desc: "Hierarchy and office holders" },
      { label: "Membership", href: "/members", desc: "Who belongs to the Forum" },
      { label: "Secretariat", href: "/contact", desc: "Operational arm of the Forum" },
    ],
  },
  {
    label: "Programs",
    href: "/programs",
    children: [
      { label: "Polish Nigeria", href: "/polish-nigeria", desc: "Bilateral trade, investment and exchange" },
      { label: "Renewed Hope", href: "/renewed-hope", desc: "Peer review of the Renewed Hope Agenda" },
    ],
  },
  {
    label: "Policy & Knowledge",
    href: "/knowledge",
    children: [
      { label: "Knowledge Centre", href: "/knowledge", desc: "All publications and documents" },
      { label: "Policy Recommendations", href: "/knowledge?type=Policy Brief", desc: "Evidence-based recommendations" },
      { label: "Communiqués", href: "/knowledge?type=Communiqué", desc: "Official conference outcomes" },
      { label: "Reports & Research", href: "/knowledge?type=Report", desc: "Studies and institutional reports" },
    ],
  },
  {
    label: "Members",
    href: "/members",
    children: [
      { label: "Member Directory", href: "/members", desc: "Searchable institutional database" },
      { label: "Leadership", href: "/leadership", desc: "Current office holders" },
      { label: "How to Join", href: "/members#join", desc: "Membership information" },
    ],
  },
  {
    label: "Events & Conferences",
    href: "/events",
    children: [
      { label: "Upcoming Events", href: "/events", desc: "Conferences, dialogues, roundtables" },
      { label: CONFERENCE_TITLE, href: CONFERENCE_HREF, desc: CONFERENCE_LABEL },
      { label: "Conference Archive", href: "/events", desc: "Past convenings and records" },
    ],
  },
  {
    label: "Engagement",
    href: "/committees",
    children: [
      { label: "Committees", href: "/committees", desc: "Working arms of the Forum" },

      { label: "Peer Review", href: asRoute("/peer-review"), desc: "Accountability and shared learning" },
      { label: "Mentorship", href: asRoute("/mentorship"), desc: "Experience supporting leadership" },
    ],
  },
  {
    label: "News & Media",
    href: "/news",
    children: [
      { label: "Latest News", href: "/news", desc: "Institutional updates" },
      { label: "Press Releases", href: "/news?cat=Press Release", desc: "Formal communications" },
      { label: "Statements", href: "/news?cat=Statement", desc: "Official positions" },
      { label: "Photo Gallery", href: "/media/photos", desc: "Structured conference photography" },
      { label: "Video Archive", href: "/media/videos", desc: "Recordings and statements" },
    ],
  },
];

export const FOOTER_COLUMNS: { heading: string; links: { label: string; href: Route }[] }[] = [
  {
    heading: "The Forum",
    links: [
      { label: "About", href: "/about" },
      { label: "Leadership", href: "/leadership" },
      { label: "Governance", href: "/about/governance" },
      { label: "Membership", href: "/members" },
      { label: "Secretariat", href: "/contact" },
    ],
  },
  {
    heading: "Knowledge",
    links: [
      { label: "Publications", href: "/knowledge" },
      { label: "Policy", href: "/knowledge?type=Policy Brief" },
      { label: "Reports", href: "/knowledge?type=Report" },
      { label: "Communiqués", href: "/knowledge?type=Communiqué" },
      { label: "Knowledge Centre", href: "/knowledge" },
    ],
  },
  {
    heading: "Engagement",
    links: [
      { label: "Events", href: "/events" },
      { label: "Committees", href: "/committees" },

      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "News & Media", href: "/news" },
      { label: "Search", href: "/search" },
      { label: "Sitemap", href: "/sitemap" },
      { label: "Privacy", href: "/privacy" },
      { label: "Accessibility", href: "/accessibility" },
    ],
  },
];

/**
 * Portal destinations.
 *
 * /portal is a single optional-catch-all route (`[[...section]]`), so any
 * sub-path renders. Next's generated route type only covers the literal
 * template and not the arbitrary segments it accepts, hence the casts — the
 * paths are asserted against the DB-backed link check rather than the compiler.
 */
export const PORTAL_ROOT = "/portal" as Route;
export const PORTAL_LINKS: { label: string; href: Route; desc: string }[] = [
  { label: "Member Directory", href: "/portal/members" as Route, desc: "Private directory with visibility controls" },
  { label: "Events", href: "/portal/events" as Route, desc: "Registrations and conference records" },
  { label: "Documents", href: "/portal/documents" as Route, desc: "Secure, permissioned library" },
  { label: "Committees", href: "/portal/committees" as Route, desc: "Workspaces, meetings, recommendations" },
  { label: "Discussions", href: "/portal/discussions" as Route, desc: "Threads, mentions, moderation" },
  { label: "Notifications", href: "/portal/notifications" as Route, desc: "Mentions, meetings, publications" },
  { label: "Profile & Settings", href: "/portal/profile" as Route, desc: "Password, visibility, 2FA" },
];

/** Where a signed-in user lands: staff to the console, members to the portal. */
export function landingFor(role: string | undefined): Route {
  if (role === "guest_desk") return "/admin/events/operations" as Route;
  return role && ["member", "associate"].includes(role) ? PORTAL_ROOT : ("/admin" as Route);
}

export function isMemberRole(role: string | undefined): boolean {
  return Boolean(role && ["member", "associate"].includes(role));
}

/**
 * Assert a dynamically-composed path as a `Route`.
 *
 * For hrefs built from database slugs (`/members/${slug}`) or CMS-editable
 * fields, the compiler cannot prove the result is a real route. Use this where
 * the value is constructed rather than typed out. It is deliberately NOT a
 * validator — it silences the type, and `check-links.ts` is what proves the
 * paths resolve. Do not use it to launder an unchecked user-supplied URL into
 * an href; that is a stored-XSS/open-redirect hole, not a typing gap.
 */
export function asRoute(path: string): Route {
  return path as Route;
}

/** Every distinct internal href the chrome can emit, for link checking. */
export function chromeLinks(): string[] {
  const fromNav = NAV.flatMap((item) => [item.href, ...item.children.map((c) => c.href)]);
  const fromFooter = FOOTER_COLUMNS.flatMap((c) => c.links.map((l) => l.href));
  return [...new Set([...fromNav, ...fromFooter])];
}
