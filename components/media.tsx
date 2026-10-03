"use client";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, X, Expand, ChevronLeft, ChevronRight } from "lucide-react";
import type { MediaItem } from "@/lib/repo";
import { DUR, EASE_OUT, SPRING_SNAPPY, overlay, panel } from "@/lib/motion";

/* Institutional image with caption/credit discipline and graceful fallback. */
export function AssetImage({
  src, alt, width = 1280, height = 720, className = "", priority = false, sizes,
}: {
  src: string; alt: string; width?: number; height?: number;
  className?: string; priority?: boolean; sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`grid place-items-center bg-forest-900 ${className}`} role="img" aria-label={alt}>
        <span className="font-display p-6 text-center text-lg text-gold/80">FFDGN</span>
      </div>
    );
  }
  return (
    <Image
      src={src} alt={alt} width={width} height={height} priority={priority} sizes={sizes}
      className={className} onError={() => setFailed(true)}
    />
  );
}

export function MediaCredit({ item, light = false }: { item: Pick<MediaItem, "photographer" | "copyright">; light?: boolean }) {
  if (!item.photographer && !item.copyright) return null;
  return (
    <p className={`mt-1.5 text-[11.5px] ${light ? "text-white/50" : "text-ink/45"}`}>
      {[item.photographer, item.copyright].filter(Boolean).join(" · ")}
    </p>
  );
}

/* Privacy-hardened video player: YouTube nocookie / Vimeo / direct file. */
export function VideoPlayer({ item }: { item: MediaItem }) {
  const [playing, setPlaying] = useState(false);
  const embed =
    item.provider === "YOUTUBE" && item.providerId
      ? `https://www.youtube-nocookie.com/embed/${item.providerId}?rel=0`
      : item.provider === "VIMEO" && item.providerId
        ? `https://player.vimeo.com/video/${item.providerId}`
        : null;

  if (playing && embed) {
    return (
      <div className="aspect-video w-full bg-black">
        <iframe
          src={embed} title={item.title} className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen loading="lazy"
        />
      </div>
    );
  }
  if (playing && item.provider === "FILE") {
    return (
      <video src={item.url} controls playsInline preload="metadata" className="aspect-video w-full bg-black" aria-label={item.title} />
    );
  }
  return (
    <button
      onClick={() => setPlaying(true)} aria-label={`Play video: ${item.title}`}
      className="group relative block aspect-video w-full overflow-hidden bg-forest-950 text-left"
    >
      {item.thumbnailUrl ? (
        <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover opacity-80 group-hover:opacity-60" loading="lazy" />
      ) : (
        <span className="absolute inset-0 grid place-items-center">
          <span className="font-display px-6 text-center text-2xl text-gold/70">{item.title}</span>
        </span>
      )}
      <span className="absolute inset-0 grid place-items-center">
        <motion.span
          className="grid h-16 w-16 place-items-center rounded-full bg-gold text-forest-950"
          whileHover={{ scale: 1.12, transition: { duration: DUR.fast, ease: EASE_OUT } }}
          whileTap={{ scale: 0.94 }}
          transition={SPRING_SNAPPY}
        >
          <Play size={26} fill="currentColor" />
        </motion.span>
      </span>
      <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10">
        <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-gold">Video · {item.category}</span>
        <span className="block font-semibold text-white">{item.title}</span>
      </span>
    </button>
  );
}

/* Gallery grid with accessible lightbox. */
export function Gallery({ items, columns = 3 }: { items: MediaItem[]; columns?: 3 | 4 }) {
  const [active, setActive] = useState<MediaItem | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // The tile that opened the viewer, so focus can go back where it came from.
  // Closing without restoring leaves a keyboard user at the top of the document
  // with no indication why they were teleported.
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setActive(null);
    openerRef.current?.focus();
    openerRef.current = null;
  }, []);

  const step = useCallback(
    (delta: number) => {
      setActive((current) => {
        if (!current) return current;
        const i = items.findIndex((it) => it.id === current.id);
        if (i < 0) return current;
        const next = items[(i + delta + items.length) % items.length];
        return next;
      });
    },
    [items],
  );

  useEffect(() => {
    if (!active) return;

    // Focus the dialog itself rather than a control inside it: the first Tab then
    // lands on the close button, which is the only control, rather than skipping
    // past the viewer into the page behind it.
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
        return;
      }
      if (e.key !== "Tab") return;

      // Trap Tab inside the viewer. Without this, Tab walks through every link in
      // the page underneath while the overlay is still visually on top.
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && (activeEl === first || activeEl === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    // Stop the page behind scrolling under a fixed overlay, which otherwise lets
    // a trackpad user scroll the document while looking at a still image.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [active, close, step]);

  if (!items.length) {
    return (
      <div className="border hairline bg-white px-8 py-12 text-center">
        <p className="eyebrow">No photographs yet</p>
        <p className="mt-2 text-sm text-ink/60">Conference photography will be published here by the Secretariat after institutional review.</p>
      </div>
    );
  }
  return (
    <>
      <ul className={`grid gap-4 sm:grid-cols-2 ${columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {items.map((it, i) => (
          <li key={it.id}>
            <motion.button
              onClick={(e) => {
                openerRef.current = e.currentTarget;
                setActive(it);
              }}
              className="group block w-full text-left"
              aria-label={`View photograph: ${it.title}${i + 1} of ${items.length}`}
              whileHover={{ scale: 1.02, transition: { duration: DUR.fast, ease: EASE_OUT } }}
              whileTap={{ scale: 0.99 }}
            >
              <span className="block overflow-hidden border hairline bg-forest-900/5">
                <AssetImage src={it.url} alt={it.altText ?? it.title} width={800} height={600} className="aspect-[4/3] w-full object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
              </span>
              <span className="mt-2 flex items-start justify-between gap-2">
                <span className="text-[13px] font-semibold leading-snug text-forest-950 group-hover:text-primary">{it.description || it.title}</span>
                <Expand size={14} className="mt-0.5 shrink-0 text-ink/35" />
              </span>
            </motion.button>
          </li>
        ))}
      </ul>
      <AnimatePresence>
        {active && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={active.title}
            ref={dialogRef}
            tabIndex={-1}
            className="fixed inset-0 z-[90] grid place-items-center bg-forest-950/90 p-4 md:p-10"
            variants={overlay} initial="hidden" animate="visible" exit="exit"
            onClick={close}
          >
            <motion.figure
              className="max-h-full max-w-5xl overflow-auto bg-white p-3"
              variants={panel} initial="hidden" animate="visible" exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <AssetImage src={active.url} alt={active.altText ?? active.title} width={1280} height={800} className="max-h-[70vh] w-auto max-w-full object-contain" />
              <figcaption className="flex items-start justify-between gap-4 px-2 py-3">
                <span>
                  <span className="block font-semibold text-forest-950">{active.title}</span>
                  {active.description && <span className="mt-2 block text-sm leading-relaxed text-ink/65">{active.description}</span>}
                  <MediaCredit item={active} />
                  {items.length > 1 && (
                    <span className="mt-1 block text-[11.5px] text-ink/45">
                      {items.findIndex((it) => it.id === active.id) + 1} of {items.length} · use the arrow keys to move between photographs
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {items.length > 1 && (
                    <>
                      <button onClick={() => step(-1)} className="border hairline p-2 hover:border-primary" aria-label="Previous photograph">
                        <ChevronLeft size={16} />
                      </button>
                      <button onClick={() => step(1)} className="border hairline p-2 hover:border-primary" aria-label="Next photograph">
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}
                  <button onClick={close} className="border hairline p-2 hover:border-primary" aria-label="Close viewer">
                    <X size={16} />
                  </button>
                </span>
              </figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
