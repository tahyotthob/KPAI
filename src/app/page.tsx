"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import DailyTile from "@/components/DailyTile";
import MuteToggle from "@/components/MuteToggle";
import StreakPill from "@/components/StreakPill";
import TitleBadge from "@/components/TitleBadge";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { nicknameMessage, usePlayer } from "@/hooks/usePlayer";
import { AVATARS, loadAvatar, saveAvatar } from "@/lib/avatar";
import { isTutorialDone } from "@/lib/tutorial";
import { haptic, toast } from "@/lib/toast";

const TAGLINES = [
  "Dead or Wounded — naija style",
  "4 digits. Zero mercy.",
  "Wetin dey? Crack the code or collect shege.",
  "Guess well. Your mumu level is showing.",
];

const TILES = [
  { href: "/play/computer", title: "Vs Computer", sub: "Beat Mama Put, Area Boy, Oga Kpai", icon: "🤖", cls: "bg-naija pat-stripes col-span-2" },
  { href: "/online", title: "Play Friend", sub: "Room code + WhatsApp", icon: "🌍", cls: "bg-lagos" },
  { href: "/play/pass", title: "Pass & Play", sub: "One phone, two heads", icon: "🤝", cls: "bg-acid pat-dots" },
  { href: "/play/practice", title: "Practice", sub: "Solo, no pressure", icon: "🎯", cls: "bg-gold" },
  { href: "/leaderboard", title: "Leaderboard", sub: "Who dey top?", icon: "🏆", cls: "bg-ankara pat-ankara" },
  { href: "/badges", title: "Badges", sub: "Collect them all", icon: "🏅", cls: "bg-cream" },
  { href: "/tutorial", title: "Mama Put's Class", sub: "Learn by playing", icon: "🍲", cls: "bg-panel2 !text-white" },
  { href: "/how-to-play", title: "How to Play", sub: "Quick rules", icon: "❓", cls: "bg-panel2 !text-white col-span-2 !min-h-[5.5rem]" },
];

const MARQUEE = "WETIN DEY 🔥 · KPAI! · NO BE SMALL THING · GUESS OR GET ROASTED · 💀 DEAD = RIGHT DIGIT, RIGHT PLACE · 🩸 WOUNDED = RIGHT DIGIT, WRONG PLACE · ";

export default function Home() {
  const { nickname, setNickname, save, profile, status } = usePlayer();
  const top = useLeaderboard("all", 5, false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [tag, setTag] = useState(0);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [pick, setPick] = useState(false);
  const [classDone, setClassDone] = useState(true);
  const taps = useRef(0);

  useEffect(() => {
    setAvatar(loadAvatar());
    setClassDone(isTutorialDone());
  }, []);
  useEffect(() => {
    const t = setInterval(() => setTag((x) => (x + 1) % TAGLINES.length), 3800);
    return () => clearInterval(t);
  }, []);

  const logoTap = useCallback(() => {
    taps.current += 1;
    if (taps.current >= 7) {
      taps.current = 0;
      haptic([30, 30, 30, 30, 90]);
      toast("Calm down na 😂", "🌈", "You found the secret. Respect.");
      try {
        document.body.animate([{ filter: "hue-rotate(0deg)" }, { filter: "hue-rotate(360deg)" }], { duration: 1400, easing: "ease-in-out" });
      } catch {}
    }
  }, []);

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
    <main className="mx-auto max-w-md px-4 pt-3 pb-8 flex flex-col gap-4">
      <div className="flex items-center justify-between min-h-11">
        <StreakPill />
        <span className="ml-auto"><MuteToggle /></span>
      </div>

      <div className="text-center">
        <h1 className="font-display text-[4.5rem] leading-none text-gold drop-shadow-[0_5px_0_#000] flex justify-center select-none" aria-label="KPAI!" onClick={logoTap}>
          {"KPAI!".split("").map((ch, i) => (
            <span key={i} aria-hidden className="drop-letter" style={{ ["--d" as string]: `${0.05 + i * 0.09}s` }}>
              {ch}
            </span>
          ))}
        </h1>
        <p key={tag} className="font-display shimmer-text mt-2 text-sm enter-up min-h-5">{TAGLINES[tag]}</p>
      </div>

      <div className="marquee -mx-4" aria-hidden>
        <div className="marquee-track">
          <span>{MARQUEE}</span>
          <span>{MARQUEE}</span>
        </div>
      </div>

      <div className="card p-3 enter-up" style={{ ["--d" as string]: "0.3s" }}>
        <div className="flex gap-2 items-center">
          <button className="shrink-0 w-14 h-14 rounded-2xl bg-panel2 border-[3px] border-black text-3xl shadow-[3px_4px_0_#000]" onClick={() => setPick((p) => !p)} aria-label="Change avatar" aria-expanded={pick}>
            {avatar}
          </button>
          <input
            className="chip-input"
            placeholder="Your nickname (3–16)"
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
        {pick && (
          <div className="flex flex-wrap gap-2 mt-3" role="listbox" aria-label="Pick your avatar">
            {AVATARS.map((a) => (
              <button key={a} role="option" aria-selected={a === avatar} className={`w-11 h-11 rounded-xl text-2xl border-2 ${a === avatar ? "border-gold bg-gold/20" : "border-white/15 bg-ink"}`} onClick={() => { setAvatar(a); saveAvatar(a); setPick(false); haptic(15); }}>
                {a}
              </button>
            ))}
          </div>
        )}
        {msg && <p className={`text-sm mt-2 ${msg.ok ? "text-acid" : "text-blood"}`} role="status">{msg.text}</p>}
        {status === "ready" && !profile && !msg && <p className="text-sm mt-2 text-white/70">Pick a nickname and hit Save to join the leaderboard.</p>}
        {status === "offline" && <p className="text-sm mt-2 text-white/60">Backend not connected: online play and ranking are off, offline modes work fine.</p>}
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        {!classDone && (
          <Link href="/tutorial" className="tile col-span-2 bg-cream pat-ankara enter-up tilt-l" style={{ ["--d" as string]: "0.45s" }}>
            <span className="tile-emoji" aria-hidden>🍲</span>
            <span className="tile-title">New? Mama Put go teach you</span>
            <span className="tile-sub">2-minute interactive class · learn by playing</span>
          </Link>
        )}
        <DailyTile />
        {TILES.map((t, i) => (
          <Link key={t.href} href={t.href} className={`tile ${t.cls} enter-up ${i % 2 ? "tilt-r" : "tilt-l"}`} style={{ ["--d" as string]: `${0.6 + i * 0.06}s` }}>
            <span className="tile-emoji" aria-hidden>{t.icon}</span>
            <span className="tile-title">{t.title}</span>
            <span className="tile-sub">{t.sub}</span>
          </Link>
        ))}
      </div>

      {top.configured && (
        <Link href="/leaderboard" className="card p-3 block min-h-[11rem]" aria-label="Top 5 players">
          <div className="text-xs uppercase tracking-widest text-white/60 mb-2">🏆 Top 5</div>
          {top.rows && top.rows.length > 0 ? (
            <ol className="flex flex-col gap-1.5">
              {top.rows.slice(0, 5).map((r) => (
                <li key={r.player_id} className="flex items-center gap-2 text-sm">
                  <span className="w-5 text-center font-num text-gold">{r.rank}</span>
                  <span className="font-bold truncate">{r.nickname}</span>
                  <TitleBadge title={r.title} />
                  <span className="ml-auto font-num text-gold">{r.points}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-white/60 text-sm py-3">{top.rows ? "No champion yet. Na you or nobody. 👀" : "Wahala dey load…"}</p>
          )}
        </Link>
      )}
    </main>
  );
}
