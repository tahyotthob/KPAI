"use client";
import { motion } from "framer-motion";
import { useMemo } from "react";

const COLORS = ["#1faa59", "#f5b301", "#ffffff", "#ef4444", "#3b82f6"];

export default function Confetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      x: Math.random() * 100, delay: Math.random() * 0.6, dur: 2.2 + Math.random() * 1.8,
      rot: Math.random() * 720 - 360, color: COLORS[i % COLORS.length], w: 6 + Math.random() * 8,
    })),
    [count],
  );
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-40" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          initial={{ y: -30, opacity: 1, rotate: 0 }}
          animate={{ y: "105vh", opacity: [1, 1, 0.8], rotate: p.rot }}
          transition={{ duration: p.dur, delay: p.delay, ease: "easeIn" }}
          style={{ position: "absolute", left: `${p.x}%`, width: p.w, height: p.w * 1.6, background: p.color, borderRadius: 2 }}
        />
      ))}
    </div>
  );
}
