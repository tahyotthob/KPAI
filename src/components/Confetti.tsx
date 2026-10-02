"use client";
import { m } from "framer-motion";
import { useMemo } from "react";

const COLORS = ["#c6ff3d", "#ffd400", "#ffffff", "#ff3d81", "#2ee6ff"];
const EMOJI = ["🎉", "💀", "🩸", "🇳🇬", "⭐"];

/** Two cannons shoot confetti + emojis up, then it tumbles down. Transform-only (GPU friendly). */
export default function Confetti({ count }: { count?: number }) {
  const pieces = useMemo(() => {
    const touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    const n = count ?? (touch ? 30 : 60);
    return Array.from({ length: n }, (_, i) => {
      const left = i % 2 === 0;
      const vw = typeof window !== "undefined" ? window.innerWidth : 400;
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      const dx = (left ? 1 : -1) * (vw * (0.15 + Math.random() * 0.6));
      return {
        x0: left ? 8 : vw - 8,
        dx,
        up: -(vh * (0.35 + Math.random() * 0.5)),
        down: vh * 0.15,
        delay: Math.random() * 0.35,
        dur: 2.2 + Math.random() * 1.4,
        rot: Math.random() * 900 - 450,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 7,
        emoji: i % 9 === 0 ? EMOJI[((i / 9) | 0) % EMOJI.length] : null,
      };
    });
  }, [count]);
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-40" aria-hidden>
      {pieces.map((p, i) => (
        <m.span
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.dx, y: [0, p.up, p.down], opacity: [1, 1, 0], rotate: p.rot }}
          transition={{ duration: p.dur, delay: p.delay, times: [0, 0.4, 1], ease: ["easeOut", "easeIn"] }}
          style={
            p.emoji
              ? { position: "absolute", left: p.x0, bottom: 0, fontSize: 22, willChange: "transform" }
              : { position: "absolute", left: p.x0, bottom: 0, width: p.w, height: p.w * 1.6, background: p.color, borderRadius: 2, willChange: "transform" }
          }
        >
          {p.emoji}
        </m.span>
      ))}
    </div>
  );
}
