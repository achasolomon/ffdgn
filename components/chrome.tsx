"use client";
import { useTemplateCopy } from "@/components/template-content-provider";
import { asRoute as templateRoute } from "@/lib/routes";

import Link from "next/link";
import type { Route } from "next";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { AuthButton } from "./auth-button";
import { AssetImage } from "./media";
import { DUR, EASE_OUT } from "@/lib/motion";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X, Search, Phone, Mail, MapPin } from "lucide-react";
import {
  NAV,
  FOOTER_COLUMNS,
  CONFERENCE_TITLE,
  CONFERENCE_HREF,
  CONFERENCE_BANNER_DETAIL,
  PORTAL_ROOT,
  asRoute,
  type NavItem,
} from "@/lib/routes";

type SiteSettings = Record<string, string>;

/**
 * Brand lockup. `size` exists because the header logo row sits beside a
 * full-width banner and wants a seal at that scale, while the footer carries
 * the same lockup at a fraction of the size — one fixed size leaves either the
 * header or the footer looking wrong.
 */
function Seal({ compact = false, size = "lg", settings = {} }: { compact?: boolean; size?: "lg" | "sm"; settings?: SiteSettings }) {
  const copy = useTemplateCopy("shared-chrome");

  const large = size === "lg";
  return (
    <Link href="/" className="flex items-center gap-3" aria-label={copy("field-001")}>
      <AssetImage
        src={settings["site.logo"] || "/assets/brand/logo-whitebg.jpg"}
        alt={settings["site.logo_alt"] || "FFDGN seal"}
        width={large ? 240 : 88}
        height={large ? 240 : 88}
        className={`${large ? "h-24 w-24" : "h-11 w-11"} shrink-0 rounded-full object-cover ring-1 ring-gold/60`}
        sizes={large ? "96px" : "44px"}
      />
      <span className="leading-tight">
        <span className={`block font-display ${large ? "text-[34px]" : "text-[19px]"} font-bold text-forest-950`}>
          {settings["site.short_name"] || "FFDGN"}
        </span>
        {!compact && (
          <span className={`block font-medium text-ink/60 ${large ? "text-[12.5px]" : "text-[10.5px]"}`}>
            {settings["site.title"] || "Forum of Former Deputy Governors of Nigeria"}
          </span>
        )}
      </span>
    </Link>
  );
}

/**
 * The current-event ad banner in the right-hand column of the full-width logo
 * row. Every field comes from `site_settings` (whitelisted under `header.ad_*`),
 * so the secretariat can change what the Forum advertises without a deploy.
 *
 * Two shapes, chosen by whether an image is configured:
 *
 *   image set   — the artwork *is* the banner. It renders at its natural ratio,
 *                 width 100%, un-cropped, so a 4.66:1 strip fills the column
 *                 and a portrait crop is not squashed. The headline fields then
 *                 serve as the link's accessible name rather than as a second
 *                 layer of type on top of the artwork, which would fight it.
 *   no image    — a typographic banner built from the same fields.
 *
 * The whole banner is one link; the call-to-action is a span styled as a
 * button, so the markup never nests an anchor inside an anchor.
 *
 * Returns null when there is neither an image nor a title: an unset banner
 * drops out of the row instead of leaving an empty box beside the logo.
 */
function AdBanner({ settings }: { settings: SiteSettings }) {
  const copy = useTemplateCopy("shared-chrome");
  const title = settings["header.ad_title"]?.trim();
  const eyebrow = settings["header.ad_eyebrow"]?.trim();
  const detail = settings["header.ad_detail"]?.trim();
  const cta = settings["header.ad_cta"]?.trim();
  const image = settings["header.ad_image"]?.trim();
  const href = settings["header.ad_href"]?.trim() || "/events/fifth-national-conference-2026";

  if (!image && !title) return null;

  const label = [eyebrow, title, detail].filter(Boolean).join(" — ") || "Featured event";

  const ctaStyle =
    "shrink-0 whitespace-nowrap bg-gold px-3 py-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-forest-950 group-hover:bg-gold-soft";

  if (image) {
    return (
      <Link
        href={asRoute(href)}
        className="group relative block min-w-0 overflow-hidden bg-forest-950 transition-shadow hover:shadow-institutional focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        aria-label={label}
      >
        <AssetImage
          src={image}
          alt={title ?? copy("field-024")}
          width={4201}
          height={901}
          className="block h-auto w-full"
          sizes="(min-width:1024px) 74vw, 100vw"
          priority
        />
        {cta ? (
          <>
            <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-forest-950/70 to-transparent" />
            <span aria-hidden className={`absolute bottom-3 right-3 ${ctaStyle}`}>{cta}</span>
          </>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href={asRoute(href)}
      className="group relative flex min-w-0 items-stretch overflow-hidden bg-forest-950 transition-shadow hover:shadow-institutional focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      aria-label={label}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-gold" />
      <span className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3 sm:px-5">
        <span className="min-w-0 flex-1">
          {eyebrow ? (
            <span className="block truncate text-[10px] font-bold uppercase tracking-[0.16em] text-gold">{eyebrow}</span>
          ) : null}
          <span className="block truncate font-display text-[17px] font-semibold leading-tight text-white sm:text-[19px]">{title}</span>
          {detail ? <span className="mt-0.5 block truncate text-[12.5px] text-white/70">{detail}</span> : null}
        </span>
        {cta ? <span className={ctaStyle}>{cta}</span> : null}
      </span>
    </Link>
  );
}

export function UtilityBar({ settings = {} }: { settings?: SiteSettings }) {
  const copy = useTemplateCopy("shared-chrome");

  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  const phone = settings["site.phone"] ?? "+234 9 4612 3456";
  const email = settings["site.email"] ?? "info@ffdgn.org.ng";
  const address = settings["site.address"] ?? "Abuja, Nigeria";

  return (
    <div className="bg-forest-950 text-white/85 no-print">
      <div className="mx-auto flex max-w-shell items-center justify-between gap-4 px-5 py-1.5 text-[11.5px]">
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-flex items-center gap-1.5"><Phone size={12} /> {phone}</span>
          <span className="hidden md:inline-flex items-center gap-1.5"><Mail size={12} /> {email}</span>
          <span className="inline-flex items-center gap-1.5"><MapPin size={12} /> {address}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href={templateRoute(copy("field-002"))} className="hidden sm:inline hover:text-white">{copy("field-003")}</Link>
          <Link href={templateRoute(copy("field-004"))} className="inline-flex items-center gap-1 hover:text-white" aria-label={copy("field-005")}>
            <Search size={13} /> <span className="hidden sm:inline">{copy("field-005")}</span>
          </Link>
          <span className="text-white/25" aria-hidden>{copy("field-006")}</span>
          <Link href={PORTAL_ROOT} className="rounded-sm bg-gold px-2.5 py-1 font-semibold text-forest-950 hover:bg-gold-soft">{copy("field-007")}</Link>
        </div>
      </div>
    </div>
  );
}

export function Header({ settings = {}, navigation = NAV }: { settings?: SiteSettings; navigation?: NavItem[] }) {
  const copy = useTemplateCopy("shared-chrome");

  const pathname = usePathname();
  const conferenceTitle = settings["event.conference_title"] ?? CONFERENCE_TITLE;
  const conferenceHref = asRoute(settings["event.conference_href"] ?? CONFERENCE_HREF);
  const conferenceDetail = settings["event.conference_banner_detail"] ?? CONFERENCE_BANNER_DETAIL;
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [banner, setBanner] = useState(true);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 8));

  // Refs to the open trigger and the first item in its panel, so Escape can put
  // focus back where it came from and ArrowDown can descend into the panel.
  const triggerRefs = useRef(new Map<string, HTMLAnchorElement>());
  const panelItemRefs = useRef(new Map<string, HTMLAnchorElement>());

  // A panel must not survive navigation. Without this, opening the mega-menu with
  // the keyboard, arrowing to a child and pressing Enter leaves the panel open on
  // the page you just landed on.
  //
  // Reset during render rather than in an effect: React's documented pattern for
  // "adjust state when a prop changes". An effect would re-open and re-close the
  // menu in a second render pass, and would paint the stale panel once.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(null);
    setMobile(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Escape closes and returns focus to the trigger that opened it, so the
      // next Tab continues from the top of the menu rather than from the body.
      triggerRefs.current.get(open)?.focus();
      setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname?.startsWith("/admin")) return null;

  function onTriggerKeyDown(label: string, e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      // Enter/Space must still navigate on a Link, so those are handled by
      // focusing the panel in addition to the browser's default navigation.
      if (e.key === "ArrowDown") e.preventDefault();
      setOpen(label);
      requestAnimationFrame(() => panelItemRefs.current.get(label)?.focus());
    }
  }

  return (
    <>
      {/*
        Masthead: the announcement strip plus the logo/ad row. It is not sticky
        on purpose — the page keeps its full-width banner only at the top of the
        document, and the navigation bar below carries the sticky behaviour.

        The nav has to be a sibling of this element rather than a child of it:
        `position: sticky` only holds while the element's own parent is on
        screen, so a nav nested in here would scroll away along with it.
      */}
      <header className="bg-white/95 backdrop-blur no-print">
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
                <img src={copy("field-008")} alt="" aria-hidden className="hidden h-9 w-14 shrink-0 rounded-[2px] object-cover object-top sm:block" />
                <p className="min-w-0 flex-1 truncate text-[12.5px]">
                  <span className="font-bold uppercase tracking-[0.14em] text-gold">{conferenceTitle}</span>
                  <span className="text-white/70"> {copy("field-009")}{conferenceDetail}</span>
                </p>
                <Link href={conferenceHref} className="shrink-0 bg-gold px-3 py-1 text-[12px] font-bold text-forest-950 hover:bg-gold-soft">
                  {copy("field-010")}</Link>
                <button onClick={() => setBanner(false)} aria-label={copy("field-011")} className="shrink-0 p-1 text-white/60 hover:text-white">
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/*
          Full-width logo row. Two columns: the seal on the left, the current-event
          ad banner on the right. `lg:grid-cols-[...]` gives the banner roughly
          three-quarters of the row so it reads as a banner rather than a badge,
          while `grid-cols-1` stacks them on narrow screens where neither column
          could hold a readable banner side by side.
        */}
        <div className="mx-auto max-w-shell px-5 py-6 lg:py-8">
          <div className="grid grid-cols-1 items-center gap-4 sm:gap-5 lg:grid-cols-[minmax(260px,0.65fr)_minmax(0,1.8fr)]">
            <Seal settings={settings} />
            <AdBanner settings={settings} />
          </div>
        </div>
      </header>
      {/*
        The navigation bar is the only sticky part of the header. `z-50` keeps
        it above page content and above the masthead while it is still on
        screen; `scrolled` drives the shadow once it has taken over from the
        masthead.
      */}
      <div className={`sticky top-0 z-50 border-b hairline bg-white/95 backdrop-blur no-print transition-shadow ${scrolled ? "shadow-card" : ""}`}>
        <div className="mx-auto flex max-w-shell items-stretch gap-0 border-t border-gold/50 bg-forest-950 px-0">
          <nav aria-label={copy("field-012")} className="hidden min-w-0 flex-1 items-stretch lg:flex">
            {navigation.map((item) => (
              <div
                key={item.label}
                className="relative min-w-0 flex-1"
                onMouseEnter={() => setOpen(item.label)}
                onMouseLeave={() => setOpen(null)}
                /* Focus opens the panel as well as hover, so it is reachable without
                   a pointer. `onBlur` fires when focus leaves the whole subtree, so
                   tabbing past the last child closes it rather than leaving a panel
                   stranded over the page. */
                onFocus={() => setOpen(item.label)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(null);
                }}
              >
                <Link
                  href={item.href}
                  ref={(el) => {
                    if (el) triggerRefs.current.set(item.label, el);
                    else triggerRefs.current.delete(item.label);
                  }}
                  aria-expanded={open === item.label}
                  aria-haspopup="true"
                  onKeyDown={(e) => onTriggerKeyDown(item.label, e)}
                  className={`flex h-full min-h-[72px] items-center justify-center gap-1 border-r border-white/15 px-2 py-5 text-center text-[11px] xl:text-[12px] font-semibold uppercase tracking-wide ${pathname?.startsWith(item.href) ? "bg-gold text-forest-950" : "text-white hover:bg-forest-800"}`}
                >
                  {item.label}{" "}
                  <motion.span animate={{ rotate: open === item.label ? 180 : 0 }} transition={{ duration: DUR.fast, ease: EASE_OUT }} className="inline-flex" aria-hidden>
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
                          <Link
                            href={c.href}
                            ref={
                              i === 0
                                ? (el) => {
                                    if (el) panelItemRefs.current.set(item.label, el);
                                    else panelItemRefs.current.delete(item.label);
                                  }
                                : undefined
                            }
                            className="block px-4 py-3 hover:bg-paper"
                          >
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
          <div className="hidden shrink-0 items-center gap-2 bg-white px-3 lg:flex">
            <AuthButton />
          </div>
          <button className="lg:hidden p-4 text-white" onClick={() => setMobile(!mobile)} aria-expanded={mobile} aria-label={copy("field-013")}>
            {mobile ? <X /> : <Menu />}
          </button>
        </div>
        <AnimatePresence>
          {mobile && (
            <motion.nav
              aria-label={copy("field-014")}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: DUR.base, ease: EASE_OUT }}
              className="border-t hairline bg-white px-5 py-4 lg:hidden thin-scroll max-h-[70vh] overflow-auto"
            >
              {navigation.map((item, i) => (
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
                      <Link key={c.label} href={c.href} onClick={() => setMobile(false)} className="text-sm text-ink/70">{copy("field-015")}{c.label}</Link>
                    ))}
                  </div>
                </motion.div>
              ))}
              <div className="flex gap-2 pt-4">
                <Link href={templateRoute(copy("field-016"))} onClick={() => setMobile(false)} className="flex-1 border border-forest-900/25 px-4 py-2.5 text-center text-sm font-semibold">{copy("field-017")}</Link>
                <Link href={templateRoute(copy("field-018"))} onClick={() => setMobile(false)} className="flex-1 bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white">{copy("field-019")}</Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export function Footer({ settings = {}, columns = FOOTER_COLUMNS }: { settings?: SiteSettings; columns?: typeof FOOTER_COLUMNS }) {
  const copy = useTemplateCopy("shared-chrome");

  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  const email = settings["site.email"] ?? "info@ffdgn.org.ng";
  const address = settings["site.address"] ?? "Abuja, Nigeria";
  const hours = settings["contact.hours"] ?? "Mon–Fri, 8:00 AM – 5:00 PM";

  return (
    <footer className="bg-forest-950 text-white">
      <div className="relative overflow-hidden border-y hairline-light bg-forest-950">
        <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: `url(${settings["footer.cta_image"] || "/assets/hero/national.jpg"})` }} aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-r from-forest-950 via-forest-950/70 to-forest-950/40" aria-hidden />
        <div className="relative mx-auto flex max-w-shell flex-col items-start justify-between gap-4 px-5 py-8 md:flex-row md:items-center">
          <div>
            <p className="eyebrow-light">{settings["footer.cta_label"] || "The Secretariat"}</p>
            <p className="font-display mt-1 text-xl">{settings["footer.cta_title"] || "Questions about the Forum? Contact the Secretariat."}</p>
          </div>
          <Link href={asRoute(settings["footer.cta_href"] || "/contact")} className="border border-gold/70 px-5 py-2.5 text-sm font-semibold text-gold hover:bg-gold hover:text-forest-950">{settings["footer.cta_button"] || "Contact the Secretariat"} {copy("field-020")}</Link>
        </div>
      </div>
      <div className="mx-auto grid max-w-shell gap-10 px-5 py-12 md:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div>
          <Seal compact size="sm" settings={settings} />
          <p className="mt-3 text-[13px] leading-relaxed text-white/65">{settings["footer.description"] || "A non-partisan forum of former Deputy Governors committed to unity and democratic governance."}</p>
          <p className="mt-4 text-[12px] text-white/50">{settings["footer.motto"] || "Experience | Collaboration | Better Governance"}</p>
        </div>
        {columns.map((c) => (
          <nav key={c.heading} aria-label={c.heading}>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">{c.heading}</h3>
            <ul className="mt-4 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.label}><Link href={l.href} className="text-[13.5px] text-white/70 hover:text-white link-underline">{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t hairline-light">
        <div className="mx-auto flex max-w-shell flex-col gap-2 px-5 py-4 text-[12px] text-white/50 md:flex-row md:items-center md:justify-between">
          <p>{settings["footer.copyright"] || "© FFDGN. All rights reserved."}</p>
          <p>{address} {copy("field-009")}{email} {copy("field-009")}{hours}</p>
        </div>
      </div>
    </footer>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: Route }[] }) {
  const copy = useTemplateCopy("shared-chrome");

  return (
    <nav aria-label={copy("field-021")} className="text-[12.5px] text-ink/55">
      <ol className="flex flex-wrap items-center gap-2">
        <li><Link href="/" className="hover:text-primary">{copy("field-022")}</Link></li>
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <span aria-hidden className="text-gold-deep">{copy("field-023")}</span>
            {it.href ? <Link href={it.href} className="hover:text-primary">{it.label}</Link> : <span aria-current="page" className="text-ink/85 font-medium">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
