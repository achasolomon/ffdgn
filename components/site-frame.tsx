"use client";
import { useReducedMotion } from "@/lib/use-reduced-motion";

import { motion, useScroll, useSpring } from "framer-motion";
import { usePathname } from "next/navigation";

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const workspace = pathname?.startsWith("/admin") || pathname?.startsWith("/portal");
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return <div className={workspace ? "workspace-system" : "public-system"}>
    {!workspace && !reduce && <motion.div aria-hidden className="reading-progress no-print" style={{ scaleX: progress }} />}
    {children}
  </div>;
}
