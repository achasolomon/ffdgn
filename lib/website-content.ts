export const SECTION_TYPES = ["text", "image", "video", "cta", "cards", "table", "gallery", "collection", "contact"] as const;
export type SectionType = typeof SECTION_TYPES[number];
export const COLLECTIONS = ["events", "news", "members", "publications", "committees"] as const;
export type Collection = typeof COLLECTIONS[number];
export interface WebsiteItem { title: string; body: string; image: string; alt: string; href: string; }
export interface WebsiteSection {
  id: string; type: SectionType; title: string; label: string; body: string;
  image: string; alt: string; caption: string; href: string; button: string;
  tone: "light" | "dark"; hidden: boolean; items: WebsiteItem[];
  columns: string[]; rows: string[][]; collection: Collection; limit: number;
}
export interface WebsitePage {
  layout?: "replace" | "extend";
  path: string; title: string; label: string; introduction: string; image: string; alt: string;
  seoTitle: string; description: string; sections: WebsiteSection[];
}
export interface WebsiteDraft { page: WebsitePage; version: number; savedAt: string; }
export interface WebsiteRecord { draft: WebsiteDraft; published?: WebsiteDraft; }
export const PAGE_CATALOG = [
  ["/", "Homepage"], ["/about", "About the Forum"], ["/about/history", "History"],
  ["/about/governance", "Governance"], ["/about/governance/board-of-trustees", "Board of Trustees"],
  ["/about/governance/secretariat", "Secretariat"], ["/leadership", "Leadership"], ["/members", "Membership"],
  ["/knowledge", "Policy & Knowledge"], ["/events", "Events & Conferences"], ["/news", "News"],
  ["/committees", "Committees"], ["/peer-review", "Peer Review"], ["/mentorship", "Mentorship"],
  ["/programs", "Programmes"], ["/polish-nigeria", "Polish Nigeria"], ["/renewed-hope", "Renewed Hope"],
  ["/media/photos", "Photo gallery"], ["/media/videos", "Video archive"], ["/contact", "Contact"],
  ["/privacy", "Privacy"], ["/accessibility", "Accessibility"],
] as const;
export function blankSection(type: SectionType, id: string): WebsiteSection {
  return {id,type,title:"",label:"",body:"",image:"",alt:"",caption:"",href:"",button:"Learn more",tone:"light",hidden:false,items:[],columns:[],rows:[],collection:"events",limit:6};
}
export function blankPage(path = "/new-page", title = "New page"): WebsitePage {
  return {path,title,label:"The Forum",introduction:"",image:"",alt:"",seoTitle:"",description:"",sections:[]};
}
export function validPagePath(path: unknown): path is string {
  return typeof path === "string" && path.length <= 100 && /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/.test(path) &&
    !/^\/(admin|api|portal|login|logout|uploads|assets|site-preview|_next|sitemap|robots|search)(\/|$)/.test(path);
}
export function safeContentLink(href: string): boolean {
  return href === "" || /^\/(?!\/)[A-Za-z0-9\-_/.?=&%#]*$/.test(href) || /^#[A-Za-z0-9_-]+$/.test(href) || /^https:\/\/[^\s\\<>"']+$/.test(href) || /^mailto:[^\s<>"']+@[^\s<>"']+$/.test(href) || /^tel:[+\d\s()-]+$/.test(href);
}
export function websiteVideoSource(href: string): { src: string; embedded: boolean } | null {
  if (/^\/(?!\/)[\w/.-]+\.(mp4|webm)$/i.test(href)) return { src: href, embedded: false };
  try {
    const url = new URL(href);
    if (url.protocol !== "https:") return null;
    if (["www.youtube.com", "youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(url.hostname)) {
      const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)$/)?.[1];
      if (id && /^[\w-]{11}$/.test(id)) return { src: `https://www.youtube-nocookie.com/embed/${id}`, embedded: true };
    }
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(url.hostname)) {
      const id = url.pathname.match(/^\/(?:video\/)?(\d+)$/)?.[1];
      if (id) return { src: `https://player.vimeo.com/video/${id}`, embedded: true };
    }
  } catch {}
  return null;
}
function text(value: unknown, max: number): value is string { return typeof value === "string" && value.length <= max; }
export function validateWebsitePage(value: unknown): string | null {
  if (!value || typeof value !== "object") return "Provide a page document.";
  const page = value as WebsitePage;
  if (page.layout !== undefined && !["replace", "extend"].includes(page.layout)) return "Choose how these sections appear on the page.";
  if (!validPagePath(page.path)) return "Choose a lowercase page URL outside the administration and system routes.";
  if (!text(page.title,255) || !page.title.trim()) return "A page title is required (up to 255 characters).";
  if (!text(page.label,128) || !text(page.introduction,5000) || !text(page.seoTitle,255) || !text(page.description,5000) || !text(page.image,255) || !text(page.alt,500)) return "Page fields exceed their limits.";
  if (page.image && (!/^\/(?!\/)[\w/.-]+$/.test(page.image) || !page.alt.trim())) return "Choose a local header image and enter its description.";
  if (!Array.isArray(page.sections) || page.sections.length > 60) return "A page may contain up to 60 sections.";
  const ids = new Set<string>();
  for (const section of page.sections) {
    if (!section || !SECTION_TYPES.includes(section.type) || !text(section.id,80) || !/^[\w-]+$/.test(section.id) || ids.has(section.id)) return "Every section needs a unique identifier and supported type.";
    ids.add(section.id);
    if (!text(section.title,255) || !text(section.label,128) || !text(section.body,16000) || !text(section.image,255) || !text(section.alt,500) || !text(section.caption,1000) || !text(section.href,500) || !text(section.button,100)) return "Section fields exceed their limits.";
    if (!safeContentLink(section.href) || !["light","dark"].includes(section.tone) || typeof section.hidden !== "boolean") return "Check section links and appearance.";
    if (section.type === "video" && section.href && !websiteVideoSource(section.href)) return "Choose a local MP4/WebM file or a YouTube/Vimeo video URL.";
    if (section.image && (!/^\/(?!\/)[\w/.-]+$/.test(section.image) || !section.alt.trim())) return "Section images need a local image path and description.";
    if (!COLLECTIONS.includes(section.collection) || !Number.isInteger(section.limit) || section.limit < 1 || section.limit > 50) return "Choose a valid collection and item limit (1–50).";
    if (!Array.isArray(section.items) || section.items.length > 50 || section.items.some(item => !item || !text(item.title,255) || !text(item.body,5000) || !text(item.image,255) || !text(item.alt,500) || !text(item.href,500) || !safeContentLink(item.href) || (item.image && (!/^\/(?!\/)[\w/.-]+$/.test(item.image) || !item.alt.trim())))) return "Check card/gallery text, image descriptions and links.";
    if (!Array.isArray(section.columns) || section.columns.length > 12 || section.columns.some(column => !text(column,255)) || !Array.isArray(section.rows) || section.rows.length > 100 || section.rows.some(row => !Array.isArray(row) || row.length !== section.columns.length || row.some(cell => !text(cell,2000)))) return "Table rows must match the column headings.";
  }
  if (new TextEncoder().encode(JSON.stringify(page)).length > 55000) return "This page is too large. Split lengthy content into separate pages.";
  return null;
}
