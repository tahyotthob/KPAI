"use client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHAT_BY_ID } from "@/lib/chat";
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

export interface MoveRow {
  player_id: string;
  guess: string;
  dead: number;
  wounded: number;
  move_number: number;
}

export interface ChatMsg {
  key: string;
  from: "me" | "them";
  text: string;
  at: number;
}

const byNumber = (a: MoveRow, b: MoveRow) => a.move_number - b.move_number;

/**
 * Live view of an online game. Realtime pushes carry the full changed row, so they are applied
 * directly (no refetch round trips); a slow poll + focus refetch is only a safety net.
 */
export function useOnlineGame(gameId: string, myId: string | undefined) {
  const [game, setGame] = useState<OnlineGameRow | null>(null);
  const [rows, setRows] = useState<MoveRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [presence, setPresence] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const nameCache = useRef<Record<string, string>>({});
  const channel = useRef<RealtimeChannel | null>(null);
  const lastChatIn = useRef(0);

  const addRow = useCallback((r: MoveRow) => {
    setRows((cur) => (cur.some((x) => x.move_number === r.move_number) ? cur : [...cur, r].sort(byNumber)));
  }, []);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const [g, m] = await Promise.all([
      sb.from("games").select("*").eq("id", gameId).maybeSingle(),
      sb.from("moves").select("player_id, guess, dead, wounded, move_number").eq("game_id", gameId).order("move_number"),
    ]);
    if (g.error) return setError("network");
    if (!g.data) return setError("not_found");
    const row = g.data as OnlineGameRow;
    setGame(row);
    setRows((m.data ?? []) as MoveRow[]);
    setError(null);
    const need = [row.player1_id, row.player2_id].filter((x): x is string => Boolean(x) && !nameCache.current[x!]);
    if (need.length) {
      const [ps, ls] = await Promise.all([
        sb.from("players").select("id, nickname").in("id", need),
        sb.from("leaderboard").select("player_id, title").in("player_id", need),
      ]);
      for (const p of ps.data ?? []) nameCache.current[p.id] = p.nickname;
      setNames({ ...nameCache.current });
      setTitles((t) => ({ ...t, ...Object.fromEntries((ls.data ?? []).map((l) => [l.player_id, l.title as string])) }));
    }
  }, [gameId]);

  /** Apply the result of our own action instantly; realtime will then confirm it (deduped). */
  const applyLocal = useCallback((move: MoveRow | null, patch: Partial<OnlineGameRow>) => {
    if (move) addRow(move);
    setGame((g) => (g ? { ...g, ...patch } : g));
  }, [addRow]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !myId) return;
    void load();
    const ch = sb
      .channel(`game-${gameId}`, { config: { presence: { key: myId }, broadcast: { self: false } } })
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` }, (p) => {
        const next = p.new as Partial<OnlineGameRow> | undefined;
        if (next && next.id) setGame((g) => (g ? { ...g, ...next } : (next as OnlineGameRow)));
        else void load();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "moves", filter: `game_id=eq.${gameId}` }, (p) => {
        const r = p.new as MoveRow;
        if (r?.move_number) addRow(r);
        else void load();
      })
      .on("presence", { event: "sync" }, () => setPresence(new Set(Object.keys(ch.presenceState()))))
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        const line = CHAT_BY_ID[String(payload?.id)];
        const now = Date.now();
        if (!line || now - lastChatIn.current < 600) return; // presets only, light rate limit
        lastChatIn.current = now;
        setChat((c) => [...c.slice(-19), { key: `${now}-in`, from: "them", text: line.text, at: now }]);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void ch.track({ at: Date.now() });
      });
    channel.current = ch;
    const poll = setInterval(() => void load(), 8000);
    const onVis = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onVis);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onVis);
      channel.current = null;
      void sb.removeChannel(ch);
    };
  }, [gameId, myId, load, addRow]);

  // Heartbeat for the 2-minute disconnect rule.
  const status = game?.status;
  useEffect(() => {
    if (!status || status === "finished") return;
    const beat = () => void api(`/api/games/${gameId}/heartbeat`, {}).catch(() => {});
    beat();
    const t = setInterval(beat, 30000);
    return () => clearInterval(t);
  }, [gameId, status]);

  const sendChat = useCallback((id: string) => {
    const line = CHAT_BY_ID[id];
    if (!line || !channel.current) return;
    void channel.current.send({ type: "broadcast", event: "chat", payload: { id } });
    const now = Date.now();
    setChat((c) => [...c.slice(-19), { key: `${now}-out`, from: "me", text: line.text, at: now }]);
  }, []);

  const slot: 0 | 1 | null = !game || !myId ? null : game.player1_id === myId ? 0 : game.player2_id === myId ? 1 : null;
  const oppId = game && slot !== null ? (slot === 0 ? game.player2_id : game.player1_id) : null;

  const moves = useMemo<[Move[], Move[]]>(() => {
    const out: [Move[], Move[]] = [[], []];
    if (!game) return out;
    for (const r of rows) out[r.player_id === game.player1_id ? 0 : 1].push({ guess: r.guess, dead: r.dead, wounded: r.wounded });
    return out;
  }, [rows, game]);

  return {
    game, rows, moves, slot, error, refresh: load, applyLocal, chat, sendChat,
    me: myId ? (names[myId] ?? "You") : "You",
    opponent: oppId ? { id: oppId, nickname: names[oppId] ?? "Opponent", title: titles[oppId] ?? "Learner", online: presence.has(oppId) } : null,
  };
}
