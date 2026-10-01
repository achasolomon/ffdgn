import { committees, documents, events, members, news, partnerships } from "./data";

export interface SearchHit { kind: string; title: string; subtitle: string; href: string; }

export function institutionalSearch(query: string): Record<string, SearchHit[]> {
  const q = query.trim().toLowerCase();
  if (!q) return {};
  const has = (...fields: (string | number | undefined)[]) =>
    fields.some((f) => String(f ?? "").toLowerCase().includes(q));
  return {
    Members: members.filter((m) => has(m.name, m.title)).map((m) => ({
      kind: "Members", title: m.name, subtitle: m.title, href: `/members/${m.slug}`,
    })),
    Events: events.filter((e) => has(e.title, e.theme, e.city)).map((e) => ({
      kind: "Events", title: e.title, subtitle: `${e.theme} · ${e.city}`, href: `/events/${e.slug}`,
    })),
    Publications: documents.filter((d) => has(d.title, d.topic, d.type)).map((d) => ({
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

export function formatDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
