"use client";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import { HeroCarousel } from "./hero-carousel";
import { Magnetic } from "./motion";

const item = (delay: number) => ({
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: EASE_OUT, delay },
});

export function Hero({ settings }: { settings: Record<string, string> }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // Gentle parallax on the visual panel only — transform, GPU-friendly.
  const visualY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40]);

  const title = (settings["hero.title"] ?? "").split("\n");

  return (
    <section ref={ref} className="relative overflow-hidden bg-forest-950 text-white" aria-label="Introduction">
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-forest-950" />
      </div>
      <motion.div style={{ y: visualY }} className="absolute inset-0" aria-hidden={false}>
        <HeroCarousel />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-r from-forest-950 via-forest-950/78 to-transparent pointer-events-none" aria-hidden />

      <motion.div style={{ y: copyY }} className="relative mx-auto max-w-shell px-5 py-16 md:w-[52%] md:py-24 md:pl-[max(1.25rem,calc((100vw-1360px)/2+1.25rem))] md:mx-0">
        <motion.p className="eyebrow-light" {...item(0.05)}>{settings["hero.eyebrow"]}</motion.p>
        <h1 className="font-display mt-3 text-[2.6rem] leading-[1.04] md:text-[3.6rem]">
          {title.map((line, i) => (
            <span key={i} className="block overflow-hidden">
              <motion.span className="block" {...item(0.12 + i * 0.12)}>{line}</motion.span>
            </span>
          ))}
        </h1>
        <motion.p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/75" {...item(0.4)}>
          {settings["hero.lede"]}
        </motion.p>
        <motion.div className="mt-8 flex flex-wrap gap-3" {...item(0.52)}>
          <Magnetic>
            <Link href="/about" className="inline-flex items-center gap-2 bg-gold px-6 py-3 text-sm font-bold text-forest-950 hover:bg-gold-soft">
              {settings["hero.cta_primary"]} <ArrowRight size={16} />
            </Link>
          </Magnetic>
          <Magnetic>
            <Link href="/knowledge" className="inline-flex items-center gap-2 border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:border-gold hover:text-gold">
              {settings["hero.cta_secondary"]}
            </Link>
          </Magnetic>
        </motion.div>
        <motion.dl className="mt-10 flex flex-wrap gap-x-8 gap-y-2 text-[12px] uppercase tracking-[0.18em] text-white/50" {...item(0.64)}>
          <div className="flex gap-2"><dt className="text-gold">Est.</dt><dd>{settings["site.established"]}</dd></div>
          <div className="flex gap-2"><dt className="text-gold">Seat</dt><dd>{settings["site.seat"]}</dd></div>
          <div className="flex gap-2"><dt className="text-gold">Character</dt><dd>{settings["site.character"]}</dd></div>
        </motion.dl>
      </motion.div>
    </section>
  );
}
