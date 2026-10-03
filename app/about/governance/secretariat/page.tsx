import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, Phone } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, Reveal } from "@/components/ui";
import { AssetImage } from "@/components/media";
import { getSettings, listLeadership, listMembers } from "@/lib/repo";

const FUNCTIONS = [
  ["Administration", "Membership records, meetings, logistics and day-to-day operations of the Forum."],
  ["Research & knowledge", "Policy support, publications pipeline and the Knowledge Centre."],
  ["Communications", "Official statements, press relations, website and media library."],
  ["Conference delivery", "Planning and delivery of the national conference and dialogue programmes."],
];

export async function generateMetadata(): Promise<Metadata> {
 const authored = await websiteMetadata("/about/governance/secretariat");
 return authored ?? { title: "Secretariat" };
}

export default async function SecretariatPage() {
  const managed = await managedWebsitePage("/about/governance/secretariat");
  if (managed) return managed;

  const [leadership, members, settings] = await Promise.all([listLeadership(), listMembers(), getSettings()]);
  const bySlug = new Map(members.map((m) => [m.slug, m]));
  const dgSeat = leadership.find((l) => l.role === "Director-General");
  const dg = dgSeat?.member ? bySlug.get(dgSeat.member.slug) : undefined;

  return (
    <div className="secretariat-page mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "About", href: "/about" }, { label: "Governance", href: "/about/governance" }, { label: "Secretariat" }]} />
      <SectionHeading as="h1" eyebrow="Governance" title="The Secretariat" lede="The operational arm of the Forum — administration, research, communications and conference delivery." />

      {dg && (
        <Reveal>
          <div className="secretariat-lead mt-8 grid gap-6 bg-forest-950 p-6 text-white md:grid-cols-[160px_1fr] md:p-8">
            {dg.photo ? (
              <AssetImage src={dg.photo} alt={`Portrait of ${dg.name}`} width={320} height={320} className="h-48 w-36 object-cover object-top" sizes="144px" />
            ) : (
              <span className="grid h-36 w-36 place-items-center rounded-full bg-forest-900 font-display text-4xl text-gold" aria-hidden>
                {dg.name.replace("Dr ", "")[0]}
              </span>
            )}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Director-General</p>
              <h2 className="font-display mt-1 text-3xl">{dg.name}</h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/75">{dg.bio}</p>
              <Link href={`/members/${dg.slug}`} className="mt-4 inline-block text-sm font-semibold text-gold link-underline">Full profile →</Link>
            </div>
          </div>
        </Reveal>
      )}

      <h2 className="font-display mt-10 text-2xl text-forest-950">What the Secretariat does</h2>
      <div className="secretariat-functions mt-6 grid gap-4 sm:grid-cols-2">
        {FUNCTIONS.map(([t, d]) => (
          <div key={t} className="border hairline bg-white p-6">
            <h3 className="font-semibold text-forest-950">{t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/65">{d}</p>
          </div>
        ))}
      </div>

      <div className="secretariat-contact mt-10 flex flex-col gap-5 p-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-ink/70">
          <p className="flex items-center gap-2"><Phone size={14} className="text-primary" /> {settings["site.phone"]}</p>
          <p className="mt-1 flex items-center gap-2"><Mail size={14} className="text-primary" /> {settings["site.email"]}</p>
        </div>
        <Link href="/contact" className="inline-flex shrink-0 items-center gap-2 bg-primary px-5 py-2.5 text-sm font-semibold text-white">Contact the Secretariat <ArrowRight size={15} /></Link>
      </div>
    </div>
  );
}

export const revalidate = 300;
