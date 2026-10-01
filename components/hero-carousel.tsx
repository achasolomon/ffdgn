"use client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DUR, EASE_OUT } from "@/lib/motion";

const SLIDES = [
  { src: "/assets/hero/fdg.jpg", alt: "Forum leaders at a national engagement" },
  { src: "/assets/hero/fdg2.jpg", alt: "Forum members in session" },
  { src: "/assets/hero/national.jpg", alt: "National institutional setting" },
];
const INTERVAL = 6000;

/** Hero image carousel — crossfade only (opacity), autoplay with pause-on-hover. */
export function HeroCarousel() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((dir: 1 | -1) => {
    setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (reduce || paused) return;
    const t = setInterval(() => go(1), INTERVAL);
    return () => clearInterval(t);
  }, [go, paused, reduce]);

  return (
    <div
      className="absolute -right-24 top-0 hidden h-full w-[58%] md:block"
      style={{ clipPath: "polygon(12% 0, 100% 0, 100% 100%, 0 100%)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={reduce ? "static" : index}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${SLIDES[reduce ? 0 : index].src})` }}
          role="img"
          aria-label={SLIDES[reduce ? 0 : index].alt}
          initial={reduce ? false : { opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 1.1, ease: EASE_OUT }}
        />
      </AnimatePresence>
      {/* Legibility gradient over photography */}
      <div className="absolute inset-0 bg-gradient-to-r from-forest-950 via-forest-950/45 to-forest-900/10" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-forest-950/70 to-transparent" aria-hidden />

      {!reduce && (
        <div className="absolute bottom-5 right-8 flex items-center gap-2" role="group" aria-label="Hero slides">
          <button onClick={() => go(-1)} aria-label="Previous slide" className="grid h-8 w-8 place-items-center rounded-full border border-white/40 text-white/80 hover:border-gold hover:text-gold">
            <ChevronLeft size={15} />
          </button>
          {SLIDES.map((s, i) => (
            <button
              key={s.src}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              className="group grid h-8 w-8 place-items-center"
            >
              <motion.span
                className={`block h-[3px] rounded-full ${i === index ? "bg-gold" : "bg-white/35 group-hover:bg-white/60"}`}
                animate={{ width: i === index ? 28 : 14 }}
                transition={{ duration: DUR.base, ease: EASE_OUT }}
              />
            </button>
          ))}
          <button onClick={() => go(1)} aria-label="Next slide" className="grid h-8 w-8 place-items-center rounded-full border border-white/40 text-white/80 hover:border-gold hover:text-gold">
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
