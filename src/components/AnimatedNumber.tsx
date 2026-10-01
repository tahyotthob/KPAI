"use client";
import { animate } from "framer-motion";
import { useEffect, useState } from "react";

/** Counts up from 0 to `value` (e.g. KPAI Points earned). */
export default function AnimatedNumber({ value, prefix = "", duration = 1.1 }: { value: number; prefix?: string; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const c = animate(0, value, { duration, ease: "easeOut", onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [value, duration]);
  return <span className="font-num tabular-nums">{prefix}{n}</span>;
}
