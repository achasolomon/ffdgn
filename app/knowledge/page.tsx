import Link from "next/link";
import { ArrowRight, Download, Lock } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, EmptyState, Reveal } from "@/components/ui";
import { AssetImage } from "@/components/media";
import { listDocs } from "@/lib/repo";

const COVERS: Record<string, string> = {
  "Communiqué": "/assets/news/2024-communique-publication.jpg",
  "Policy Brief": "/assets/news/state-federal-collaboration-call.jpg",
  "Report": "/assets/events/3rd-annual-conference.jpg",
  "Research": "/assets/news/strategic-meeting-2025.jpg",
  "Position Paper": "/assets/news/polish-nigeria-partnership.jpg",
  "Speech": "/assets/gallery/gallery8.jpg",
};
const coverFor = (type: string) => COVERS[type] ?? "/assets/hero/national.jpg";

export default async function KnowledgePage({ searchParams }: { searchParams: { type?: string; q?: string; year?: string; sort?: string } }) {
  const type = searchParams.type ?? "";
  const year = searchParams.year ?? "";
  const sort = searchParams.sort ?? "newest";
  const q = (searchParams.q ?? "").toLowerCase();
  const documents = await listDocs();
  const pub = documents.filter((d) => d.status === "Published" && d.visibility === "PUBLIC");

  const years = [...new Set(pub.map((d) => d.year))].sort((a, b) => b - a);
  const topics = [...new Set(pub.map((d) => d.topic))].sort();
  const types = [...new Set(pub.map((d) => d.type))].sort();

  const filtered = pub
    .filter((d) =>
      (!type || d.type === type) &&
      (!year || String(d.year) === year) &&
      (!q || `${d.title} ${d.topic} ${d.author}`.toLowerCase().includes(q))
    )
    .sort((a, b) => sort === "downloads"
      ? b.downloads - a.downloads
      : b.year - a.year || b.published.localeCompare(a.published));

  const [featured, ...rest] = sort === "newest" && !type && !year && !q ? filtered : [];
  const list = featured ? rest : filtered;
  const restricted = documents.length - pub.length;

  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "Knowledge Centre" }]} />
      <SectionHeading
        eyebrow="Policy & knowledge"
        title="The Knowledge Centre"
        lede="Communiqués, policy briefs, reports and research — each with author, topic, year, related event and version. Restricted records remain visible only to authorised members."
      />

      {/* Intelligence strip */}
      <div className="mt-8 grid grid-cols-2 gap-px border hairline bg-ink/10 md:grid-cols-4" role="status" aria-label="Collection totals">
        {[
          [String(pub.length), "Public records"],
          [String(pub.filter((d) => d.type === "Communiqué").length), "Communiqués"],
          [String(pub.filter((d) => d.type === "Policy Brief").length), "Policy briefs"],
          [String(pub.reduce((n, d) => n + d.downloads, 0).toLocaleString()), "Downloads served"],
        ].map(([v, l]) => (
          <div key={l} className="bg-white px-5 py-4">
            <p className="font-display text-3xl text-forest-950">{v}</p>
            <p className="text-[12px] font-medium uppercase tracking-wider text-ink/55">{l}</p>
          </div>
        ))}
      </div>

      {/* Featured publication */}
      {featured && (
        <Reveal>
          <article className="mt-8 grid overflow-hidden border border-gold/60 bg-forest-950 text-white lg:grid-cols-[280px_1fr]">
            <div className="relative min-h-[220px]">
              <AssetImage src={coverFor(featured.type)} alt="" width={560} height={440} className="absolute inset-0 h-full w-full object-cover" sizes="(max-width: 1024px) 100vw, 280px" />
            </div>
            <div className="p-7 md:p-9">
              <p className="eyebrow-light">Featured {featured.type} · {featured.year}</p>
              <h2 className="font-display mt-2 text-3xl leading-tight">
                <Link href={`/knowledge/${featured.slug}`} className="hover:text-gold">{featured.title}</Link>
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">{featured.summary}</p>
              <p className="mt-3 text-[12.5px] uppercase tracking-wider text-white/50">
                {featured.author} · {featured.pages} pp · {featured.size} · {featured.downloads.toLocaleString()} downloads
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {featured.fileUrl ? (
                  <a href={featured.fileUrl} download aria-label={`Download PDF, ${featured.size}`}
                    className="inline-flex items-center gap-2 bg-gold px-5 py-2.5 text-sm font-bold text-forest-950 hover:bg-gold-soft">
                    <Download size={15} /> Download PDF
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 border border-white/30 px-5 py-2.5 text-sm text-white/60">
                    <Download size={15} /> PDF not yet uploaded
                  </span>
                )}
                <Link href={`/knowledge/${featured.slug}`} className="inline-flex items-center gap-2 border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:border-gold hover:text-gold">
                  Record details <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </article>
        </Reveal>
      )}

      {/* Collections */}
      <div className="mt-10">
        <h2 className="font-display text-2xl text-forest-950">Browse by collection</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((t) => {
            const n = pub.filter((d) => d.type === t).length;
            const active = type === t;
            return (
              <Link
                key={t}
                href={active ? "/knowledge" : `/knowledge?type=${encodeURIComponent(t)}`}
                aria-current={active || undefined}
                className={`group flex items-center gap-4 border bg-white p-4 hover:shadow-card ${active ? "border-primary" : "hairline"}`}
              >
                <span className="block h-14 w-[72px] shrink-0 overflow-hidden border hairline" aria-hidden>
                  <AssetImage src={coverFor(t)} alt="" width={144} height={112} className="h-full w-full object-cover" sizes="72px" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-forest-950 group-hover:text-primary">{t}s</span>
                  <span className="block text-[12.5px] text-ink/55">{n} record{n === 1 ? "" : "s"}{active ? " · showing" : ""}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-ink/30 group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Search + filters */}
      <form className="mt-10 grid gap-3 border hairline bg-white p-4 md:grid-cols-[1fr_180px_140px_150px_auto]" role="search" aria-label="Knowledge search">
        <label htmlFor="kq" className="sr-only">Search publications</label>
        <input id="kq" name="q" defaultValue={searchParams.q ?? ""} placeholder="Search title, topic, author…" className="border hairline px-4 py-2.5 text-sm" />
        <select name="type" defaultValue={type} className="border hairline bg-white px-3 py-2.5 text-sm" aria-label="Filter by type">
          <option value="">All types</option>{types.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select name="year" defaultValue={year} className="border hairline bg-white px-3 py-2.5 text-sm" aria-label="Filter by year">
          <option value="">All years</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select name="sort" defaultValue={sort} className="border hairline bg-white px-3 py-2.5 text-sm" aria-label="Sort by">
          <option value="newest">Newest first</option>
          <option value="downloads">Most downloaded</option>
        </select>
        <button className="bg-primary px-6 py-2.5 text-sm font-semibold text-white">Search</button>
      </form>
      {(type || year || q) && (
        <p className="mt-3 text-[13px]">
          <Link href="/knowledge" className="font-semibold text-primary">Clear filters ✕</Link>
          <span className="text-ink/55"> · {[
            type && `type: ${type}`, year && `year: ${year}`, q && `“${searchParams.q}”`,
          ].filter(Boolean).join(" · ")}</span>
        </p>
      )}

      {/* Topics */}
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Browse by topic">
        {topics.map((t) => (
          <Link key={t} href={`/knowledge?q=${encodeURIComponent(t)}`} className="border hairline bg-paper px-3 py-1.5 text-[12.5px] font-medium text-ink/70 hover:border-primary hover:text-primary">
            {t}
          </Link>
        ))}
      </div>

      {/* Results */}
      <p className="mt-6 text-[13px] text-ink/55" role="status">
        {featured ? `${list.length} more record${list.length === 1 ? "" : "s"}` : `${filtered.length} of ${pub.length} public records`}
      </p>
      {list.length === 0 ? (
        <div className="mt-4"><EmptyState title="No documents found" body="Try a different term, type or year. Some records are restricted to members or committees." /></div>
      ) : (
        <ul className="mt-4 divide-y divide-ink/10 border-y hairline bg-white">
          {list.map((d) => (
            <li key={d.slug}>
              <Link href={`/knowledge/${d.slug}`} className="grid gap-4 px-5 py-4 hover:bg-paper sm:grid-cols-[120px_1fr_auto] sm:items-center md:px-6 md:py-5">
                <span className="hidden h-[74px] w-[120px] overflow-hidden border hairline sm:block" aria-hidden>
                  <AssetImage src={coverFor(d.type)} alt="" width={240} height={148} className="h-full w-full object-cover" sizes="120px" />
                </span>
                <span className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-deep">{d.type} · {d.year} · {d.topic}</span>
                  <span className="mt-0.5 block truncate font-semibold text-forest-950">{d.title}</span>
                  <span className="mt-0.5 block text-[13px] text-ink/55">{d.author}</span>
                </span>
                <span className="flex items-center gap-4 text-[12.5px] text-ink/50 sm:justify-end">
                  <span className="md:text-right">{d.pages} pp · {d.size}<span className="block">{d.downloads.toLocaleString()} downloads</span></span>
                  <span className="inline-flex items-center gap-1.5 border border-primary/30 px-3 py-1.5 font-semibold text-primary"><Download size={13} /> PDF</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Restricted notice */}
      {restricted > 0 && (
        <div className="mt-8 flex items-start gap-3 border border-gold/60 bg-paper p-5 text-sm" role="note">
          <Lock size={16} className="mt-0.5 shrink-0 text-gold-deep" />
          <p className="text-ink/70">
            <strong className="text-forest-950">{restricted} record{restricted === 1 ? " is" : "s are"} restricted</strong> (under review or members-only).
            <Link href="/login" className="font-semibold text-primary"> Sign in via the member portal </Link>
            to request access.</p>
        </div>
      )}
    </div>
  );
}
