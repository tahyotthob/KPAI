"use client";
import { useEffect, useState } from "react";
import { loadStreak, type StreakState } from "@/lib/streak";

export const PROGRESS_EVENT = "kpai:progress";

/** 🔥 N - current win streak. Hidden at 0. Flame gets lively from 3. */
export default function StreakPill() {
  const [s, setS] = useState<StreakState>({ current: 0, best: 0 });
  useEffect(() => {
    const refresh = () => setS(loadStreak());
    refresh();
    window.addEventListener(PROGRESS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  if (s.current < 1) return null;
  return (
    <span className="glass px-3 py-1.5 text-sm font-black text-gold inline-flex items-center gap-1" title={`Best streak: ${s.best}`} aria-label={`Win streak ${s.current}`}>
      <span className={s.current >= 3 ? "flame" : ""} aria-hidden>🔥</span>
      <span className="font-num">{s.current}</span>
    </span>
  );
}
