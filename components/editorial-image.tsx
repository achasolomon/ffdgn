"use client";
import { useReducedMotion } from "@/lib/use-reduced-motion";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { AssetImage } from "./media";

export function EditorialImage({ src, alt, className = "", sizes = "(max-width: 768px) 100vw, 50vw" }: { src: string; alt: string; className?: string; sizes?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : -24, reduce ? 0 : 24]);
  return <div ref={ref} className={`editorial-image relative overflow-hidden ${className}`}>
    <motion.div className="absolute -inset-y-8 inset-x-0" style={{ y }}>
      <AssetImage src={src} alt={alt} width={1600} height={1100} className="h-full w-full object-cover" sizes={sizes} />
    </motion.div>
  </div>;
}
