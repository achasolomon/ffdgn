"use client";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { DUR, EASE_OUT } from "@/lib/motion";
import { DEFAULT_HERO_SLIDES, type HeroSlide } from "@/lib/hero-slides";

const INTERVAL = 6000;

/**
 * Hero image carousel — crossfade only (opacity), with a real pause control.
 *
 * Pause-on-hover alone does not satisfy WCAG 2.2.2 (Pause, Stop, Hide): hover
 * does not exist on touch, and a keyboard user who tabs into the controls cannot
 * stop the rotation either. So there is an explicit toggle, focus pauses
 * automatically, and the timer is suspended while the tab is hidden — a carousel
 * that advances in a background tab spends battery on nobody's screen.
 */
export function HeroCarousel({ slides = DEFAULT_HERO_SLIDES }: { slides?: HeroSlide[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);

  const go = useCallback((dir: 1 | -1) => {
    setIndex((i) => (i + dir + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (reduce || paused || hidden || slides.length < 2) return;
    const t = setInterval(() => go(1), INTERVAL);
    return () => clearInterval(t);
  }, [go, paused, reduce, hidden, slides.length]);

  const shown = reduce || !slides.length ? 0 : index % slides.length;
  if (!slides.length) return null;

  return (
    <div
      /* Mobile: full-bleed backdrop. Desktop: the original right-hand panel.
         `md:left-auto` is load-bearing — `left:0` would otherwise win over
         `right:-6rem` on this over-constrained absolute box and shift the panel
         across the hero. */
      className="absolute left-0 top-0 h-full w-full md:left-auto md:-right-24 md:w-[58%] md:[clip-path:polygon(12%_0,100%_0,100%_100%,0_100%)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={slides[shown].src}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${slides[shown].src})` }}
          role="img"
          aria-label={slides[shown].alt}
          initial={reduce ? false : { opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 1.1, ease: EASE_OUT }}
        />
      </AnimatePresence>
      {/* Legibility gradient over photography. Vertical on mobile, where the
          slide sits behind the full-width copy, so the text stays readable
          across the whole width rather than fading out to bare image. */}
      <div className="absolute inset-0 bg-gradient-to-b from-forest-950/65 via-forest-950/20 to-forest-950/50 md:bg-gradient-to-r md:from-forest-950 md:via-forest-950/20 md:to-transparent" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-forest-950/70 to-transparent" aria-hidden />

      {!reduce && slides.length > 1 && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 md:bottom-5 md:right-8" role="group" aria-label="Hero slides">
          <button onClick={() => go(-1)} aria-label="Previous slide" className="grid h-8 w-8 place-items-center rounded-full border border-white/40 text-white/80 hover:border-gold hover:text-gold">
            <ChevronLeft size={15} />
          </button>
          {slides.map((s, i) => (
            <button
              key={s.src}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1} of ${slides.length}`}
              aria-current={i === shown}
              className="group grid h-8 w-8 place-items-center"
            >
              <motion.span
                className={`block h-[3px] rounded-full ${i === shown ? "bg-gold" : "bg-white/35 group-hover:bg-white/60"}`}
                animate={{ width: i === shown ? 28 : 14 }}
                transition={{ duration: DUR.base, ease: EASE_OUT }}
              />
            </button>
          ))}
          <button onClick={() => go(1)} aria-label="Next slide" className="grid h-8 w-8 place-items-center rounded-full border border-white/40 text-white/80 hover:border-gold hover:text-gold">
            <ChevronRight size={15} />
          </button>
          <button
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Resume slideshow" : "Pause slideshow"}
            aria-pressed={paused}
            className="ml-1 grid h-8 w-8 place-items-center rounded-full border border-white/40 text-white/80 hover:border-gold hover:text-gold"
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}
