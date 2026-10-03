import Link from "next/link";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, EmptyState } from "@/components/ui";
import { searchAll } from "@/lib/repo";
import { asRoute } from "@/lib/routes";
import { listPublishedWebsitePages } from "@/lib/website-repo";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q ?? "";
  const records = q ? await searchAll(q) : null;
  const pages = q ? (await listPublishedWebsitePages()).filter(({page})=>`${page.title} ${page.introduction} ${page.sections.filter(section=>!section.hidden).map(section=>`${section.title} ${section.body}`).join(" ")}`.toLowerCase().includes(q.trim().toLowerCase())).map(({page})=>({title:page.title,subtitle:page.introduction,href:page.path})) : [];
  const results = records ? {...records,"Website pages":pages} : null;
  const total = results ? Object.entries(results).filter(([kind]) => kind !== "Partnerships").map(([,hits]) => hits).reduce((n, r) => n + r.length, 0) : 0;
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "Search" }]} />
      <SectionHeading as="h1" eyebrow="Knowledge search" title="Search the institution" lede="One query across members, events, documents, news, committees." />
      <form className="mt-8 flex gap-2" role="search">
        <label htmlFor="sq" className="sr-only">Search</label>
        <input id="sq" name="q" defaultValue={q} placeholder='Try "health", "federal", "conference"…' className="w-full border hairline bg-white px-4 py-3 text-[15px]" />
        <button className="shrink-0 bg-primary px-6 py-3 text-sm font-semibold text-white">Search</button>
      </form>
      {results && (
        <p className="mt-4 text-[13px] text-ink/55" role="status">{total} results for “{q}”</p>
      )}
      {results && total === 0 && <div className="mt-6"><EmptyState title="No results" body="Try a broader term, or browse the Knowledge Centre, directory and events directly." /></div>}
      {results && Object.entries(results).filter(([kind]) => kind !== "Partnerships").map(([kind, hits]) => hits.length > 0 && (
        <section key={kind} className="mt-8" aria-label={kind}>
          <h2 className="eyebrow">{kind} · {hits.length}</h2>
          <ul className="mt-3 divide-y divide-ink/10 border-y hairline bg-white">
            {hits.map((h, i) => <li key={i}><Link href={asRoute(h.href)} className="block px-5 py-3 hover:bg-paper"><span className="font-semibold text-forest-950">{h.title}</span><span className="block text-[13px] text-ink/55">{h.subtitle}</span></Link></li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}
