"use client";
import { useTemplateCopy } from "@/components/template-content-provider";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { AssetImage } from "./media";
import { useReducedMotion } from "@/lib/use-reduced-motion";

export type ForumMoment = { src: string; alt: string; caption: string };

export function ForumMoments({ slides }: { slides: ForumMoment[] }) {
  const copy = useTemplateCopy("shared-forum-moments");

  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === "hidden");
    update(); document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (reduce || paused || hovered || focused || hidden || slides.length < 2) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % slides.length), 6500);
    return () => clearInterval(timer);
  }, [reduce, paused, hovered, focused, hidden, slides.length]);
  if (!slides.length) return null;
  const active = index % slides.length;
  const slide = slides[active];
  const go = (direction: number) => setIndex((value) => (value + direction + slides.length) % slides.length);
  return <section className="forum-moments" aria-label={copy("field-001")} aria-roledescription="carousel"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div className="moments-photo">
      <AnimatePresence initial={false}><motion.div key={slide.src} className="absolute inset-0" initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.8 }}>
        <AssetImage src={slide.src} alt={slide.alt} width={1600} height={1000} className="h-full w-full object-cover" sizes="(max-width: 1360px) 100vw, 1320px" priority={active === 0} />
      </motion.div></AnimatePresence>
      <span className="moments-label">{copy("field-002")}</span>
    </div>
    <div className="moments-caption">
      <div aria-live={paused || reduce || focused ? "polite" : "off"} aria-atomic="true"><p className="eyebrow-light">{copy("field-003")}{String(active + 1).padStart(2, "0")} {copy("field-004")}{String(slides.length).padStart(2, "0")}</p><p className="mt-2 font-display text-2xl text-white md:text-3xl">{slide.caption}</p></div>
      {slides.length > 1 && <div className="flex shrink-0 items-center gap-2" aria-label={copy("field-005")}>
        <button type="button" onClick={() => go(-1)} aria-label={copy("field-006")}><ArrowLeft size={18} /></button>
        <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? copy("field-007") : copy("field-008")} aria-pressed={paused} disabled={reduce}>{paused || reduce ? <Play size={16} /> : <Pause size={16} />}</button>
        <button type="button" onClick={() => go(1)} aria-label={copy("field-009")}><ArrowRight size={18} /></button>
      </div>}
    </div>
    {slides.length > 1 && <div className="moments-track" aria-hidden>{slides.map((item, position) => <span key={item.src} className={position === active ? "active" : ""} />)}</div>}
  </section>;
}
