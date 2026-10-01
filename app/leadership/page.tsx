import Link from "next/link";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading } from "@/components/ui";
import { AssetImage } from "@/components/media";
import { listLeadership } from "@/lib/repo";

export default async function LeadershipPage() {
  const leadership = await listLeadership();
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "Leadership" }]} />
      <SectionHeading eyebrow="Leadership" title="Guided by experience, united by purpose" lede="Presented as an institutional hierarchy — every seat links to a member profile, committees, events and publications." />
      <div className="mt-10 overflow-x-auto">
        <ol className="min-w-[640px] space-y-0 text-center">
          {leadership.map((l, i) => {
            if (!l.member) return null;
            return (
              <li key={l.role}>
                {i > 0 && <div className="mx-auto h-6 w-px bg-primary/30" aria-hidden />}
                <Link href={`/members/${l.member.slug}`} className={`mx-auto block max-w-md border px-6 py-5 hover:shadow-card ${i < 2 ? "border-gold/70 bg-paper" : "hairline bg-white"}`}>
                  {l.member.photo && (
                    <AssetImage src={l.member.photo} alt={`Portrait of ${l.member.name}`} width={192} height={192} className={`mx-auto rounded-full object-cover ring-2 ring-gold/60 ${i < 2 ? "h-28 w-28" : "h-24 w-24"}`} sizes="112px" />
                  )}
                  <p className="mt-3 text-[11px] font-bold uppercase leading-relaxed tracking-[0.18em] text-primary text-balance">{l.role}</p>
                  <p className="font-display mt-1 text-xl text-forest-950">{l.member.name}</p>
                  <p className="text-[13px] text-ink/60">{l.member.title}</p>
                  <p className="mx-auto mt-2 max-w-sm text-[12.5px] italic text-ink/50">{l.remit}</p>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="mt-8 text-sm text-ink/60">Seats are CMS-managed (Secretariat Console). Former leadership is archived in <Link href="/about/history" className="font-semibold text-primary">institutional memory</Link>.</p>
    </div>
  );
}

export const revalidate = 300; // CMS-driven: refresh from MySQL every 5 minutes
