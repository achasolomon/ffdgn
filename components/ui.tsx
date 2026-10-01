"use client";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT, DUR } from "@/lib/motion";

export function Reveal({
  children, className = "", delay = 0, y = 28,
}: {
  children: React.ReactNode; className?: string; delay?: number; y?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: DUR.slow, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  eyebrow, title, lede, align = "left", tone = "dark",
}: { eyebrow: string; title: React.ReactNode; lede?: string; align?: "left" | "center"; tone?: "dark" | "light" }) {
  return (
    <div className={align === "center" ? "text-center mx-auto max-w-2xl" : "max-w-2xl"}>
      <p className={tone === "light" ? "eyebrow-light" : "eyebrow"}>{eyebrow}</p>
      <h2 className={`font-display mt-3 text-3xl md:text-[2.6rem] leading-[1.08] ${tone === "light" ? "text-white" : "text-forest-950"}`}>
        {title}
      </h2>
      {lede && <p className={`mt-4 text-[15px] leading-relaxed ${tone === "light" ? "text-white/70" : "text-ink/70"}`}>{lede}</p>}
    </div>
  );
}

export function GoldRule({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`h-[2px] w-10 bg-gold ${className}`} />;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="border hairline bg-white px-8 py-14 text-center">
      <p className="eyebrow">No records</p>
      <h3 className="font-display mt-2 text-2xl text-forest-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/65">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse bg-ink/10 ${className}`} />;
}
