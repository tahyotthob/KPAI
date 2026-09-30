"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Move } from "@/lib/game";
import { api, getSupabase } from "@/lib/supabase/client";

export interface OnlineGameRow {
  id: string;
  room_code: string | null;
  digit_length: number;
  status: "waiting" | "setting_secrets" | "playing" | "finished";
  player1_id: string;
  player2_id: string | null;
  current_turn: 0 | 1;
  final_turn: boolean;
  turn_seconds: number;
  turn_started_at: string | null;
  winner_id: string | null;
  result: "win" | "draw" | "forfeit" | null;
  rematch_game_id: string | null;
  p1_ready: boolean;
  p2_ready: boolean;
  last_seen_p1: string;
  last_seen_p2: string | null;
}

/** Live view of an online game: RLS-limited reads + Realtime pushes + a polling safety net. */
export function useOnlineGame(gameId: string, myId: string | undefined) {
  const [game, setGame] = useState<OnlineGameRow | null>(null);
  const [moves, setMoves] = useState<[Move[], Move[]]>([[], []]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [presence, setPresence] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const nameCache = useRef<Record<string, string>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data: g, error: ge } = await sb.from("games").select("*").eq("id", gameId).maybeSingle();
    if (ge) return setError("network");
    if (!g) return setError("not_found");
    const row = g as OnlineGameRow;
    setGame(row);
    const { data: m } = await sb.from("moves").select("player_id, guess, dead, wounded, move_number").eq("game_id", gameId).order("move_number");
    const slots: [Move[], Move[]] = [[], []];
    for (const r of m ?? []) slots[r.player_id === row.player1_id ? 0 : 1].push({ guess: r.guess, dead: r.dead, wounded: r.wounded });
    setMoves(slots);
    const need = [row.player1_id, row.player2_id].filter((x): x is string => Boolean(x) && !nameCache.current[x!]);
    if (need.length) {
      const { data: ps } = await sb.from("players").select("id, nickname").in("id", need);
      for (const p of ps ?? []) nameCache.current[p.id] = p.nickname;
      setNames({ ...nameCache.current });
      const { data: ls } = await sb.from("leaderboard").select("player_id, title").in("player_id", need);
      setTitles((t) => ({ ...t, ...Object.fromEntries((ls ?? []).map((l) => [l.player_id, l.title as string])) }));
    }
    setError(null);
  }, [gameId]);

  const refresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(), 80); // coalesce bursts of events
  }, [load]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !myId) return;
    void load();
    const ch = sb
      .channel(`game-${gameId}`, { config: { presence: { key: myId } } })
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "moves", filter: `game_id=eq.${gameId}` }, refresh)
      .on("presence", { event: "sync" }, () => setPresence(new Set(Object.keys(ch.presenceState()))))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void ch.track({ at: Date.now() });
      });
    const poll = setInterval(() => void load(), 6000);
    const onVis = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onVis);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onVis);
      if (timer.current) clearTimeout(timer.current);
      void sb.removeChannel(ch);
    };
  }, [gameId, myId, load, refresh]);

  // Heartbeat for the 2-minute disconnect rule.
  const status = game?.status;
  useEffect(() => {
    if (!status || status === "finished") return;
    const beat = () => void api(`/api/games/${gameId}/heartbeat`, {}).catch(() => {});
    beat();
    const t = setInterval(beat, 30000);
    return () => clearInterval(t);
  }, [gameId, status]);

  const slot: 0 | 1 | null = !game || !myId ? null : game.player1_id === myId ? 0 : game.player2_id === myId ? 1 : null;
  const oppId = game && slot !== null ? (slot === 0 ? game.player2_id : game.player1_id) : null;
  return {
    game, moves, slot, error, refresh: load,
    me: myId ? (names[myId] ?? "You") : "You",
    opponent: oppId ? { id: oppId, nickname: names[oppId] ?? "Opponent", title: titles[oppId] ?? "Learner", online: presence.has(oppId) } : null,
  };
}
