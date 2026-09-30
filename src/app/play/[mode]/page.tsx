"use client";
import { use, useState } from "react";
import { notFound } from "next/navigation";
import GameSetup, { type Settings } from "@/components/GameSetup";
import Header from "@/components/Header";
import LocalGame from "@/components/LocalGame";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const TITLES = { computer: "Vs Computer", practice: "Practice", pass: "Pass-and-Play" } as const;

export default function PlayPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = use(params);
  const [nickname] = useLocalStorage("kpai:nickname", "");
  const [settings, setSettings] = useState<Settings | null>(null);
  if (!(mode in TITLES)) notFound();

  return (
    <main className="mx-auto max-w-md px-4 pb-10">
      <Header title={TITLES[mode as keyof typeof TITLES]} />
      {!settings ? (
        <GameSetup mode={mode as "computer" | "practice" | "pass"} onStart={setSettings} />
      ) : mode === "computer" || mode === "practice" ? (
        <LocalGame mode={mode} settings={settings} nickname={nickname} />
      ) : (
        <p>Coming soon</p>
      )}
    </main>
  );
}
