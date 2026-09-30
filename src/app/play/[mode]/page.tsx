"use client";
import { use, useState } from "react";
import { notFound } from "next/navigation";
import GameSetup, { type Settings } from "@/components/GameSetup";
import Header from "@/components/Header";
import LocalGame from "@/components/LocalGame";
import PassGame from "@/components/PassGame";
import { usePlayer } from "@/hooks/usePlayer";

const TITLES = { computer: "Vs Computer", practice: "Practice", pass: "Pass-and-Play" } as const;

export default function PlayPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = use(params);
  const { nickname } = usePlayer();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [p2, setP2] = useState("Player 2");
  if (!(mode in TITLES)) notFound();

  return (
    <main className="mx-auto max-w-md px-4 pb-10">
      <Header title={TITLES[mode as keyof typeof TITLES]} />
      {!settings ? (
        <GameSetup
          mode={mode as "computer" | "practice" | "pass"}
          onStart={setSettings}
          extra={mode === "pass" && (
            <div>
              <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Player 2 name</div>
              <input className="chip-input" maxLength={16} value={p2} onChange={(e) => setP2(e.target.value)} aria-label="Player 2 name" />
            </div>
          )}
        />
      ) : mode === "computer" || mode === "practice" ? (
        <LocalGame mode={mode} settings={settings} nickname={nickname} />
      ) : (
        <PassGame settings={settings} names={[nickname.trim() || "Player 1", p2.trim() || "Player 2"]} />
      )}
    </main>
  );
}
