"use client";
import Link from "next/link";
import MuteToggle from "@/components/MuteToggle";
import { useState } from "react";
import { nicknameMessage, usePlayer } from "@/hooks/usePlayer";

const BTNS = [
  { href: "/play/computer", label: "Play Computer", cls: "btn-green", icon: "🤖" },
  { href: "/online", label: "Play Friend (online)", cls: "btn-gold", icon: "🌍" },
  { href: "/play/pass", label: "Pass-and-Play", cls: "btn-dark", icon: "🤝" },
  { href: "/play/practice", label: "Practice", cls: "btn-dark", icon: "🎯" },
  { href: "/leaderboard", label: "Leaderboard", cls: "btn-dark", icon: "🏆" },
  { href: "/how-to-play", label: "How to Play", cls: "btn-dark", icon: "❓" },
];

export default function Home() {
  const { nickname, setNickname, save, profile, status } = usePlayer();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const onSave = async () => {
    setBusy(true);
    try {
      await save(nickname.trim());
      setMsg({ ok: true, text: "Nickname saved ✅" });
    } catch (e) {
      setMsg({ ok: false, text: nicknameMessage(e) });
    }
    setBusy(false);
  };
  const dirty = nickname.trim() !== (profile?.nickname ?? "");
  return (
    <main className="mx-auto max-w-md px-4 py-8 flex flex-col gap-5 relative">
      <div className="absolute right-4 top-4"><MuteToggle /></div>
      <div className="text-center">
        <h1 className="font-display text-7xl text-gold drop-shadow-[0_5px_0_#0d6b36]">KPAI!</h1>
        <p className="font-display text-naija mt-1">Dead or Wounded — naija style</p>
      </div>
      <div>
        <div className="flex gap-2">
          <input
            className="chip-input"
            placeholder="Your nickname (3–16 letters)"
            maxLength={16}
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setMsg(null);
            }}
            aria-label="Nickname"
          />
          {status !== "offline" && (
            <button className="btn btn-gold !px-4" onClick={onSave} disabled={busy || nickname.trim().length < 3 || !dirty}>
              Save
            </button>
          )}
        </div>
        {msg && <p className={`text-sm mt-2 ${msg.ok ? "text-naija" : "text-blood"}`} role="status">{msg.text}</p>}
        {status === "ready" && !profile && !msg && <p className="text-sm mt-2 text-white/60">Pick a nickname and hit Save to join the leaderboard.</p>}
        {status === "offline" && <p className="text-sm mt-2 text-white/50">Backend not connected: online play and ranking are off, offline modes work fine.</p>}
      </div>
      <div className="flex flex-col gap-3">
        {BTNS.map((b) => (
          <Link key={b.href} href={b.href} className={`btn ${b.cls} text-lg h-14`}>
            <span>{b.icon}</span> {b.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
