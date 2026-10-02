"use client";
import { AnimatePresence, m } from "framer-motion";
import type { Move } from "@/lib/game";

export function FeedbackIcons({ dead, wounded }: { dead: number; wounded: number }) {
  if (!dead && !wounded) return <span className="text-white/60 text-sm">nothing 🙅</span>;
  const icons = [...Array(dead).fill("💀"), ...Array(wounded).fill("🩸")] as string[];
  return (
    <span className="tracking-tight inline-flex" aria-hidden>
      {icons.map((ic, i) => (
        <m.span
          key={i}
          className="inline-block"
          initial={{ scale: 0, rotate: -40, y: -8 }}
          animate={{ scale: 1, rotate: 0, y: 0 }}
          transition={{ type: "spring", stiffness: 520, damping: 14, delay: 0.12 + i * 0.09 }}
        >
          {ic}
        </m.span>
      ))}
    </span>
  );
}

export const feedbackText = (dead: number, wounded: number) => `${dead} Dead ${wounded} Wounded`;

export default function HistoryPanel({ moves, title, hideGuess }: { moves: Move[]; title?: string; hideGuess?: boolean }) {
  return (
    <div className="card p-3">
      {title && <div className="text-xs uppercase tracking-widest text-white/50 mb-2">{title}</div>}
      {moves.length === 0 && <div className="text-white/60 text-sm py-3 text-center">No guesses yet. Oya start!</div>}
      <ol className="max-h-40 [@media(min-height:760px)]:max-h-64 overflow-y-auto flex flex-col gap-2 pr-1" aria-live="polite">
        <AnimatePresence initial={false}>
          {moves
            .map((mv, i) => ({ mv, n: i + 1 }))
            .reverse()
            .map(({ mv, n }) => (
              <m.li
                key={n}
                initial={{ scale: 0.6, opacity: 0, y: -12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
                className="flex items-center gap-3 rounded-xl bg-ink px-3 py-2"
              >
                <span className="text-white/60 w-6 text-sm font-num">#{n}</span>
                <span className="font-num text-2xl font-black tracking-widest text-gold">
                  {hideGuess ? "••••" : mv.guess}
                </span>
                <span className="ml-auto text-right">
                  <div className="text-lg leading-none">
                    <FeedbackIcons dead={mv.dead} wounded={mv.wounded} />
                  </div>
                  <div className="text-xs text-white/70 mt-1">{feedbackText(mv.dead, mv.wounded)}</div>
                </span>
              </m.li>
            ))}
        </AnimatePresence>
      </ol>
    </div>
  );
}
