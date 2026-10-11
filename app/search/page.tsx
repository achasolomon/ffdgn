import { getTemplateCopy } from "@/lib/template-repo";
import Link from "next/link";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, EmptyState } from "@/components/ui";
import { searchAll } from "@/lib/repo";
import { asRoute } from "@/lib/routes";
import { listPublishedWebsitePages } from "@/lib/website-repo";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const copy = await getTemplateCopy("page-search");

  const q = (await searchParams).q ?? "";
  const records = q ? await searchAll(q) : null;
  const pages = q ? (await listPublishedWebsitePages()).filter(({page})=>`${page.title} ${page.introduction} ${page.sections.filter(section=>!section.hidden).map(section=>`${section.title} ${section.body}`).join(" ")}`.toLowerCase().includes(q.trim().toLowerCase())).map(({page})=>({title:page.title,subtitle:page.introduction,href:page.path})) : [];
  const results = records ? {...records,"Website pages":pages} : null;
  const total = results ? Object.entries(results).filter(([kind]) => kind !== "Partnerships").map(([,hits]) => hits).reduce((n, r) => n + r.length, 0) : 0;
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: copy("field-001") }]} />
      <SectionHeading as="h1" eyebrow={copy("field-002")} title={copy("field-003")} lede={copy("field-004")} />
      <form className="mt-8 flex gap-2" role="search">
        <label htmlFor="sq" className="sr-only">{copy("field-001")}</label>
        <input id="sq" name="q" defaultValue={q} placeholder={copy("field-005")} className="w-full border hairline bg-white px-4 py-3 text-[15px]" />
        <button className="shrink-0 bg-primary px-6 py-3 text-sm font-semibold text-white">{copy("field-001")}</button>
      </form>
      {results && (
        <p className="mt-4 text-[13px] text-ink/55" role="status">{total} {copy("field-006")}{q}{copy("field-007")}</p>
      )}
      {results && total === 0 && <div className="mt-6"><EmptyState title={copy("field-008")} body="Try a broader term, or browse the Knowledge Centre, directory and events directly." /></div>}
      {results && Object.entries(results).filter(([kind]) => kind !== "Partnerships").map(([kind, hits]) => hits.length > 0 && (
        <section key={kind} className="mt-8" aria-label={kind}>
          <h2 className="eyebrow">{kind} {copy("field-009")}{hits.length}</h2>
          <ul className="mt-3 divide-y divide-ink/10 border-y hairline bg-white">
            {hits.map((h, i) => <li key={i}><Link href={asRoute(h.href)} className="block px-5 py-3 hover:bg-paper"><span className="font-semibold text-forest-950">{h.title}</span><span className="block text-[13px] text-ink/55">{h.subtitle}</span></Link></li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}
