"use client";
import Link from "next/link";
import MuteToggle from "@/components/MuteToggle";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const BTNS = [
  { href: "/play/computer", label: "Play Computer", cls: "btn-green", icon: "🤖" },
  { href: "/online", label: "Play Friend (online)", cls: "btn-gold", icon: "🌍" },
  { href: "/play/pass", label: "Pass-and-Play", cls: "btn-dark", icon: "🤝" },
  { href: "/play/practice", label: "Practice", cls: "btn-dark", icon: "🎯" },
  { href: "/leaderboard", label: "Leaderboard", cls: "btn-dark", icon: "🏆" },
  { href: "/how-to-play", label: "How to Play", cls: "btn-dark", icon: "❓" },
];

export default function Home() {
  const [nickname, setNickname] = useLocalStorage("kpai:nickname", "");
  return (
    <main className="mx-auto max-w-md px-4 py-8 flex flex-col gap-5 relative">
      <div className="absolute right-4 top-4"><MuteToggle /></div>
      <div className="text-center">
        <h1 className="font-display text-7xl text-gold drop-shadow-[0_5px_0_#0d6b36]">KPAI!</h1>
        <p className="font-display text-naija mt-1">Dead or Wounded — naija style</p>
      </div>
      <input
        className="chip-input"
        placeholder="Your nickname (3–16 letters)"
        maxLength={16}
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        aria-label="Nickname"
      />
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
