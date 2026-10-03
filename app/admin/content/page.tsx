import { EXTRA_SITE_FIELDS } from "@/lib/site-settings-fields";
import Link from "next/link";
import { SettingsForm, MetricList, NewMetricForm } from "@/components/admin-content-forms";
import { db, dbReady } from "@/lib/db";
import { requirePermission } from "@/lib/server-auth";
import { getSettings } from "@/lib/repo";
import { asRoute } from "@/lib/routes";

/**
 * Editable copy, mirrored from the server-side whitelist in
 * `app/api/v1/cms/settings/route.ts`.
 *
 * Kept as a literal rather than imported so that adding a key to the API without
 * wiring a field here shows up as a setting the operator cannot reach, instead
 * of silently rendering an unlabelled input. The API remains the authority: a
 * key not in its `ALLOWED_KEYS` is rejected regardless of what this page sends.
 */
const SETTING_FIELDS: { key: string; label: string; multiline?: boolean }[] = [
  ...EXTRA_SITE_FIELDS,
  { key: "site.title", label: "Organization name" },
  { key: "site.description", label: "Site description", multiline: true },
  { key: "site.phone", label: "Contact phone" },
  { key: "site.email", label: "Contact email" },
  { key: "site.address", label: "Contact location" },
  { key: "contact.address", label: "Secretariat street address" },
  { key: "contact.hours", label: "Secretariat hours" },
  { key: "contact.conference_title", label: "Conference enquiries heading" },
  { key: "contact.conference_phone", label: "Conference contact phones" },
  { key: "contact.conference_email", label: "Conference contact email" },
  ...[1, 2, 3].flatMap((index) => [
    { key: `hero.image_${index}`, label: `Hero slide ${index}: image (clear to hide)` },
    { key: `hero.image_${index}_alt`, label: `Hero slide ${index}: image description` },
  ]),
  { key: "hero.eyebrow", label: "Hero eyebrow" },
  { key: "hero.title", label: "Hero title", multiline: true },
  { key: "hero.lede", label: "Hero lede", multiline: true },
  { key: "hero.cta_primary", label: "Primary call to action" },
  { key: "hero.cta_secondary", label: "Secondary call to action" },
  { key: "home.about_eyebrow", label: "Homepage About FFDGN: section label" },
  { key: "home.about_title", label: "Homepage About FFDGN: heading" },
  { key: "home.about_body", label: "Homepage About FFDGN: introduction", multiline: true },
  { key: "home.about_cta", label: "Homepage About FFDGN: About page button label" },
  { key: "home.about_image", label: "Homepage About FFDGN: photograph" },
  { key: "home.about_image_alt", label: "Homepage About FFDGN: photograph description" },
  { key: "site.established", label: "Year established" },
  { key: "site.seat", label: "Seat" },
  { key: "site.character", label: "Character" },
  { key: "event.conference_label", label: "Conference label" },
  { key: "event.conference_title", label: "Conference title" },
  { key: "event.conference_href", label: "Conference destination path" },
  { key: "event.conference_banner_detail", label: "Conference banner detail" },
  // Ad banner in the right-hand column of the logo row.
  { key: "header.ad_eyebrow", label: "Header ad: eyebrow (small line above)" },
  { key: "header.ad_title", label: "Header ad: headline" },
  { key: "header.ad_detail", label: "Header ad: supporting line" },
  { key: "header.ad_cta", label: "Header ad: button label" },
  { key: "header.ad_href", label: "Header ad: destination path" },
  { key: "header.ad_image", label: "Header ad: banner image path" },
];

/**
 * Fields that are allowed to be blank. The header ad banner drops out of the
 * page entirely when its headline is unset, so an empty image or button is a
 * valid configuration rather than an unfinished one — flagging it would
 * bury the genuinely unfilled fields.
 */
const OPTIONAL_KEYS = new Set(["header.ad_image", "header.ad_cta", "header.ad_eyebrow", "header.ad_detail"]);

export default async function AdminContentPage() {
  try {
    await requirePermission("settings.manage");
  } catch {
    return (
      <div className="mx-auto max-w-shell px-5 py-12">
        <p className="eyebrow">Secretariat console</p>
        <h1 className="font-display mt-2 text-3xl text-forest-950">Permission denied</h1>
        <p className="mt-2 text-sm text-ink/60">
          Site copy and metrics require the <code>settings.manage</code> capability. Contact a
          Secretariat Administrator.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-sm font-semibold text-primary">
          ← Back to console
        </Link>
      </div>
    );
  }

  const live = await dbReady();
  const [stored, metrics] = live
    ? await Promise.all([getSettings(), db.siteMetric.findMany({ orderBy: { position: "asc" } })])
    : [await getSettings(), []];

  const settings = SETTING_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    multiline: f.multiline,
    // Fall back to the seeded copy so an unconfigured field renders its current
    // public value rather than an empty box. Saving writes the value through.
    value: stored[f.key] ?? "",
  }));

  const missing = settings.filter((s) => !s.value && !OPTIONAL_KEYS.has(s.key) && !s.key.startsWith("hero.image_"));

  return (
    <div className="mx-auto max-w-[1420px] px-5 py-8 sm:px-8 sm:py-10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Site content / Settings</p>
      <h1 className="mt-1.5 text-[26px] font-semibold tracking-normal text-[#1c3526]">Site settings</h1>
      <p className="mt-1 text-[13px] text-[#738077]">Organization identity, contact information, homepage copy, and conference banner.</p>

      {!live && (
        <p className="mt-4 border border-gold/60 bg-paper px-4 py-3 text-sm" role="note">
          Database unavailable — showing seeded fallback copy. Connect MySQL to persist edits.
        </p>
      )}

      {missing.length > 0 && live && (
        <p className="mt-4 border border-gold/60 bg-paper px-4 py-3 text-sm" role="note">
          {missing.length} field{missing.length === 1 ? " is" : "s are"} not set. The public site
          falls back to its built-in defaults until they are filled in:{" "}
          <span className="font-mono text-[12.5px]">{missing.map((m) => m.key).join(", ")}</span>
        </p>
      )}

      <section className="mt-8" aria-labelledby="copy-h">
        <h2 id="copy-h" className="font-display text-2xl text-forest-950">Site copy</h2>
        <p className="mt-1 text-[13px] text-ink/55">
          Hero text, the identity strip and conference banner detail.
        </p>
        <div className="mt-4">
          <SettingsForm settings={settings} />
        </div>
      </section>

      <section className="mt-10" aria-labelledby="metrics-h">
        <h2 id="metrics-h" className="font-display text-2xl text-forest-950">Identity strip</h2>
        <p className="mt-1 max-w-2xl text-[13px] text-ink/55">
          The figures shown beneath the hero. Each links to a page on this site; the API rejects
          anything that is not a same-origin path, so a figure cannot become an off-site link.
        </p>
        <div className="mt-4 space-y-4">
          <MetricList
            metrics={metrics.map((m) => ({ key: m.key, value: m.value, label: m.label, href: m.href }))}
          />
          <NewMetricForm />
        </div>
      </section>

      <section className="mt-10 border hairline bg-paper p-6" aria-labelledby="limits-h">
        <h2 id="limits-h" className="font-display text-xl text-forest-950">What is not editable here</h2>
        <ul className="mt-2 space-y-1.5 text-[13px] text-ink/65">
          <li>
            <strong className="text-forest-950">Conference slug.</strong> The banner links to a
            fixed route so the navigation target cannot drift. Edit the title and detail here; the
            slug lives in <code>lib/routes.ts</code>.
          </li>
          <li>
            <strong className="text-forest-950">Navigation.</strong> The mega-menu is generated from{" "}
            <code>lib/routes.ts</code> rather than the database, so navigation cannot be silently
            changed from a browser session.
          </li>
          <li>
            <strong className="text-forest-950">Metric order.</strong> Figures render in insertion
            order; reordering is not offered because an off-by-one would change what the Forum
            claims about itself without leaving a trace.
          </li>
        </ul>
      </section>
      <Link href={asRoute("/admin/content/navigation")} className="mt-6 inline-flex items-center gap-2 border border-[#cbd8cd] bg-white px-4 py-3 text-[13px] font-semibold text-[#28543a] hover:bg-[#f5f8f4]">
        Manage navigation &amp; footer links →
      </Link>
    </div>
  );
}
