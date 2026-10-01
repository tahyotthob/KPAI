"use client";
import { m } from "framer-motion";
import { useState } from "react";
import Header from "@/components/Header";
import RankSaver from "@/components/RankSaver";
import TitleBadge from "@/components/TitleBadge";
import { useLeaderboard, type BoardRow, type BoardWindow } from "@/hooks/useLeaderboard";
import { usePlayer } from "@/hooks/usePlayer";

const TABS: { v: BoardWindow; label: string }[] = [
  { v: "all", label: "All-time" },
  { v: "week", label: "This week" },
  { v: "today", label: "Today" },
];

const num = (n: number | null | undefined, d = 1) => (n === null || n === undefined ? "–" : Number(n).toFixed(d).replace(/\.0+$/, ""));
const medal = (r: number) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : r);

function Row({ r, mine, i = 0 }: { r: BoardRow; mine: boolean; i?: number }) {
  return (
    <m.tr initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.04, type: "spring", stiffness: 300, damping: 24 }} className={mine ? "bg-gold/15" : "border-t border-white/5"}>
      <td className="px-2 py-2 text-center font-num font-black">{r.rank <= 3 ? <m.span className="inline-block" animate={{ rotate: [0, -12, 12, 0] }} transition={{ repeat: Infinity, repeatDelay: 3 + r.rank, duration: 0.7 }}>{medal(r.rank)}</m.span> : medal(r.rank)}</td>
      <td className="px-2 py-2">
        <div className="font-bold truncate max-w-[9rem]">{r.nickname}{mine && " (you)"}</div>
        <TitleBadge title={r.title} />
      </td>
      <td className="px-2 py-2 text-right font-num font-black text-gold">{r.points}</td>
      <td className="px-2 py-2 text-right font-num">{r.wins}</td>
      <td className="px-2 py-2 text-right font-num">{num(r.win_rate, 0)}%</td>
      <td className="px-2 py-2 text-right font-num">{num(r.avg_guesses)}</td>
      <td className="px-2 py-2 text-right font-num">{num(r.best_guesses, 0)}</td>
    </m.tr>
  );
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<BoardWindow>("all");
  const { rows, me, myId, error, configured } = useLeaderboard(tab);
  const { profile } = usePlayer();

  return (
    <main className="mx-auto max-w-2xl px-4 pb-32">
      <Header title="Leaderboard" />
      {!configured ? (
        <p className="card p-5 text-center text-white/70">The leaderboard needs the backend. See DEPLOY.md.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4" role="tablist">
            {TABS.map((t) => (
              <button key={t.v} role="tab" aria-selected={tab === t.v} className={`btn !px-2 ${tab === t.v ? "btn-gold" : "btn-dark"}`} onClick={() => setTab(t.v)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-white/50">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2 text-left">Player</th>
                  <th className="px-2 py-2 text-right">KPAI Pts</th>
                  <th className="px-2 py-2 text-right">Wins</th>
                  <th className="px-2 py-2 text-right">Win %</th>
                  <th className="px-2 py-2 text-right">Avg guesses</th>
                  <th className="px-2 py-2 text-right">Best</th>
                </tr>
              </thead>
              <tbody>
                {rows?.map((r, i) => <Row key={`${tab}-${r.player_id}`} r={r} mine={r.player_id === myId} i={i} />)}
              </tbody>
            </table>
            {rows === null && !error && <p className="text-center text-white/50 py-8">Loading…</p>}
            {error && <p className="text-center text-blood py-8">Cannot load the board. Check your network.</p>}
            {rows?.length === 0 && <p className="text-center text-white/50 py-8">No one don play yet. Be the first! 💀</p>}
          </div>
          <div className="mt-4"><RankSaver isAnonymous={profile?.is_anonymous ?? true} /></div>

          <div className="fixed bottom-0 inset-x-0 z-20 bg-ink/95 border-t-2 border-gold backdrop-blur">
            <div className="mx-auto max-w-2xl px-4 py-2">
              {me ? (
                <table className="w-full text-sm"><tbody><Row r={me} mine /></tbody></table>
              ) : (
                <p className="text-center text-sm text-white/70 py-2">{profile ? "Play a game to get ranked!" : "Pick a nickname on Home and play to get ranked."}</p>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
