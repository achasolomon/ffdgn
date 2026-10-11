import { getTemplateCopy } from "@/lib/template-repo";
import { asRoute as templateRoute } from "@/lib/routes";
import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, FileText, Users, Handshake, Landmark, ShieldCheck, BookOpen, Sprout } from "lucide-react";
import { getSettings, listDocs, listEvents, listFocusAreas, listLeadership, listMedia, listMembers, listMetrics, listNews, listTimeline } from "@/lib/repo";
import { formatDate } from "@/lib/search";
import { asRoute } from "@/lib/routes";
import { Reveal, SectionHeading, GoldRule, EmptyState } from "@/components/ui";
import { Stagger, StaggerItem } from "@/components/motion";
import { AssetImage } from "@/components/media";
import { NewsletterForm } from "@/components/newsletter-form";
import { Hero } from "@/components/hero";
import { EditorialImage } from "@/components/editorial-image";
import { MetricsStrip } from "@/components/metrics-strip";



export default async function HomePage() {
  const copy = await getTemplateCopy("page-page");

const FOCUS_ICONS = [Landmark, FileText, ShieldCheck, Sprout, BookOpen, Handshake];

  const managed = await managedWebsitePage("/");
  if (managed) return managed;

  const [settings, metrics, news, events, focus, timeline, leadership, documents, members, gallery] = await Promise.all([
    getSettings(), listMetrics(), listNews(), listEvents(), listFocusAreas(),
    listTimeline(), listLeadership(), listDocs(), listMembers(),
    listMedia({ kind: "IMAGE", galleryOnly: true }),
  ]);
  const isPhoto = (u: string) => /\.(jpe?g|png|webp)$/i.test(u);
  const galleryPreview = gallery
    .filter((g) => g.category !== "Portrait")
    .sort((a, b) => Number(isPhoto(b.url)) - Number(isPhoto(a.url)))
    .slice(0, 8);
  const featured = news[0];
  const upcoming = events.find((e) => e.status === "Upcoming") ?? events[0];
  const past = events.filter((e) => e.status === "Past");
  const pastFeatured = past[0];
  const pubDocs = documents.filter((d) => d.status === "Published" && d.visibility === "PUBLIC");
  const photoBySlug = new Map(members.map((m) => [m.slug, m.photo]));

  return (
    <div className="home-editorial">
      <Hero settings={settings} />
      <section className="about-editorial" aria-labelledby="home-about">
        <div className="mx-auto grid max-w-shell gap-10 px-5 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-24">
          <Reveal className="relative">
            <EditorialImage src={settings["home.about_image"]} alt={settings["home.about_image_alt"]} className="min-h-[320px] h-full lg:min-h-[430px]" />
            <div className="about-seal" aria-hidden><AssetImage src={copy("field-001")} alt="" width={120} height={120} className="h-20 w-20 rounded-full object-cover" sizes="80px" /></div>
          </Reveal>
          <Reveal className="flex flex-col justify-center" delay={0.12}>
            <p className="eyebrow-light">{settings["home.about_eyebrow"]}</p>
            <h2 id="home-about" className="font-display mt-5 max-w-xl text-4xl leading-[1.08] text-white md:text-5xl">{settings["home.about_title"]}</h2>
            <GoldRule className="my-6" />
            <div className="max-w-xl space-y-3 text-[15px] leading-[1.85] text-white/75">
              {settings["home.about_body"].split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
            <Link href={templateRoute(copy("field-002"))} className="editorial-cta mt-7 inline-flex items-center gap-5 self-start border-b border-gold/60 pb-3 text-sm font-semibold text-gold">
              {settings["home.about_cta"]} <ArrowRight size={18} aria-hidden />
            </Link>
          </Reveal>
        </div>
      </section>
      {metrics.length > 0 && <MetricsStrip metrics={metrics} />}

      {/* ——— LATEST ACTIVITY ——— */}
      <section className="activity-editorial mx-auto max-w-shell px-5 py-16 md:py-24" aria-labelledby="latest">
        <Reveal>
          <div className="flex items-end justify-between">
            <SectionHeading eyebrow={copy("field-003")} title={<span id="latest">{copy("field-004")}</span>} />
            <Link href={templateRoute(copy("field-005"))} className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-primary link-underline">{copy("field-006")}<ArrowRight size={15} /></Link>
          </div>
        </Reveal>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Reveal>
            {featured ? (
            <article className="news-feature grid h-full overflow-hidden bg-white shadow-card">
              <div className="img-zoom relative min-h-[320px] overflow-hidden bg-forest-900">
                {featured.image ? (
                  <AssetImage src={featured.image} alt={featured.title} width={480} height={400} className="absolute inset-0 h-full w-full object-cover" sizes="(max-width: 768px) 100vw, 240px" />
                ) : (
                  <div className="grid h-full min-h-[200px] place-items-center" aria-hidden>
                    <div className="text-center p-6"><FileText className="mx-auto text-primary/50" size={36} strokeWidth={1.25} /><p className="mt-2 text-[11px] uppercase tracking-widest text-ink/40">{copy("field-007")}</p></div>
                  </div>
                )}
              </div>
              <div className="p-6 md:p-7">
                <p className="eyebrow">{copy("field-008")}</p>
                <h3 className="font-display mt-2 text-[1.55rem] leading-tight text-forest-950">
                  <Link href={`/news/${featured.slug}`} className="hover:text-primary">{featured.title}</Link>
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/65">{featured.excerpt}</p>
                <p className="mt-4 text-[12px] font-medium uppercase tracking-wider text-ink/70">{formatDate(featured.date)} {copy("field-009")}{featured.location}</p>
              </div>
            </article>
            ) : (
              <EmptyState
                eyebrow={copy("field-010")}
                title={copy("field-011")}
                description={copy("field-012")}
                href={templateRoute(copy("field-013"))}
                actionLabel="Contact the Secretariat"
              />
            )}
          </Reveal>
          <Reveal>
            {upcoming ? (
            <article className="relative grid h-full overflow-hidden bg-forest-950 text-white">
              <div className="relative flex min-h-[180px] items-center justify-center bg-forest-900">
                {upcoming.coverUrl ? (
                  <AssetImage src={upcoming.coverUrl} alt={copy("field-087", {value1: upcoming.title})} width={640} height={640} className="block max-h-[400px] h-auto w-full object-contain" sizes="(max-width: 1024px) 100vw, 50vw" />
                ) : (
                  <span className="absolute inset-y-0 right-0 w-full bg-gradient-to-l from-gold/25 to-transparent" aria-hidden />
                )}
              </div>
              <div className="relative p-6 md:p-8">
                <p className="eyebrow-light">{copy("field-014")}</p>
                <p className="mt-3 font-display text-2xl text-gold">{formatDate(upcoming.startDate).replace(" 2026", "")} {copy("field-015")}{formatDate(upcoming.endDate)}</p>
                <h3 className="font-display mt-1 text-[1.7rem] leading-tight">{upcoming.title}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-white/65"><MapPin size={14} /> {upcoming.venue}{copy("field-016")}{upcoming.city}</p>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">{upcoming.summary}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`/events/${upcoming.slug}`} className="inline-flex items-center gap-2 bg-gold px-5 py-2.5 text-sm font-bold text-forest-950 hover:bg-gold-soft">{copy("field-017")}<ArrowRight size={15} /></Link>
                  <Link href={templateRoute(copy("field-018"))} className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-gold">{copy("field-019")}</Link>
                </div>
              </div>
            </article>
            ) : (
              <EmptyState
                eyebrow={copy("field-020")}
                title={copy("field-021")}
                description={copy("field-022")}
                href={templateRoute(copy("field-013"))}
                actionLabel="Contact the Secretariat"
              />
            )}
          </Reveal>
        </div>
      </section>

      {/* ——— OUR ROLE (editorial numbered system) ——— */}
      <section className="role-editorial brand-section" aria-labelledby="role">
        <div className="mx-auto max-w-shell px-5 py-14">
          <Reveal><SectionHeading eyebrow={copy("field-023")} title={<span id="role">{copy("field-024")}</span>} lede={copy("field-025")} tone="light" /></Reveal>
          <Stagger className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {focus.length === 0 ? (
              <p className="col-span-full border-b hairline px-5 py-8 text-center text-sm text-ink/55" role="status">
                {copy("field-026")}</p>
            ) : focus.map((r, i) => {
              const Icon = FOCUS_ICONS[i % FOCUS_ICONS.length];
              return (
                <StaggerItem key={r.slug}>
                  <Link href={asRoute(r.href)} className="role-row group relative flex flex-col gap-5 px-6 py-8">
                    {r.image ? (
                      <span className="h-32 w-full shrink-0 overflow-hidden" aria-hidden>
                        <AssetImage src={r.image} alt="" width={640} height={320} className="h-full w-full object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                      </span>
                    ) : (
                      <span className="font-display text-lg text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
                    )}
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-semibold text-forest-950"><Icon size={17} className="shrink-0 text-primary/70" />{r.title}</span>
                      <span className="mt-1.5 block text-sm leading-relaxed text-ink/65">{r.text}</span>
                      <span className="mt-2 inline-block text-[13px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">{copy("field-027")}</span>
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* ——— INSTITUTIONAL MEMORY ——— */}
      <section className="memory-editorial mx-auto max-w-shell px-5 py-16 md:py-24" aria-labelledby="memory">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow={copy("field-028")} title={<span id="memory">{copy("field-029")}</span>} lede={copy("field-030")} />
            <Link href={templateRoute(copy("field-031"))} className="border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white">{copy("field-032")}</Link>
          </div>
        </Reveal>
        <Reveal>
          <ol className="relative mt-10 grid gap-5 md:grid-cols-3 lg:grid-cols-6">
            {timeline.length === 0 ? (
              <li className="col-span-full border hairline bg-white px-6 py-8 text-center text-sm text-ink/55" role="status">
                {copy("field-033")}</li>
            ) : timeline.map((t, i) => (
              <li key={t.year} className="relative border hairline border-t-2 border-t-gold bg-white pt-0">
                {t.image && (
                  <span className="block h-28 overflow-hidden border-b hairline" aria-hidden>
                    <AssetImage src={t.image} alt="" width={320} height={224} className="h-full w-full object-cover" sizes="(max-width: 768px) 100vw, 200px" />
                  </span>
                )}
                <span className="block px-4 pb-4 pt-3">
                  <p className="font-display text-2xl text-forest-950">{t.year}</p>
                  <p className="mt-1 text-[13px] font-semibold leading-snug text-ink/80">{t.title}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink/55">{t.summary}</p>
                  {i === 1 && <p className="mt-2 text-[11.5px] text-ink/45">{copy("field-034")}</p>}
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      {/* ——— LEADERSHIP HIERARCHY ——— */}
      <section className="leadership-editorial" aria-labelledby="leadership">
        <div className="mx-auto max-w-shell px-5 py-14">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow={copy("field-035")} title={<span id="leadership">{copy("field-036")}</span>} />
              <Link href={templateRoute(copy("field-037"))} className="text-sm font-semibold text-primary link-underline">{copy("field-038")}</Link>
            </div>
          </Reveal>
          <Stagger className="leadership-grid mt-10">
            {leadership.length === 0 ? <EmptyState title={copy("field-039")} description={copy("field-040")} href={templateRoute(copy("field-037"))} actionLabel="View leadership" /> : leadership.slice(0, 6).map((seat) => {
              const member = seat.member;
              const photo = member ? photoBySlug.get(member.slug) : undefined;
              return <StaggerItem key={member?.slug ?? seat.role} className="leader-card">
                {photo ? <AssetImage src={photo} alt={member?.name ?? seat.role} width={220} height={270} sizes="110px" /> : <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-gold/15 font-display text-3xl text-gold">{member?.name.slice(0, 1) ?? copy("field-088")}</span>}
                <div><p className="eyebrow">{seat.role}</p><h3 className="font-display mt-3">{member?.name ?? copy("field-089")}</h3>{member?.title && <p className="mt-2 text-xs leading-relaxed">{member.title}</p>}<Link href={templateRoute(copy("field-037"))} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold">{copy("field-041")}<ArrowRight size={14} /></Link></div>
              </StaggerItem>;
            })}
          </Stagger>
        </div>
      </section>

      {/* ——— FEATURED CONFERENCE + KNOWLEDGE ——— */}
      <section className="mx-auto max-w-shell grid gap-6 px-5 py-14 lg:grid-cols-2" aria-label={copy("field-042")}>
        <Reveal>
          {pastFeatured ? (
          <article className="grid h-full overflow-hidden bg-forest-950 text-white sm:grid-cols-[1fr_1.1fr]">
            <div className="relative min-h-[220px] bg-forest-900" aria-hidden={pastFeatured.coverUrl ? undefined : true}>
              {pastFeatured.coverUrl ? (
                <AssetImage src={pastFeatured.coverUrl} alt={pastFeatured.title} width={640} height={520} className="absolute inset-0 h-full w-full object-cover" sizes="(max-width: 768px) 100vw, 400px" />
              ) : (
                <div className="grid h-full min-h-[220px] place-items-center p-8" aria-hidden>
                  <div className="text-center"><CalendarDays size={40} className="mx-auto text-gold" strokeWidth={1.25} /><p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/50">{copy("field-043")}</p></div>
                </div>
              )}
            </div>
            <div className="p-7">
              <p className="eyebrow-light">{copy("field-043")}</p>
              <h3 className="font-display mt-2 text-2xl leading-tight">{pastFeatured.title}</h3>
              {pastFeatured.theme && <p className="mt-2 text-sm text-white/65">{copy("field-044")}{pastFeatured.theme}{copy("field-045")}</p>}
              <p className="mt-1 text-[13px] text-white/55">{formatDate(pastFeatured.startDate)} {copy("field-009")}{pastFeatured.venue}{copy("field-016")}{pastFeatured.city}</p>
              <Link href={`/events/${pastFeatured.slug}`} className="mt-5 inline-flex items-center gap-2 bg-gold px-5 py-2.5 text-sm font-bold text-forest-950 hover:bg-gold-soft">{copy("field-046")}<ArrowRight size={15} /></Link>
            </div>
          </article>
          ) : (
            <div className="flex h-full flex-col justify-center border hairline bg-white px-8 py-14 text-center" role="status">
              <p className="eyebrow">{copy("field-047")}</p>
              <h3 className="font-display mt-2 text-2xl text-forest-950">{copy("field-048")}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink/65">{copy("field-049")}</p>
              <Link href={templateRoute(copy("field-018"))} className="mt-6 inline-block self-center border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white">{copy("field-050")}</Link>
            </div>
          )}
        </Reveal>
        <Reveal>
          <article className="h-full border hairline bg-white p-7">
            <p className="eyebrow">{copy("field-051")}</p>
            <h3 className="font-display mt-2 text-2xl text-forest-950">{copy("field-052")}</h3>
            <ul className="mt-5 divide-y divide-ink/10">
              {pubDocs.length === 0 ? (
                <li className="py-4 text-sm text-ink/55" role="status">{copy("field-053")}</li>
              ) : pubDocs.slice(0, 3).map((d) => (
                <li key={d.slug} className="flex items-start justify-between gap-4 py-3.5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-deep">{d.type} {copy("field-009")}{d.year}</p>
                    <Link href={`/knowledge/${d.slug}`} className="mt-0.5 block font-semibold leading-snug text-forest-950 hover:text-primary">{d.title}</Link>
                    <p className="text-[12.5px] text-ink/55">{d.size} {copy("field-009")}{d.downloads.toLocaleString()} {copy("field-054")}</p>
                  </div>
                  <ArrowRight size={16} className="mt-1 shrink-0 text-primary" />
                </li>
              ))}
            </ul>
            <Link href={templateRoute(copy("field-055"))} className="mt-4 inline-block text-sm font-semibold text-primary link-underline">{copy("field-056")}</Link>
          </article>
        </Reveal>
      </section>

      {/* ——— NEWS + PROGRAMS ——— */}
      <section className="news-programs-editorial" aria-label={copy("field-057")}>
        <div className="mx-auto grid max-w-shell gap-10 px-5 py-14 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-forest-950">{copy("field-058")}</h2>
              <Link href={templateRoute(copy("field-005"))} className="text-sm font-semibold text-primary link-underline">{copy("field-059")}</Link>
            </div>
            <ul className="mt-5 space-y-4">
              {news.slice(1).map((n) => (
                <li key={n.slug}>
                  <Link href={`/news/${n.slug}`} className="group flex items-center gap-4 border-b hairline pb-4">
                    {n.image && (
                      <span className="hidden h-16 w-24 shrink-0 overflow-hidden border hairline sm:block" aria-hidden>
                        <AssetImage src={n.image} alt="" width={192} height={128} className="h-full w-full object-cover" sizes="96px" />
                      </span>
                    )}
                    <span className="flex-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/45">{n.category} {copy("field-009")}{formatDate(n.date)}</span>
                      <span className="block font-semibold text-forest-950 group-hover:text-primary">{n.title}</span>
                    </span>
                    <ArrowRight size={16} className="shrink-0 text-ink/30 group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
            {news.length <= 1 && (
              <p className="mt-4 text-sm text-ink/55" role="status">
                {copy("field-060")}</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-forest-950">{copy("field-061")}</h2>
              <Link href={templateRoute(copy("field-062"))} className="text-sm font-semibold text-primary link-underline">{copy("field-063")}<ArrowRight className="inline" size={14} /></Link>
            </div>
            <p className="mt-2 text-sm text-ink/60">{copy("field-064")}</p>
            <div className="mt-5 space-y-3">
              <Link href={templateRoute(copy("field-065"))} className="program-feature program-polish"><span className="eyebrow">{copy("field-066")}</span><h3 className="mt-2 font-display text-xl">{copy("field-067")}</h3><p className="mt-2 text-sm">{copy("field-068")}</p><span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold">{copy("field-069")}<ArrowRight size={16} /></span></Link>
              <Link href={templateRoute(copy("field-070"))} className="program-feature program-hope"><span className="eyebrow">{copy("field-071")}</span><h3 className="mt-2 font-display text-xl">{copy("field-072")}</h3><p className="mt-2 text-sm">{copy("field-073")}</p><span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold">{copy("field-069")}<ArrowRight size={16} /></span></Link>
            </div>
          </div>
        </div>
      </section>

      {/* ——— GALLERY STRIP ——— */}
      <section className="gallery-editorial brand-section" aria-labelledby="gallery-strip">
        <div className="mx-auto max-w-shell px-5 py-14">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow={copy("field-074")} title={<span id="gallery-strip">{copy("field-075")}</span>} lede={copy("field-076")} tone="light" />
              <Link href={templateRoute(copy("field-077"))} className="text-sm font-semibold text-primary link-underline">{copy("field-078")}</Link>
            </div>
          </Reveal>
          <Stagger className="gallery-grid mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            {galleryPreview.map((g) => (
              <StaggerItem key={g.id}>
                <Link href={templateRoute(copy("field-077"))} className="group block overflow-hidden border hairline" aria-label={copy("field-090", {value1: g.title})}>
                  <AssetImage src={g.url} alt={g.altText ?? g.title} width={480} height={360} className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 25vw" />
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
          {galleryPreview.length === 0 && (
            <p className="mt-6 border hairline bg-white px-6 py-8 text-center text-sm text-ink/55" role="status">
              {copy("field-079")}</p>
          )}
        </div>
      </section>

      {/* ——— NEWSLETTER / TRUST ——— */}
      <section className="newsletter-editorial" aria-label={copy("field-080")}>
        <div className="mx-auto flex max-w-shell flex-col items-start justify-between gap-5 px-5 py-10 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <Users size={26} className="mt-0.5 text-primary" />
            <div>
              <h2 className="font-display text-xl text-forest-950">{copy("field-080")}</h2>
              <p className="text-sm text-ink/60">{copy("field-081")}</p>
            </div>
          </div>
          <NewsletterForm />
        </div>
      </section>

      {/* Members preview strip (quiet, avoids card-noise) */}
      <section className="mx-auto max-w-shell px-5 py-10" aria-label={copy("field-082")}>
        <div className="flex items-end justify-between">
          <p className="eyebrow">
          {copy("field-083")}{members.length === 0
            ? copy("field-084")
            : copy("field-091", {value1: members.length, value2: members.length === 1 ? "profile" : "profiles"})}
        </p>
          <Link href={templateRoute(copy("field-085"))} className="text-sm font-semibold text-primary link-underline">{copy("field-086")}</Link>
        </div>
      </section>
    </div>
  );
}

export const revalidate = 300; // CMS-driven: refresh from MySQL every 5 minutes

export async function generateMetadata() {return await websiteMetadata("/") ?? {}; }
