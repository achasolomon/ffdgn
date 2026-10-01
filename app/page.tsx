import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, FileText, Users, Handshake, Landmark, ShieldCheck, BookOpen, Sprout } from "lucide-react";
import { getSettings, listDocs, listEvents, listFocusAreas, listLeadership, listMedia, listMembers, listMetrics, listNews, listPartnerships, listTimeline } from "@/lib/repo";
import { formatDate } from "@/lib/search";
import { Reveal, SectionHeading, GoldRule } from "@/components/ui";
import { Stagger, StaggerItem } from "@/components/motion";
import { AssetImage } from "@/components/media";
import { NewsletterForm } from "@/components/newsletter-form";
import { Hero } from "@/components/hero";
import { MetricsStrip } from "@/components/metrics-strip";

const FOCUS_ICONS = [Landmark, FileText, ShieldCheck, Sprout, BookOpen, Handshake];

export default async function HomePage() {
  const [settings, metrics, news, events, focus, timeline, leadership, documents, partnerships, members, gallery] = await Promise.all([
    getSettings(), listMetrics(), listNews(), listEvents(), listFocusAreas(),
    listTimeline(), listLeadership(), listDocs(), listPartnerships(), listMembers(),
    listMedia({ kind: "IMAGE" }),
  ]);
  const isPhoto = (u: string) => /\.(jpe?g|png|webp)$/i.test(u);
  const galleryPreview = gallery
    .filter((g) => g.category !== "Portrait")
    .sort((a, b) => Number(isPhoto(b.url)) - Number(isPhoto(a.url)))
    .slice(0, 8);
  const featured = news[0];
  const upcoming = events.find((e) => e.status === "Upcoming") ?? events[0];
  const past = events.filter((e) => e.status === "Past");
  const pubDocs = documents.filter((d) => d.status === "Published" && d.visibility === "PUBLIC");
  const photoBySlug = new Map(members.map((m) => [m.slug, m.photo]));

  return (
    <>
      <Hero settings={settings} />
      <MetricsStrip metrics={metrics} />

      {/* ——— LATEST ACTIVITY ——— */}
      <section className="mx-auto max-w-shell px-5 py-14" aria-labelledby="latest">
        <Reveal>
          <div className="flex items-end justify-between">
            <SectionHeading eyebrow="Latest from the Forum" title={<span id="latest">Institutional activity, as it happens</span>} />
            <Link href="/news" className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-primary link-underline">View all news <ArrowRight size={15} /></Link>
          </div>
        </Reveal>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <article className="grid h-full border hairline bg-white shadow-card sm:grid-cols-[240px_1fr]">
              <div className="img-zoom relative min-h-[200px] overflow-hidden bg-forest-900" aria-hidden={undefined}>
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
                <p className="mt-4 text-[12px] font-medium uppercase tracking-wider text-ink/45">{formatDate(featured.date)} · {featured.location}</p>
              </div>
            </article>
          </Reveal>
          <Reveal>
            <article className="relative grid h-full overflow-hidden bg-forest-950 text-white sm:grid-cols-[1fr_1fr]">
              <div className="relative min-h-[240px]" aria-hidden={upcoming.coverUrl ? undefined : true}>
                {upcoming.coverUrl ? (
                  <AssetImage src={upcoming.coverUrl} alt={`${upcoming.title} — official flyer`} width={640} height={640} className="absolute inset-0 h-full w-full object-cover object-top" sizes="(max-width: 768px) 100vw, 500px" />
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
          </Reveal>
        </div>
      </section>

      {/* ——— OUR ROLE (editorial numbered system) ——— */}
      <section className="border-y hairline bg-white" aria-labelledby="role">
        <div className="mx-auto max-w-shell px-5 py-14">
          <Reveal><SectionHeading eyebrow="Our role" title={<span id="role">What the Forum does</span>} lede="Six standing areas of engagement. Each connects to live publications, members, events and committees — not a brochure list." /></Reveal>
          <Stagger className="mt-8 grid border-t hairline md:grid-cols-2 lg:grid-cols-3">
            {focus.map((r, i) => {
              const Icon = FOCUS_ICONS[i % FOCUS_ICONS.length];
              return (
                <StaggerItem key={r.slug}>
                  <Link href={r.href} className="role-row group flex gap-4 border-b hairline px-5 py-6">
                    {r.image ? (
                      <span className="hidden h-16 w-20 shrink-0 overflow-hidden border hairline sm:block" aria-hidden>
                        <AssetImage src={r.image} alt="" width={160} height={128} className="h-full w-full object-cover" sizes="80px" />
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
      <section className="mx-auto max-w-shell px-5 py-14" aria-labelledby="memory">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow="Institutional memory" title={<span id="memory">The Forum through the years</span>} lede="History as structured data: every era connects to events, people, documents and decisions." />
            <Link href="/about/history" className="border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white">Explore the Archive →</Link>
          </div>
        </Reveal>
        <Reveal>
          <ol className="relative mt-10 grid gap-5 md:grid-cols-3 lg:grid-cols-6">
            {timeline.map((t, i) => (
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
      <section className="border-y hairline bg-white" aria-labelledby="leadership">
        <div className="mx-auto max-w-shell px-5 py-14">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow="Leadership" title={<span id="leadership">Guided by experience, united by purpose</span>} />
              <Link href="/leadership" className="text-sm font-semibold text-primary link-underline">View Full Leadership →</Link>
            </div>
          </Reveal>
          <div className="mt-10">
            <Reveal>
              <div className="mx-auto max-w-xl border border-gold/60 bg-paper px-6 py-6 text-center">
                {photoBySlug.get(leadership[0].member?.slug ?? "") && (
                  <AssetImage src={photoBySlug.get(leadership[0].member?.slug ?? "")!} alt={`Portrait of ${leadership[0].member?.name}`} width={224} height={224} className="mx-auto h-28 w-28 rounded-full object-cover ring-2 ring-gold/60" sizes="112px" />
                )}
                <p className="eyebrow-gold mt-3">{leadership[0].role}</p>
                <p className="font-display mt-1 text-2xl text-forest-950">{leadership[0].member?.name}</p>
                <GoldRule className="mx-auto mt-3" />
              </div>
              <div className="mx-auto h-6 w-px bg-primary/30" aria-hidden />
              <div className="mx-auto max-w-xl border hairline bg-white px-6 py-6 text-center shadow-card">
                {photoBySlug.get(leadership[1].member?.slug ?? "") && (
                  <AssetImage src={photoBySlug.get(leadership[1].member?.slug ?? "")!} alt={`Portrait of ${leadership[1].member?.name}`} width={224} height={224} className="mx-auto h-28 w-28 rounded-full object-cover ring-2 ring-gold/60" sizes="112px" />
                )}
                <p className="eyebrow mt-3">{leadership[1].role}</p>
                <p className="font-display mt-1 text-2xl text-forest-950">{leadership[1].member?.name}</p>
                <p className="mt-1 text-[13px] text-ink/60">{leadership[1].member?.title}</p>
              </div>
            </Reveal>
            <Stagger className="mx-auto mt-6 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {leadership.slice(2, 6).map((l) => {
                const m = l.member;
                const photo = m ? photoBySlug.get(m.slug) : undefined;
                return (
                  <StaggerItem key={l.role}>
                    <Link href="/leadership" className="block border hairline bg-paper px-5 py-5 text-center hover:bg-white hover:shadow-card">
                      {photo ? (
                        <AssetImage src={photo} alt={m?.name ?? l.role} width={160} height={160} className="mx-auto h-20 w-20 rounded-full object-cover ring-2 ring-gold/60" sizes="80px" />
                      ) : (
                        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-forest-950 font-display text-lg text-gold" aria-hidden>{m?.name.split(" ").slice(-1)[0]?.[0] ?? "F"}</span>
                      )}
                      <span className="mt-3 block text-[11px] font-bold uppercase leading-relaxed tracking-[0.14em] text-primary text-balance">{l.role}</span>
                      <span className="mt-1 block font-display text-lg leading-tight text-forest-950">{m?.name}</span>
                    </Link>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </div>
        </div>
      </section>

      {/* ——— FEATURED CONFERENCE + KNOWLEDGE ——— */}
      <section className="mx-auto max-w-shell grid gap-6 px-5 py-14 lg:grid-cols-2" aria-label="Conference and knowledge">
        <Reveal>
          <article className="grid h-full overflow-hidden bg-forest-950 text-white sm:grid-cols-[1fr_1.1fr]">
            <div className="relative min-h-[220px] bg-forest-900" aria-hidden={past[0]?.coverUrl ? undefined : true}>
              {past[0]?.coverUrl ? (
                <AssetImage src={past[0].coverUrl} alt={past[0].title} width={640} height={520} className="absolute inset-0 h-full w-full object-cover" sizes="(max-width: 768px) 100vw, 400px" />
              ) : (
                <div className="grid h-full min-h-[220px] place-items-center p-8" aria-hidden>
                  <div className="text-center"><CalendarDays size={40} className="mx-auto text-gold" strokeWidth={1.25} /><p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/50">Featured conference</p></div>
                </div>
              )}
            </div>
            <div className="p-7">
              <p className="eyebrow-light">Featured conference</p>
              <h3 className="font-display mt-2 text-2xl leading-tight">{past[0].title}</h3>
              <p className="mt-2 text-sm text-white/65">Theme: “{past[0].theme}”</p>
              <p className="mt-1 text-[13px] text-white/55">{formatDate(past[0].startDate)} · {past[0].venue}, {past[0].city}</p>
              <Link href={`/events/${past[0].slug}`} className="mt-5 inline-flex items-center gap-2 bg-gold px-5 py-2.5 text-sm font-bold text-forest-950 hover:bg-gold-soft">Explore Conference <ArrowRight size={15} /></Link>
            </div>
          </article>
        </Reveal>
        <Reveal>
          <article className="h-full border hairline bg-white p-7">
            <p className="eyebrow">Knowledge Centre</p>
            <h3 className="font-display mt-2 text-2xl text-forest-950">Latest publications & communiqués</h3>
            <ul className="mt-5 divide-y divide-ink/10">
              {pubDocs.slice(0, 3).map((d) => (
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

      {/* ——— NEWS + PARTNERSHIPS ——— */}
      <section className="border-t hairline bg-white" aria-label="News and partnerships">
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
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-forest-950">Partnerships</h2>
              <Link href="/partnerships" className="text-sm font-semibold text-primary link-underline">View all →</Link>
            </div>
            <p className="mt-2 text-sm text-ink/60">Collaborating for good governance and national development.</p>
            <ul className="mt-5 grid grid-cols-1 gap-3">
              {partnerships.slice(0, 4).map((p) => (
                <li key={p.slug} className="flex items-center gap-3 border hairline bg-paper px-4 py-3">
                  {p.logo ? (
                    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border hairline bg-white" role="img" aria-label={`Logo of ${p.name}`}>
                      <AssetImage src={p.logo} alt="" width={72} height={72} className="h-full w-full object-cover" sizes="36px" />
                    </span>
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-forest-950 text-[13px] font-bold text-gold" aria-hidden>{p.name[0]}</span>
                  )}
                  <span><span className="block text-sm font-semibold text-forest-950">{p.name}</span><span className="block text-[12px] text-ink/55">{p.type} · since {p.since}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ——— GALLERY STRIP ——— */}
      <section className="border-t hairline bg-white" aria-labelledby="gallery-strip">
        <div className="mx-auto max-w-shell px-5 py-14">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow="In pictures" title={<span id="gallery-strip">The Forum in focus</span>} lede="Conference floors, portraits and press moments — the full archive lives in the photo gallery." />
              <Link href="/media/photos" className="text-sm font-semibold text-primary link-underline">Open photo gallery →</Link>
            </div>
          </Reveal>
          <Stagger className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {galleryPreview.map((g) => (
              <StaggerItem key={g.id}>
                <Link href="/media/photos" className="group block overflow-hidden border hairline" aria-label={`View in gallery: ${g.title}`}>
                  <AssetImage src={g.url} alt={g.altText ?? g.title} width={480} height={360} className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 25vw" />
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ——— NEWSLETTER / TRUST ——— */}
      <section className="bg-paper" aria-label="Stay informed">
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
      <section className="mx-auto max-w-shell px-5 pb-16" aria-label="Members preview">
        <div className="flex items-end justify-between">
          <p className="eyebrow">The membership · {members.length} profiles in this release</p>
          <Link href="/members" className="text-sm font-semibold text-primary link-underline">Open directory →</Link>
        </div>
      </section>
    </>
  );
}

export const revalidate = 300; // CMS-driven: refresh from MySQL every 5 minutes
