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

const FOCUS_ICONS = [Landmark, FileText, ShieldCheck, Sprout, BookOpen, Handshake];

export default async function HomePage() {
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
            <div className="about-seal" aria-hidden><AssetImage src="/assets/brand/logo-whitebg.jpg" alt="" width={120} height={120} className="h-20 w-20 rounded-full object-cover" sizes="80px" /></div>
          </Reveal>
          <Reveal className="flex flex-col justify-center" delay={0.12}>
            <p className="eyebrow-light">{settings["home.about_eyebrow"]}</p>
            <h2 id="home-about" className="font-display mt-5 max-w-xl text-4xl leading-[1.08] text-white md:text-5xl">{settings["home.about_title"]}</h2>
            <GoldRule className="my-6" />
            <div className="max-w-xl space-y-3 text-[15px] leading-[1.85] text-white/75">
              {settings["home.about_body"].split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
            <Link href="/about" className="editorial-cta mt-7 inline-flex items-center gap-5 self-start border-b border-gold/60 pb-3 text-sm font-semibold text-gold">
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
            <SectionHeading eyebrow="Latest from the Forum" title={<span id="latest">Institutional activity, as it happens</span>} />
            <Link href="/news" className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-primary link-underline">View all news <ArrowRight size={15} /></Link>
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
                    <div className="text-center p-6"><FileText className="mx-auto text-primary/50" size={36} strokeWidth={1.25} /><p className="mt-2 text-[11px] uppercase tracking-widest text-ink/40">Featured story</p></div>
                  </div>
                )}
              </div>
              <div className="p-6 md:p-7">
                <p className="eyebrow">Featured News</p>
                <h3 className="font-display mt-2 text-[1.55rem] leading-tight text-forest-950">
                  <Link href={`/news/${featured.slug}`} className="hover:text-primary">{featured.title}</Link>
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/65">{featured.excerpt}</p>
                <p className="mt-4 text-[12px] font-medium uppercase tracking-wider text-ink/70">{formatDate(featured.date)} · {featured.location}</p>
              </div>
            </article>
            ) : (
              <EmptyState
                eyebrow="Awaiting publication"
                title="No news published yet"
                description="Institutional announcements, press releases and statements will appear here once the Secretariat publishes them."
                href="/contact"
                actionLabel="Contact the Secretariat"
              />
            )}
          </Reveal>
          <Reveal>
            {upcoming ? (
            <article className="relative grid h-full overflow-hidden bg-forest-950 text-white">
              <div className="relative flex min-h-[180px] items-center justify-center bg-forest-900">
                {upcoming.coverUrl ? (
                  <AssetImage src={upcoming.coverUrl} alt={`${upcoming.title} — official flyer`} width={640} height={640} className="block max-h-[400px] h-auto w-full object-contain" sizes="(max-width: 1024px) 100vw, 50vw" />
                ) : (
                  <span className="absolute inset-y-0 right-0 w-full bg-gradient-to-l from-gold/25 to-transparent" aria-hidden />
                )}
              </div>
              <div className="relative p-6 md:p-8">
                <p className="eyebrow-light">Upcoming event</p>
                <p className="mt-3 font-display text-2xl text-gold">{formatDate(upcoming.startDate).replace(" 2026", "")} – {formatDate(upcoming.endDate)}</p>
                <h3 className="font-display mt-1 text-[1.7rem] leading-tight">{upcoming.title}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-white/65"><MapPin size={14} /> {upcoming.venue}, {upcoming.city}</p>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">{upcoming.summary}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`/events/${upcoming.slug}`} className="inline-flex items-center gap-2 bg-gold px-5 py-2.5 text-sm font-bold text-forest-950 hover:bg-gold-soft">Register Now <ArrowRight size={15} /></Link>
                  <Link href="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-gold">View all events →</Link>
                </div>
              </div>
            </article>
            ) : (
              <EmptyState
                eyebrow="No scheduled events"
                title="No upcoming events scheduled"
                description="Conference and programme announcements will be published here. The Secretariat can be contacted for engagement enquiries."
                href="/contact"
                actionLabel="Contact the Secretariat"
              />
            )}
          </Reveal>
        </div>
      </section>

      {/* ——— OUR ROLE (editorial numbered system) ——— */}
      <section className="role-editorial brand-section" aria-labelledby="role">
        <div className="mx-auto max-w-shell px-5 py-14">
          <Reveal><SectionHeading eyebrow="Our role" title={<span id="role">What the Forum does</span>} lede="Sharing knowledge. Strengthening institutions. Contributing to a nation that works for everyone." tone="light" /></Reveal>
          <Stagger className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {focus.length === 0 ? (
              <p className="col-span-full border-b hairline px-5 py-8 text-center text-sm text-ink/55" role="status">
                The Forum&rsquo;s areas of engagement are being updated by the Secretariat.
              </p>
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
                      <span className="mt-2 inline-block text-[13px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">Explore →</span>
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
            <SectionHeading eyebrow="Institutional memory" title={<span id="memory">The Forum through the years</span>} lede="The milestones, people and decisions that continue to shape our shared purpose." />
            <Link href="/about/history" className="border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white">Explore the Archive →</Link>
          </div>
        </Reveal>
        <Reveal>
          <ol className="relative mt-10 grid gap-5 md:grid-cols-3 lg:grid-cols-6">
            {timeline.length === 0 ? (
              <li className="col-span-full border hairline bg-white px-6 py-8 text-center text-sm text-ink/55" role="status">
                The institutional timeline is being assembled from Forum records.
              </li>
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
                  {i === 1 && <p className="mt-2 text-[11.5px] text-ink/45">Documents · Leaders · Photos · Communiqués</p>}
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
              <SectionHeading eyebrow="Leadership" title={<span id="leadership">Guided by experience, united by purpose</span>} />
              <Link href="/leadership" className="text-sm font-semibold text-primary link-underline">View Full Leadership →</Link>
            </div>
          </Reveal>
          <Stagger className="leadership-grid mt-10">
            {leadership.length === 0 ? <EmptyState title="Leadership directory not yet published" description="Leadership profiles will appear once published by the Secretariat." href="/leadership" actionLabel="View leadership" /> : leadership.slice(0, 6).map((seat) => {
              const member = seat.member;
              const photo = member ? photoBySlug.get(member.slug) : undefined;
              return <StaggerItem key={member?.slug ?? seat.role} className="leader-card">
                {photo ? <AssetImage src={photo} alt={member?.name ?? seat.role} width={220} height={270} sizes="110px" /> : <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-gold/15 font-display text-3xl text-gold">{member?.name.slice(0, 1) ?? "F"}</span>}
                <div><p className="eyebrow">{seat.role}</p><h3 className="font-display mt-3">{member?.name ?? "Position vacant"}</h3>{member?.title && <p className="mt-2 text-xs leading-relaxed">{member.title}</p>}<Link href="/leadership" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold">View leadership <ArrowRight size={14} /></Link></div>
              </StaggerItem>;
            })}
          </Stagger>
        </div>
      </section>

      {/* ——— FEATURED CONFERENCE + KNOWLEDGE ——— */}
      <section className="mx-auto max-w-shell grid gap-6 px-5 py-14 lg:grid-cols-2" aria-label="Conference and knowledge">
        <Reveal>
          {pastFeatured ? (
          <article className="grid h-full overflow-hidden bg-forest-950 text-white sm:grid-cols-[1fr_1.1fr]">
            <div className="relative min-h-[220px] bg-forest-900" aria-hidden={pastFeatured.coverUrl ? undefined : true}>
              {pastFeatured.coverUrl ? (
                <AssetImage src={pastFeatured.coverUrl} alt={pastFeatured.title} width={640} height={520} className="absolute inset-0 h-full w-full object-cover" sizes="(max-width: 768px) 100vw, 400px" />
              ) : (
                <div className="grid h-full min-h-[220px] place-items-center p-8" aria-hidden>
                  <div className="text-center"><CalendarDays size={40} className="mx-auto text-gold" strokeWidth={1.25} /><p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/50">Featured conference</p></div>
                </div>
              )}
            </div>
            <div className="p-7">
              <p className="eyebrow-light">Featured conference</p>
              <h3 className="font-display mt-2 text-2xl leading-tight">{pastFeatured.title}</h3>
              {pastFeatured.theme && <p className="mt-2 text-sm text-white/65">Theme: “{pastFeatured.theme}”</p>}
              <p className="mt-1 text-[13px] text-white/55">{formatDate(pastFeatured.startDate)} · {pastFeatured.venue}, {pastFeatured.city}</p>
              <Link href={`/events/${pastFeatured.slug}`} className="mt-5 inline-flex items-center gap-2 bg-gold px-5 py-2.5 text-sm font-bold text-forest-950 hover:bg-gold-soft">Explore Conference <ArrowRight size={15} /></Link>
            </div>
          </article>
          ) : (
            <div className="flex h-full flex-col justify-center border hairline bg-white px-8 py-14 text-center" role="status">
              <p className="eyebrow">Conference archive</p>
              <h3 className="font-display mt-2 text-2xl text-forest-950">No past conference archived yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink/65">Records of past conferences and their communiqués will appear here once the Secretariat archives them.</p>
              <Link href="/events" className="mt-6 inline-block self-center border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white">Browse events</Link>
            </div>
          )}
        </Reveal>
        <Reveal>
          <article className="h-full border hairline bg-white p-7">
            <p className="eyebrow">Knowledge Centre</p>
            <h3 className="font-display mt-2 text-2xl text-forest-950">Latest publications & communiqués</h3>
            <ul className="mt-5 divide-y divide-ink/10">
              {pubDocs.length === 0 ? (
                <li className="py-4 text-sm text-ink/55" role="status">No public publications have been released yet. The Secretariat is preparing the latest records and communiqués.</li>
              ) : pubDocs.slice(0, 3).map((d) => (
                <li key={d.slug} className="flex items-start justify-between gap-4 py-3.5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-deep">{d.type} · {d.year}</p>
                    <Link href={`/knowledge/${d.slug}`} className="mt-0.5 block font-semibold leading-snug text-forest-950 hover:text-primary">{d.title}</Link>
                    <p className="text-[12.5px] text-ink/55">{d.size} · {d.downloads.toLocaleString()} downloads</p>
                  </div>
                  <ArrowRight size={16} className="mt-1 shrink-0 text-primary" />
                </li>
              ))}
            </ul>
            <Link href="/knowledge" className="mt-4 inline-block text-sm font-semibold text-primary link-underline">Browse Knowledge Centre →</Link>
          </article>
        </Reveal>
      </section>

      {/* ——— NEWS + PROGRAMS ——— */}
      <section className="news-programs-editorial" aria-label="News and programs">
        <div className="mx-auto grid max-w-shell gap-10 px-5 py-14 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-forest-950">News & Media</h2>
              <Link href="/news" className="text-sm font-semibold text-primary link-underline">View all →</Link>
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
                      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/45">{n.category} · {formatDate(n.date)}</span>
                      <span className="block font-semibold text-forest-950 group-hover:text-primary">{n.title}</span>
                    </span>
                    <ArrowRight size={16} className="shrink-0 text-ink/30 group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
            {news.length <= 1 && (
              <p className="mt-4 text-sm text-ink/55" role="status">
                Further announcements will appear here as the Secretariat publishes them.
              </p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-forest-950">Programs</h2>
              <Link href="/programs" className="text-sm font-semibold text-primary link-underline">Explore programs <ArrowRight className="inline" size={14} /></Link>
            </div>
            <p className="mt-2 text-sm text-ink/60">Turning experience into economic opportunity and constructive policy dialogue.</p>
            <div className="mt-5 space-y-3">
              <Link href="/polish-nigeria" className="program-feature program-polish"><span className="eyebrow">01 · Trade &amp; investment</span><h3 className="mt-2 font-display text-xl">Polish Nigeria</h3><p className="mt-2 text-sm">Business connections, investment facilitation and cultural exchange between Poland and Nigeria.</p><span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold">Explore program <ArrowRight size={16} /></span></Link>
              <Link href="/renewed-hope" className="program-feature program-hope"><span className="eyebrow">02 · Policy &amp; peer review</span><h3 className="mt-2 font-display text-xl">Renewed Hope</h3><p className="mt-2 text-sm">Constructive assessment and recommendations to support the Renewed Hope Agenda.</p><span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold">Explore program <ArrowRight size={16} /></span></Link>
            </div>
          </div>
        </div>
      </section>

      {/* ——— GALLERY STRIP ——— */}
      <section className="gallery-editorial brand-section" aria-labelledby="gallery-strip">
        <div className="mx-auto max-w-shell px-5 py-14">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow="In pictures" title={<span id="gallery-strip">The Forum in focus</span>} lede="People, conversations and moments that move the Forum forward." tone="light" />
              <Link href="/media/photos" className="text-sm font-semibold text-primary link-underline">Open photo gallery →</Link>
            </div>
          </Reveal>
          <Stagger className="gallery-grid mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            {galleryPreview.map((g) => (
              <StaggerItem key={g.id}>
                <Link href="/media/photos" className="group block overflow-hidden border hairline" aria-label={`View in gallery: ${g.title}`}>
                  <AssetImage src={g.url} alt={g.altText ?? g.title} width={480} height={360} className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 25vw" />
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
          {galleryPreview.length === 0 && (
            <p className="mt-6 border hairline bg-white px-6 py-8 text-center text-sm text-ink/55" role="status">
              The photo archive is being curated. Images from past conferences will appear here once cleared for publication.
            </p>
          )}
        </div>
      </section>

      {/* ——— NEWSLETTER / TRUST ——— */}
      <section className="newsletter-editorial" aria-label="Stay informed">
        <div className="mx-auto flex max-w-shell flex-col items-start justify-between gap-5 px-5 py-10 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <Users size={26} className="mt-0.5 text-primary" />
            <div>
              <h2 className="font-display text-xl text-forest-950">Stay informed</h2>
              <p className="text-sm text-ink/60">Receive official publications, conference announcements and Forum updates.</p>
            </div>
          </div>
          <NewsletterForm />
        </div>
      </section>

      {/* Members preview strip (quiet, avoids card-noise) */}
      <section className="mx-auto max-w-shell px-5 py-10" aria-label="Members preview">
        <div className="flex items-end justify-between">
          <p className="eyebrow">
          The membership · {members.length === 0
            ? "profiles are being verified"
            : `${members.length} ${members.length === 1 ? "profile" : "profiles"} in this release`}
        </p>
          <Link href="/members" className="text-sm font-semibold text-primary link-underline">Open directory →</Link>
        </div>
      </section>
    </div>
  );
}

export const revalidate = 300; // CMS-driven: refresh from MySQL every 5 minutes

export async function generateMetadata() {return await websiteMetadata("/") ?? {}; }
