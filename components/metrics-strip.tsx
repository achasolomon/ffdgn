"use client";
import { useTemplateCopy } from "@/components/template-content-provider";

import Link from "next/link";
import type { Route } from "next";
import { CountUp } from "./motion";

function split(value: string): { num: number; suffix: string } {
  const m = value.match(/^(\d+)(.*)$/);
  if (!m) return { num: 0, suffix: value };
  return { num: parseInt(m[1], 10), suffix: m[2] };
}

/**
 * `href` originates in site_metric, which the CMS validates as a same-origin
 * path on write. The cast is safe because the value can only be a path — but it
 * is a cast rather than a plain string because that invariant lives in the
 * write path, not the type system. Widening `href` back to `string` would let an
 * arbitrary URL reach this link.
 */
export function MetricsStrip({ metrics }: { metrics: { value: string; label: string; href: string }[] }) {
  const copy = useTemplateCopy("shared-metrics-strip");

  return (
    <section aria-label={copy("field-001")} className="institutional-metrics border-b hairline bg-white">
      <div className="mx-auto grid max-w-shell grid-cols-2 divide-x divide-ink/10 px-5 md:grid-cols-4">
        {metrics.map((m) => {
          const { num, suffix } = split(m.value);
          return (
            <Link key={m.label} href={m.href as Route} className="group px-4 py-6 md:px-8">
              <p className="font-display text-3xl text-forest-950 md:text-4xl">
                <CountUp to={num} />
                {suffix && <span className="text-gold-deep">{suffix}</span>}
              </p>
              <p className="mt-1 text-[12.5px] font-medium leading-snug text-ink/60 group-hover:text-primary">{m.label}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
