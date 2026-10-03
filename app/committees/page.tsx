import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, Reveal } from "@/components/ui";
import { AssetImage } from "@/components/media";
import { listCommittees, listMembers } from "@/lib/repo";

export async function generateMetadata(): Promise<Metadata> {
 const authored = await websiteMetadata("/committees");
 return authored ?? { title: "Committees" };
}
export default async function CommitteesPage() {
  const managed = await managedWebsitePage("/committees");
  if (managed) return managed;

  const committees = await listCommittees();
  const members = await listMembers();
  const bySlug = new Map(members.map((m) => [m.slug, m]));
  return (
    <div className="committees-page mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "Engagement" }, { label: "Committees" }]} />
      <SectionHeading as="h1" eyebrow="Engagement" title="Experience put to work." lede="The working arms of the Forum — chaired by members, producing recommendations, reports and policy." />
      <div className="engagement-paths"><Link href="/peer-review">Peer review <ArrowRight size={18} /></Link><Link href="/mentorship">Mentorship <ArrowRight size={18} /></Link></div>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {committees.map((c, i) => {
          const chair = bySlug.get(c.chair);
          const avatars = c.members.slice(0, 5).map((s) => bySlug.get(s)).filter((m) => m?.photo);
          return (
            <Reveal key={c.slug} delay={Math.min(i * 0.05, 0.2)}>
              {/* `id` is the anchor institutional search links to (`/committees#slug`),
                  so a search hit lands on the specific committee rather than the top
                  of a long list. */}
              <article id={c.slug} className="group flex h-full scroll-mt-28 gap-5 border hairline bg-white p-6 hover:shadow-card">
                {c.imageUrl ? (
                  <AssetImage src={c.imageUrl} alt={c.imageAlt ?? ""} width={160} height={160} className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-gold/60" sizes="80px" />
                ) : chair?.photo ? (
                  <AssetImage src={chair.photo} alt={`Portrait of ${chair.name}`} width={160} height={160} className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-gold/60" sizes="80px" />
                ) : (
                  <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-forest-950 font-display text-2xl text-gold" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-deep">{c.status}</p>
                  <h2 className="font-display mt-1 text-2xl leading-tight text-forest-950">{c.name}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink/65">{c.mandate}</p>
                  <p className="mt-3 text-[13px] text-ink/60">
                    Chair: {chair ? <Link href={`/members/${chair.slug}`} className="font-semibold text-primary">{chair.name}</Link> : c.chair} · {c.meetings} meetings
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    {avatars.length > 0 ? (
                      <span className="flex -space-x-2" aria-label={`${c.members.length} members`}>
                        {avatars.map((m) => (
                          <AssetImage key={m!.slug} src={m!.photo!} alt={m!.name} width={56} height={56} className="h-7 w-7 rounded-full border-2 border-white object-cover" sizes="28px" />
                        ))}
                        {c.members.length > avatars.length && (
                          <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-paper text-[10px] font-bold text-ink/60">+{c.members.length - avatars.length}</span>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink/55"><Users size={14} /> {c.members.length} members</span>
                    )}
                    <Link href={`/contact?subject=${encodeURIComponent(c.name)}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary">Enquire <ArrowRight size={14} /></Link>
                  </div>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

export const revalidate = 300; // CMS-driven: refresh from MySQL every 5 minutes
