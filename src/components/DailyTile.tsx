"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { dailyNumber, lagosDateKey, liveDailyStreak, loadDaily } from "@/lib/daily";

/** Home tile for the Daily Kpai: shows today's status + streak. */
export default function DailyTile() {
  const [info, setInfo] = useState<{ n: number; solved: number | null; streak: number } | null>(null);
  useEffect(() => {
    const key = lagosDateKey();
    const d = loadDaily();
    setInfo({ n: dailyNumber(key), solved: d.results[key]?.guesses ?? null, streak: liveDailyStreak(d, key) });
  }, []);
  return (
    <Link href="/play/daily" className="tile col-span-2 bg-hot pat-dots enter-up" style={{ ["--d" as string]: "0.55s" }}>
      <span className="tile-emoji" aria-hidden>📅</span>
      <span className="tile-title">Daily Kpai {info ? `#${info.n}` : ""}</span>
      <span className="tile-sub">
        {info?.solved ? `Solved in ${info.solved} ✅ · come back tomorrow` : "Same code for everybody today. Can you crack am?"}
        {info && info.streak > 0 && <b className="ml-1">🔥{info.streak}</b>}
      </span>
    </Link>
  );
}
