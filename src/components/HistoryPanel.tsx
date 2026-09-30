"use client";
import { AnimatePresence, motion } from "framer-motion";
import type { Move } from "@/lib/game";

export function FeedbackIcons({ dead, wounded }: { dead: number; wounded: number }) {
  if (!dead && !wounded) return <span className="text-white/50 text-sm">nothing 🙅</span>;
  return (
    <span className="tracking-tight">
      {"💀".repeat(dead)}
      {"🩸".repeat(wounded)}
    </span>
  );
}

export const feedbackText = (dead: number, wounded: number) => `${dead} Dead ${wounded} Wounded`;

export default function HistoryPanel({ moves, title, hideGuess }: { moves: Move[]; title?: string; hideGuess?: boolean }) {
  return (
    <div className="card p-3">
      {title && <div className="text-xs uppercase tracking-widest text-white/50 mb-2">{title}</div>}
      {moves.length === 0 && <div className="text-white/40 text-sm py-4 text-center">No guesses yet. Oya start!</div>}
      <ol className="max-h-72 overflow-y-auto flex flex-col gap-2 pr-1" aria-live="polite">
        <AnimatePresence initial={false}>
          {moves
            .map((m, i) => ({ m, n: i + 1 }))
            .reverse()
            .map(({ m, n }) => (
              <motion.li
                key={n}
                initial={{ scale: 0.6, opacity: 0, y: -12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
                className="flex items-center gap-3 rounded-xl bg-ink px-3 py-2"
              >
                <span className="text-white/40 w-6 text-sm font-num">#{n}</span>
                <span className="font-num text-2xl font-black tracking-widest text-gold">
                  {hideGuess ? "••••" : m.guess}
                </span>
                <span className="ml-auto text-right">
                  <div className="text-lg leading-none">
                    <FeedbackIcons dead={m.dead} wounded={m.wounded} />
                  </div>
                  <div className="text-xs text-white/70 mt-1">{feedbackText(m.dead, m.wounded)}</div>
                </span>
              </motion.li>
            ))}
        </AnimatePresence>
      </ol>
    </div>
  );
}
