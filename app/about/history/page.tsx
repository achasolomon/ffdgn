import Link from "next/link";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading } from "@/components/ui";
import { listTimeline } from "@/lib/repo";

export default async function HistoryPage() {
  const timeline = await listTimeline();
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "About", href: "/about" }, { label: "History" }]} />
      <SectionHeading eyebrow="Institutional memory" title="The Forum through the years" lede="Year → event → people → documents → decisions → outcomes. The archive grows more valuable with every convening." />
      <ol className="mt-10 border-l-2 border-primary/25">
        {timeline.map((t) => (
          <li key={t.year} className="relative pb-10 pl-8">
            <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-gold ring-2 ring-primary/40" aria-hidden />
            <p className="font-display text-3xl text-forest-950">{t.year}</p>
            <h2 className="mt-1 font-semibold text-lg">{t.title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-ink/65">{t.summary}</p>
            <div className="mt-2 flex gap-3">{t.links.map((l) => <Link key={l.label} href={l.href} className="text-sm font-semibold text-primary link-underline">{l.label} →</Link>)}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export const revalidate = 300; // CMS-driven: refresh from MySQL every 5 minutes
