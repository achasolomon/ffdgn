import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Privacy",
  robots: { index: false, follow: false },
};
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow">Resources</p>
      <h1 className="font-display mt-2 text-4xl text-forest-950">Privacy & visibility</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink/75">
        <p>Member records carry explicit visibility levels: PUBLIC · MEMBERS ONLY · COMMITTEE ONLY · SECRETARIAT ONLY · PRIVATE (§41).</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Public: name, former state, former office, approved biography and photograph.</li>
          <li>Never public without authorisation: personal phone, private email, internal notes.</li>
        </ul>
        <p>Portal and console pages are excluded from indexing via robots metadata and middleware headers.</p>
      </div>
    </div>
  );
}
