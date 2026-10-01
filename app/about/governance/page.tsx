import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading } from "@/components/ui";
export default function GovernancePage() {
  const layers = [
    ["Board of Trustees", "Guardianship of the mandate, values and long-term direction of the Forum."],
    ["National Executive", "President, Vice President, Secretary General and officers — day-to-day leadership."],
    ["Committees", "Standing and ad-hoc working arms: policy, peer review, mentorship, research, partnerships."],
    ["Secretariat", "Operational arm: administration, research support, coordination and publishing."],
    ["Audit & Accountability", "Immutable audit trail on membership, documents, events and permissions."],
  ];
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "About", href: "/about" }, { label: "Governance" }]} />
      <SectionHeading eyebrow="Governance" title="How the Forum governs itself" lede="Clear layers, documented approvals, auditable decisions — the same discipline the Forum recommends to public institutions." />
      <div className="mt-8 divide-y divide-ink/10 border-y hairline bg-white">
        {layers.map(([t, d], i) => (
          <div key={t} className="grid gap-2 px-6 py-6 md:grid-cols-[80px_240px_1fr]">
            <span className="font-display text-xl text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
            <h2 className="font-semibold text-forest-950">{t}</h2>
            <p className="text-sm text-ink/65">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
