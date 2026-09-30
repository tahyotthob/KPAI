"use client";

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
      <div className="grid grid-cols-10 gap-1">
        {value.map((s, d) => (
          <button
            key={d}
            onClick={() => cycle(d)}
            aria-label={`Digit ${d}: ${["unknown", "ruled out", "confirmed"][s]}`}
            className={`font-num rounded-lg py-2 text-lg font-black border-2 transition ${
              s === 0
                ? "bg-ink border-white/15 text-white"
                : s === 1
                  ? "bg-ink border-white/10 text-white/35 line-through decoration-2 decoration-blood"
                  : "bg-naija border-naija-dark text-ink"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
