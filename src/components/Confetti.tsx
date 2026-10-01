"use client";
import { m } from "framer-motion";
import { useMemo } from "react";

const COLORS = ["#1faa59", "#f5b301", "#ffffff", "#ef4444", "#3b82f6"];
const EMOJI = ["🎉", "💀", "🩸", "🇳🇬", "⭐"];

/** Two cannons shoot confetti + emojis up, then it tumbles down. */
export default function Confetti({ count = 64 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const left = i % 2 === 0;
        const spread = Math.random() * 38;
        return {
          startX: left ? 4 : 96,
          x: left ? 6 + spread + Math.random() * 30 : 94 - spread - Math.random() * 30,
          peak: -(35 + Math.random() * 45),
          delay: Math.random() * 0.35,
          dur: 2.4 + Math.random() * 1.6,
          rot: Math.random() * 900 - 450,
          color: COLORS[i % COLORS.length],
          w: 6 + Math.random() * 7,
          emoji: i % 9 === 0 ? EMOJI[(i / 9) % EMOJI.length | 0] : null,
        };
      }),
    [count],
  );
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-40" aria-hidden>
      {pieces.map((p, i) => (
        <m.span
          key={i}
          initial={{ left: `${p.startX}%`, top: "100%", opacity: 1, rotate: 0 }}
          animate={{ left: `${p.x}%`, top: [`100%`, `${100 + p.peak}%`, "108%"], opacity: [1, 1, 0.9], rotate: p.rot }}
          transition={{ duration: p.dur, delay: p.delay, times: [0, 0.35, 1], ease: ["easeOut", "easeIn"] }}
          style={p.emoji ? { position: "absolute", fontSize: 22 } : { position: "absolute", width: p.w, height: p.w * 1.6, background: p.color, borderRadius: 2 }}
        >
          {p.emoji}
        </m.span>
      ))}
    </div>
  );
}
