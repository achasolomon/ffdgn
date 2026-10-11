import { asRoute as templateRoute } from "@/lib/routes";
import { getTemplateCopy } from "@/lib/template-repo";
import { managedWebsitePage } from "@/components/website-page";
import { websiteMetadata } from "@/lib/website-repo";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/chrome";
import { AssetImage } from "@/components/media";
import { getSpeakerRepo, listSpeakers } from "@/lib/repo";
import { asRoute } from "@/lib/routes";

export default async function SpeakerPage({ params }: { params: Promise<{ slug: string }> }) {
  const copy = await getTemplateCopy("page-speakers-slug");

  const { slug } = await params;
  const managed = await managedWebsitePage(`/speakers/${slug}`);
  if (managed) return managed;
  const s = await getSpeakerRepo(slug);
  if (!s) notFound();
  const peers = (await listSpeakers(s.eventSlug)).filter((p) => p.slug !== s.slug).slice(0, 4);
  const initials = s.name.replace(/^(Prof\.|Dr|H\.E\.)\s+/, "").split(" ").map((w) => w[0]).slice(0, 2).join("");

  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[
        { label: copy("field-001"), href: templateRoute(copy("field-002")) },
        ...(s.eventSlug ? [{ label: s.eventTitle ?? "Conference", href: asRoute(`/events/${s.eventSlug}`) }] : []),
        { label: s.name },
      ]} />
      <div className="mt-8 grid gap-8 md:grid-cols-[240px_1fr]">
        {s.photo ? (
          <AssetImage src={s.photo} alt={copy("field-008", {value1: s.name})} width={480} height={480} className="h-52 w-52 rounded-full object-cover ring-2 ring-gold/60" sizes="208px" priority />
        ) : (
          <span className="grid h-52 w-52 place-items-center rounded-full bg-forest-950 font-display text-6xl text-gold ring-2 ring-gold/60" aria-hidden>
            {initials}
          </span>
        )}
        <div>
          {s.keynote && <p className="inline-block bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-forest-950">{copy("field-003")}</p>}
          <p className="eyebrow mt-3">{s.role}</p>
          <h1 className="font-display mt-1 text-4xl text-forest-950 md:text-5xl">{s.name}</h1>
          {s.org && <p className="mt-2 text-[15px] font-medium text-ink/60">{s.org}</p>}
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink/75">
            {s.bio ?? copy("field-009")}
          </p>
          {s.eventSlug && (
            <Link href={asRoute(`/events/${s.eventSlug}`)} className="mt-5 inline-flex items-center gap-2 border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary">
              <ArrowLeft size={15} /> {copy("field-004")}{s.eventTitle ?? copy("field-010")}
            </Link>
          )}
        </div>
      </div>

      {peers.length > 0 && (
        <section className="mt-14" aria-label={copy("field-005")}>
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl text-forest-950">{copy("field-005")}</h2>
            {s.eventSlug && <Link href={asRoute(`/events/${s.eventSlug}#speakers`)} className="text-sm font-semibold text-primary link-underline">{copy("field-006")}</Link>}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {peers.map((p) => (
              <Link key={p.slug} href={asRoute(`/speakers/${p.slug}`)} className="group border hairline bg-white p-5 text-center hover:shadow-card">
                {p.photo ? (
                  <AssetImage src={p.photo} alt={copy("field-008", {value1: p.name})} width={160} height={160} className="mx-auto h-20 w-20 rounded-full object-cover ring-1 ring-gold/60" sizes="80px" />
                ) : (
                  <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-forest-950 font-display text-2xl text-gold" aria-hidden>
                    {p.name.replace(/^(Prof\.|Dr|H\.E\.)\s+/, "").split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                )}
                <span className="mt-3 block text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{p.role}</span>
                <span className="mt-1 block font-display text-lg leading-tight text-forest-950 group-hover:text-primary">{p.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-8 flex items-center gap-2 text-[12.5px] text-ink/45"><CalendarDays size={14} /><MapPin size={14} /> {copy("field-007")}</p>
    </div>
  );
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const authored = await websiteMetadata(`/speakers/${slug}`);
  if (authored) return authored;
  const speaker = await getSpeakerRepo(slug);
  return { title: speaker?.name, description: speaker?.bio };
}
