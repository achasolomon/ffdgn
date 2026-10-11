"use client";
import { useTemplateCopy } from "@/components/template-content-provider";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import Link from "next/link";
import type { Route } from "next";
import { motion } from "framer-motion";
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
  eyebrow, title, lede, align = "left", tone = "dark", as: Heading = "h2",
}: { eyebrow: string; title: React.ReactNode; lede?: string; align?: "left" | "center"; tone?: "dark" | "light"; as?: "h1" | "h2" | "h3" }) {
  const reduce = useReducedMotion();
  return (
    <motion.div initial={reduce || Heading !== "h1" ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.slow, ease: EASE_OUT }} className={`section-heading ${Heading === "h1" ? "page-heading" : ""} ${align === "center" ? "text-center mx-auto max-w-2xl" : "max-w-2xl"}`}>
      <p className={tone === "light" ? "eyebrow-light" : "eyebrow"}>{eyebrow}</p>
      <Heading className={`font-display mt-3 text-3xl md:text-[2.6rem] leading-[1.08] ${tone === "light" ? "text-white" : "text-forest-950"}`}>
        {title}
      </Heading>
      {lede && <p className={`mt-4 text-[15px] leading-relaxed ${tone === "light" ? "text-white/70" : "text-ink/70"}`}>{lede}</p>}
    </motion.div>
  );
}

export function GoldRule({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`h-[2px] w-10 bg-gold ${className}`} />;
}

export function EmptyState({
  title,
  description,
  body,
  action,
  eyebrow,
  href,
  actionLabel,
}: {
  title: string;
  description?: string;
  /** @deprecated use `description` */
  body?: string;
  action?: React.ReactNode;
  eyebrow?: string;
  /** Same-origin path; cast because callers build these from dynamic routes. */
  href?: Route;
  actionLabel?: string;
}) {
  const copy = useTemplateCopy("shared-ui");
  const link = action ?? (href && actionLabel ? (
    <Link href={href} className="inline-block border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white">
      {actionLabel}
    </Link>
  ) : undefined);
  return (
    <div className="flex h-full flex-col items-center justify-center border hairline bg-white px-8 py-14 text-center" role="status">
      <p className="eyebrow">{eyebrow ?? copy("field-001")}</p>
      <h3 className="font-display mt-2 text-2xl text-forest-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/65">{description ?? body}</p>
      {link && <div className="mt-6">{link}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse bg-ink/10 ${className}`} />;
}
