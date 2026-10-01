import Link from "next/link";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, EmptyState } from "@/components/ui";
import { Gallery } from "@/components/media";
import { listMedia } from "@/lib/repo";

const CATS = ["Conference", "Portrait", "Press", "Site", "Hero"];

export default async function PhotosPage({ searchParams }: { searchParams: Promise<{ cat?: string; event?: string }> }) {
  const { cat = "", event } = await searchParams;
  const items = await listMedia({ kind: "IMAGE", ...(cat ? { category: cat } : {}), ...(event ? { eventSlug: event } : {}) });
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "News & Media", href: "/news" }, { label: "Photo Gallery" }]} />
      <SectionHeading eyebrow="Media" title="Photo gallery" lede="Structured galleries — every photograph carries title, credit and alt text. Conference photography is published after institutional review." />
      <div className="mt-6 flex flex-wrap gap-2 text-[13px]" role="navigation" aria-label="Filter by collection">
        <Link href="/media/photos" className={`border px-3 py-1.5 ${!cat ? "bg-primary text-white border-primary" : "border-ink/20 hover:border-primary"}`}>All</Link>
        {CATS.map((c) => (
          <Link key={c} href={`/media/photos?cat=${c}`} className={`border px-3 py-1.5 ${cat === c ? "bg-primary text-white border-primary" : "border-ink/20 hover:border-primary"}`}>{c}</Link>
        ))}
        <Link href="/media/videos" className="border border-gold/70 px-3 py-1.5 font-semibold text-gold-deep">Video archive →</Link>
      </div>
      <p className="mt-4 text-[13px] text-ink/55" role="status">{items.length} photographs{cat ? ` in ${cat}` : ""}</p>
      <div className="mt-6">
        {items.length ? <Gallery items={items} columns={4} /> : <EmptyState title="No photographs in this collection" body="The Secretariat publishes conference and press photography here after review." />}
      </div>
    </div>
  );
}

export const revalidate = 300;
