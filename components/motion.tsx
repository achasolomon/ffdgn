"use client";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { animate, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { EASE_OUT, DUR, SPRING_CALM, staggerParent, staggerChild } from "@/lib/motion";

/**
 * Subtle magnetic wrapper — pulls its child a few px toward the cursor
 * with a calm spring, then releases. Transform-only.
 */
export function Magnetic({ children, strength = 5 }: { children: React.ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  if (reduce) return <div className="inline-block">{children}</div>;

  return (
    <motion.div
      ref={ref}
      className="inline-block"
      animate={{ x: offset.x, y: offset.y }}
      transition={SPRING_CALM}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setOffset({
          x: ((e.clientX - r.left) / r.width - 0.5) * 2 * strength,
          y: ((e.clientY - r.top) / r.height - 0.5) * 2 * strength,
        });
      }}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
    >
      {children}
    </motion.div>
  );
}

/** Animated institutional figure — tweens 0 → value on first view. */
export function CountUp({ to, duration = 1.4 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, to, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduce, to, duration]);

  // Reduced-motion readers get the final figure immediately, derived during
  // render rather than written back into state from an effect.
  const shown = reduce && inView ? to : val;
  return <span ref={ref}>{shown}</span>;
}

/** Staggered fade-in group for grids (children must be <StaggerItem>). */
export function Stagger({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={staggerParent}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-8% 0px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={staggerChild}>
      {children}
    </motion.div>
  );
}

/** Hoverable card shell — scale 1.02 lift, transform-only. */
export function HoverCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const inner = (
    <motion.div
      className={className}
      whileHover={reduce ? undefined : { scale: 1.02, transition: { duration: DUR.fast, ease: EASE_OUT } }}
      whileTap={reduce ? undefined : { scale: 0.995 }}
    >
      {children}
    </motion.div>
  );
  return inner;
}
