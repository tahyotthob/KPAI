"use client";
import { useState } from "react";
import { AGENT_LIST } from "@/lib/agents";
import Avatar from "./Avatar";
import type { AiLevel, DigitLength } from "@/lib/game";

export interface Settings {
  length: DigitLength;
  timer: 0 | 30 | 60;
  level: AiLevel;
}

function Seg<T extends string | number>({ options, value, onChange, label }: { options: { v: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-white/50 mb-2">{label}</div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map((o) => (
          <button key={String(o.v)} onClick={() => onChange(o.v)} className={`btn ${value === o.v ? "btn-gold" : "btn-dark"}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GameSetup({ mode, initial, onStart, extra }: {
  mode: "computer" | "practice" | "pass" | "online";
  initial?: Partial<Settings>;
  onStart: (s: Settings) => void;
  extra?: React.ReactNode;
}) {
  const [length, setLength] = useState<DigitLength>(initial?.length ?? 4);
  const [timer, setTimer] = useState<0 | 30 | 60>(initial?.timer ?? 0);
  const [level, setLevel] = useState<AiLevel>(initial?.level ?? "medium");

  return (
    <div className="flex flex-col gap-5">
      {mode === "computer" && (
        <div>
          <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Pick your opponent</div>
          <div className="flex flex-col gap-2">
            {AGENT_LIST.map((a) => (
              <button
                key={a.level}
                onClick={() => setLevel(a.level)}
                className={`card p-3 flex items-center gap-3 text-left border-4 ${level === a.level ? "!border-gold" : ""}`}
              >
                <Avatar emoji={a.emoji} color={a.color} />
                <div>
                  <div className="font-display text-lg">{a.name} <span className="text-xs font-body text-white/50 uppercase">{a.level}</span></div>
                  <div className="text-sm text-white/70">{a.bio}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      <Seg label="Digits in the code" value={length} onChange={setLength} options={[{ v: 3, label: "3" }, { v: 4, label: "4" }, { v: 5, label: "5" }]} />
      {mode !== "practice" && (
        <Seg label="Turn timer" value={timer} onChange={setTimer} options={[{ v: 0 as const, label: "Off" }, { v: 30 as const, label: "30s" }, { v: 60 as const, label: "60s" }]} />
      )}
      {extra}
      <button className="btn btn-green text-2xl font-display h-16" onClick={() => onStart({ length, timer: mode === "practice" ? 0 : timer, level })}>
        Start game
      </button>
    </div>
  );
}
