"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import DailyShare from "@/components/DailyShare";
import Header from "@/components/Header";
import LocalGame, { type LocalGameResult } from "@/components/LocalGame";
import type { Settings } from "@/components/GameSetup";
import { usePlayer } from "@/hooks/usePlayer";
import { dailyCode, dailyNumber, emojiGrid, lagosDateKey, liveDailyStreak, loadDaily, msUntilNextDaily, recordDaily, saveDaily } from "@/lib/daily";
import type { Move } from "@/lib/game";

const SETTINGS: Settings = { length: 4, timer: 0, level: "medium" };

function Countdown() {
  const [ms, setMs] = useState(msUntilNextDaily());
  useEffect(() => {
    const t = setInterval(() => setMs(msUntilNextDaily()), 30000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return <p className="text-white/70 text-sm">Next Kpai in <b className="font-num text-acid">{h}h {m}m</b></p>;
}

export default function DailyPage() {
  const { nickname } = usePlayer();
  const [ready, setReady] = useState(false);
  const [key, setKey] = useState("");
  const [solved, setSolved] = useState<{ moves: Move[]; streak: number } | null>(null);
  const [fresh, setFresh] = useState<{ moves: Move[]; streak: number } | null>(null);

  useEffect(() => {
    const k = lagosDateKey();
    const d = loadDaily();
    setKey(k);
    const r = d.results[k];
    if (r) {
      // rebuild a share grid from the stored rows (dead/wounded counts are encoded as emoji)
      const moves: Move[] = r.grid.map((row) => ({ guess: "", dead: [...row].filter((c) => c === "🟥").length, wounded: [...row].filter((c) => c === "🟪").length }));
      setSolved({ moves, streak: liveDailyStreak(d, k) });
    }
    setReady(true);
  }, []);

  const onDone = (res: LocalGameResult) => {
    if (!res.won) return;
    const d = loadDaily();
    const next = recordDaily(d, key, res.moves.length, emojiGrid(res.moves, 4));
    saveDaily(next);
    setFresh({ moves: res.moves, streak: next.streak });
  };

  return (
    <main className="mx-auto max-w-md px-4 pb-10">
      <Header title={ready && key ? `Daily #${dailyNumber(key)}` : "Daily Kpai"} />
      {!ready ? null : solved ? (
        <div className="flex flex-col items-center gap-4 text-center enter-up">
          <div className="font-display text-3xl foil-text">Done for today! ✅</div>
          <p className="text-white/80">You cracked Daily #{dailyNumber(key)} in {solved.moves.length}.</p>
          <DailyShare dateKey={key} moves={solved.moves} streak={solved.streak} />
          <Countdown />
          <Link href="/" className="btn btn-dark w-full">Back home</Link>
        </div>
      ) : (
        <>
          <p className="text-center text-white/75 text-sm mb-3">Everybody dey chase the same 4-digit code today. One shot at glory — no rematch. 🔥</p>
          <LocalGame
            mode="practice"
            settings={SETTINGS}
            nickname={nickname}
            fixedSecret={dailyCode(key || lagosDateKey(), 4)}
            daily
            onDone={onDone}
            resultExtra={fresh ? <><DailyShare dateKey={key} moves={fresh.moves} streak={fresh.streak} /><Countdown /></> : null}
          />
        </>
      )}
    </main>
  );
}
