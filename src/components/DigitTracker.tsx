"use client";
import { m } from "framer-motion";

/** 0 = unknown, 1 = ruled out, 2 = confirmed */
export type TrackerState = number[];
export const emptyTracker = (): TrackerState => Array(10).fill(0);

export default function DigitTracker({ value, onChange }: { value: TrackerState; onChange: (v: TrackerState) => void }) {
  const cycle = (d: number) => {
    const next = value.slice();
    next[d] = (next[d] + 1) % 3;
    onChange(next);
  };
  return (
    <div className="card p-3">
      <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Note pad · tap to cycle</div>
      <div className="grid grid-cols-5 gap-1.5">
        {value.map((s, d) => (
          <m.button
            key={`${d}-${s}`}
            initial={{ scale: 0.6, rotateX: 90 }}
            animate={{ scale: 1, rotateX: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 16 }}
            whileTap={{ scale: 0.88 }}
            onClick={() => cycle(d)}
            aria-label={`Digit ${d}: ${["unknown", "ruled out", "confirmed"][s]}`}
            className={`font-num rounded-xl min-h-11 text-xl font-black border-2 transition ${
              s === 0
                ? "bg-ink border-white/15 text-white"
                : s === 1
                  ? "bg-ink border-white/10 text-white/35 line-through decoration-2 decoration-blood"
                  : "bg-naija border-naija-dark text-ink"
            }`}
          >
            {d}
          </m.button>
        ))}
      </div>
    </div>
  );
}
