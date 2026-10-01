"use client";
import { m } from "framer-motion";

/** Circular countdown that turns red and throbs in the last 5 seconds. */
export default function TimerRing({ left, total }: { left: number; total: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const low = left <= 5;
  return (
    <m.div className="relative w-14 h-14 shrink-0" animate={low ? { scale: [1, 1.18, 1] } : { scale: 1 }} transition={low ? { repeat: Infinity, duration: 0.8 } : undefined} role="timer" aria-label={`${left} seconds left`}>
      <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="5" />
        <circle
          cx="24" cy="24" r={r} fill="none" strokeLinecap="round" strokeWidth="5"
          stroke={low ? "#ef4444" : "#f5b301"}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, left / total)))}
          style={{ transition: "stroke-dashoffset .3s linear, stroke .3s" }}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-num font-black ${low ? "text-blood" : "text-gold"}`}>{left}</span>
    </m.div>
  );
}
