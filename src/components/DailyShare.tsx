"use client";
import { useState } from "react";
import { emojiGrid, shareText } from "@/lib/daily";
import { shareOut } from "@/lib/share";
import type { Move } from "@/lib/game";

/** Wordle-style spoiler-free grid + one-tap share (native sheet or WhatsApp). */
export default function DailyShare({ dateKey, moves, streak, length = 4 }: { dateKey: string; moves: Move[]; streak: number; length?: number }) {
  const [done, setDone] = useState(false);
  const grid = emojiGrid(moves, length);
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "")}/play/daily`;
  return (
    <div className="card p-4 w-full flex flex-col items-center gap-3">
      <div className="text-xs uppercase tracking-widest text-white/60">Your grid</div>
      <pre className="text-xl leading-snug" aria-label={`${moves.length} guesses`}>{grid.join("\n")}</pre>
      <button
        className="btn btn-acid w-full text-lg tilt-r"
        onClick={async () => {
          const r = await shareOut(shareText(dateKey, moves, length, streak, url));
          if (r !== "cancelled") setDone(true);
        }}
      >
        {done ? "Shared ✅ Show your people" : "Brag on WhatsApp 🔥"}
      </button>
      {streak > 0 && <div className="font-display text-gold">🔥 {streak}-day streak</div>}
    </div>
  );
}
