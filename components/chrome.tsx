"use client";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";
import { AuthButton } from "./auth-button";
import { AssetImage } from "./media";
import { DUR, EASE_OUT } from "@/lib/motion";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X, Search, Phone, Mail, MapPin } from "lucide-react";

const NAV: { label: string; href: string; children: { label: string; href: string; desc: string }[] }[] = [
  {
    label: "The Forum", href: "/about",
    children: [
      { label: "About the Forum", href: "/about", desc: "Mandate, identity and purpose" },
      { label: "History", href: "/about/history", desc: "Institutional memory through the years" },
      { label: "Governance", href: "/about/governance", desc: "How the Forum is governed" },
      { label: "Leadership", href: "/leadership", desc: "Hierarchy and office holders" },
      { label: "Membership", href: "/members", desc: "Who belongs to the Forum" },
      { label: "Secretariat", href: "/contact", desc: "Operational arm of the Forum" },
    ],
  },
  {
    label: "Policy & Knowledge", href: "/knowledge",
    children: [
      { label: "Knowledge Centre", href: "/knowledge", desc: "All publications and documents" },
      { label: "Policy Recommendations", href: "/knowledge?type=Policy Brief", desc: "Evidence-based recommendations" },
      { label: "Communiqués", href: "/knowledge?type=Communiqué", desc: "Official conference outcomes" },
      { label: "Reports & Research", href: "/knowledge?type=Report", desc: "Studies and institutional reports" },
    ],
  },
  { label: "Members", href: "/members", children: [
      { label: "Member Directory", href: "/members", desc: "Searchable institutional database" },
      { label: "Leadership", href: "/leadership", desc: "Current office holders" },
      { label: "How to Join", href: "/members#join", desc: "Membership information" },
  ]},
  {
    label: "Events & Conferences", href: "/events",
    children: [
      { label: "Upcoming Events", href: "/events", desc: "Conferences, dialogues, roundtables" },
      { label: "Annual Conference 2026", href: "/events/fifth-national-conference-2026", desc: "20–21 October 2026 · Abuja" },
      { label: "Conference Archive", href: "/events", desc: "Past convenings and records" },
    ],
  },
  {
    label: "Engagement", href: "/committees",
    children: [
      { label: "Committees", href: "/committees", desc: "Working arms of the Forum" },
      { label: "Partnerships", href: "/partnerships", desc: "Structured institutional relationships" },
      { label: "Peer Review & Mentorship", href: "/committees", desc: "Dialogue and capacity platforms" },
    ],
  },
  {
    label: "News & Media", href: "/news",
    children: [
      { label: "Latest News", href: "/news", desc: "Institutional updates" },
      { label: "Press Releases", href: "/news?cat=Press Release", desc: "Formal communications" },
      { label: "Statements", href: "/news?cat=Statement", desc: "Official positions" },
      { label: "Photo Gallery", href: "/media/photos", desc: "Structured conference photography" },
      { label: "Video Archive", href: "/media/videos", desc: "Recordings and statements" },
    ],
  },
];

function Seal({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="FFDGN home">
      <AssetImage
        src="/assets/brand/logo-whitebg.jpg"
        alt="FFDGN seal"
        width={88} height={88}
        className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-gold/60"
        sizes="44px"
      />
      <span className="leading-tight">
        <span className="block font-display text-[19px] font-bold text-forest-950">FFDGN</span>
        {!compact && <span className="block text-[10.5px] font-medium text-ink/60">Forum of Former Deputy Governors<br />of Nigeria</span>}
      </span>
    </Link>
  );
}

export function UtilityBar() {
  return (
    <div className="bg-forest-950 text-white/85 no-print">
      <div className="mx-auto flex max-w-shell items-center justify-between gap-4 px-5 py-1.5 text-[11.5px]">
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-flex items-center gap-1.5"><Phone size={12} /> +234 9 4612 3456</span>
          <span className="hidden md:inline-flex items-center gap-1.5"><Mail size={12} /> info@ffdgn.org.ng</span>
          <span className="inline-flex items-center gap-1.5"><MapPin size={12} /> Abuja, Nigeria</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/accessibility" className="hidden sm:inline hover:text-white">Accessibility</Link>
          <Link href="/search" className="inline-flex items-center gap-1 hover:text-white" aria-label="Search">
            <Search size={13} /> <span className="hidden sm:inline">Search</span>
          </Link>
          <span className="text-white/25" aria-hidden>|</span>
          <Link href="/portal" className="rounded-sm bg-gold px-2.5 py-1 font-semibold text-forest-950 hover:bg-gold-soft">Member Portal</Link>
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [banner, setBanner] = useState(true);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 8));
  return (
    <header className={`sticky top-0 z-50 border-b hairline bg-white/95 backdrop-blur no-print transition-shadow ${scrolled ? "shadow-card" : ""}`}>
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: DUR.base, ease: EASE_OUT }}
            className="overflow-hidden border-b border-gold/40 bg-forest-950 text-white"
          >
            <div className="mx-auto flex max-w-shell items-center gap-3 px-5 py-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/events/conference.png" alt="" aria-hidden className="hidden h-9 w-14 shrink-0 rounded-[2px] object-cover object-top sm:block" />
              <p className="min-w-0 flex-1 truncate text-[12.5px]">
                <span className="font-bold uppercase tracking-[0.14em] text-gold">5th National Conference</span>
                <span className="text-white/70"> · 20–21 October 2026 · Abuja Continental Hotel</span>
              </p>
              <Link href="/events/fifth-national-conference-2026" className="shrink-0 bg-gold px-3 py-1 text-[12px] font-bold text-forest-950 hover:bg-gold-soft">
                View flyer & register →
              </Link>
              <button onClick={() => setBanner(false)} aria-label="Dismiss announcement" className="shrink-0 p-1 text-white/60 hover:text-white">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mx-auto flex max-w-shell items-center justify-between gap-4 px-5 py-2.5">
        <Seal compact />
        <nav aria-label="Primary" className="hidden items-center gap-0 lg:flex">
          {NAV.map((item) => (
            <div key={item.label} className="relative shrink-0" onMouseEnter={() => setOpen(item.label)} onMouseLeave={() => setOpen(null)}>
              <Link
                href={item.href}
                aria-expanded={open === item.label}
                className={`flex items-center gap-1 whitespace-nowrap px-2.5 py-2 text-[12px] font-semibold uppercase tracking-wider ${pathname?.startsWith(item.href) ? "text-primary" : "text-ink/75 hover:text-primary"}`}
              >
                {item.label}{" "}
                <motion.span animate={{ rotate: open === item.label ? 180 : 0 }} transition={{ duration: DUR.fast, ease: EASE_OUT }} className="inline-flex">
                  <ChevronDown size={13} />
                </motion.span>
              </Link>
              <AnimatePresence>
                {open === item.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.22, ease: EASE_OUT }}
                    className="absolute left-0 top-full w-[340px] border hairline bg-white p-2 shadow-institutional"
                  >
                    <div className="h-[2px] w-full bg-gold/70" />
                    {item.children.map((c, i) => (
                      <motion.div key={c.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: DUR.fast, ease: EASE_OUT, delay: 0.03 * i }}>
                        <Link href={c.href} className="block px-4 py-3 hover:bg-paper">
                          <span className="block text-[14px] font-semibold text-forest-950">{c.label}</span>
                          <span className="block text-[12.5px] text-ink/60">{c.desc}</span>
                        </Link>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <AuthButton />
        </div>
        <button className="lg:hidden p-2" onClick={() => setMobile(!mobile)} aria-expanded={mobile} aria-label="Toggle menu">
          {mobile ? <X /> : <Menu />}
        </button>
      </div>
      <AnimatePresence>
        {mobile && (
          <motion.nav
            aria-label="Mobile"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: DUR.base, ease: EASE_OUT }}
            className="border-t hairline bg-white px-5 py-4 lg:hidden thin-scroll max-h-[70vh] overflow-auto"
          >
            {NAV.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DUR.base, ease: EASE_OUT, delay: 0.04 * i }}
                className="border-b hairline py-2"
              >
                <Link href={item.href} onClick={() => setMobile(false)} className="font-display text-lg text-forest-950">{item.label}</Link>
                <div className="mt-1 grid gap-1 pb-2">
                  {item.children.map((c) => (
                    <Link key={c.label} href={c.href} onClick={() => setMobile(false)} className="text-sm text-ink/70">— {c.label}</Link>
                  ))}
                </div>
              </motion.div>
            ))}
            <div className="flex gap-2 pt-4">
              <Link href="/contact" onClick={() => setMobile(false)} className="flex-1 border border-forest-900/25 px-4 py-2.5 text-center text-sm font-semibold">Contact</Link>
              <Link href="/login" onClick={() => setMobile(false)} className="flex-1 bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white">Sign in</Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

export function Footer() {
  const cols: { h: string; links: { l: string; h: string }[] }[] = [
    { h: "The Forum", links: [{ l: "About", h: "/about" }, { l: "Leadership", h: "/leadership" }, { l: "Governance", h: "/about/governance" }, { l: "Membership", h: "/members" }, { l: "Secretariat", h: "/contact" }] },
    { h: "Knowledge", links: [{ l: "Publications", h: "/knowledge" }, { l: "Policy", h: "/knowledge?type=Policy Brief" }, { l: "Reports", h: "/knowledge?type=Report" }, { l: "Communiqués", h: "/knowledge?type=Communiqué" }, { l: "Knowledge Centre", h: "/knowledge" }] },
    { h: "Engagement", links: [{ l: "Events", h: "/events" }, { l: "Committees", h: "/committees" }, { l: "Partnerships", h: "/partnerships" }, { l: "Contact", h: "/contact" }] },
    { h: "Resources", links: [{ l: "News & Media", h: "/news" }, { l: "Search", h: "/search" }, { l: "Privacy", h: "/privacy" }, { l: "Accessibility", h: "/accessibility" }] },
  ];
  return (
    <footer className="bg-forest-950 text-white">
      <div className="relative overflow-hidden border-y hairline-light bg-forest-950">
        <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: "url(/assets/hero/national.jpg)" }} aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-r from-forest-950 via-forest-950/70 to-forest-950/40" aria-hidden />
        <div className="relative mx-auto flex max-w-shell flex-col items-start justify-between gap-4 px-5 py-8 md:flex-row md:items-center">
          <div>
            <p className="eyebrow-light">The Secretariat</p>
            <p className="font-display mt-1 text-xl">Questions or partnership enquiries? Contact the Secretariat.</p>
          </div>
          <Link href="/contact" className="border border-gold/70 px-5 py-2.5 text-sm font-semibold text-gold hover:bg-gold hover:text-forest-950">Contact the Secretariat →</Link>
        </div>
      </div>
      <div className="mx-auto grid max-w-shell gap-10 px-5 py-12 md:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div>
          <Seal compact />
          <p className="mt-3 text-[13px] leading-relaxed text-white/65">A non-partisan forum of former Deputy Governors committed to Nigeria&rsquo;s unity, democratic governance and institutional excellence.</p>
          <p className="mt-4 text-[12px] text-white/50">Experience&nbsp;&nbsp;|&nbsp;&nbsp;Collaboration&nbsp;&nbsp;|&nbsp;&nbsp;Better Governance</p>
        </div>
        {cols.map((c) => (
          <nav key={c.h} aria-label={c.h}>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">{c.h}</h3>
            <ul className="mt-4 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.l}><Link href={l.h} className="text-[13.5px] text-white/70 hover:text-white link-underline">{l.l}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t hairline-light">
        <div className="mx-auto flex max-w-shell flex-col gap-2 px-5 py-4 text-[12px] text-white/50 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Forum of Former Deputy Governors of Nigeria. All rights reserved.</p>
          <p>Abuja, Nigeria · info@ffdgn.org.ng · Mon–Fri, 8:00 AM – 5:00 PM</p>
        </div>
      </div>
    </footer>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[12.5px] text-ink/55">
      <ol className="flex flex-wrap items-center gap-2">
        <li><Link href="/" className="hover:text-primary">Home</Link></li>
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <span aria-hidden className="text-gold-deep">/</span>
            {it.href ? <Link href={it.href} className="hover:text-primary">{it.label}</Link> : <span aria-current="page" className="text-ink/85 font-medium">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
