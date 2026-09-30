"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ensureSession, getSupabase, isBackendConfigured } from "@/lib/supabase/client";

export type BoardWindow = "all" | "week" | "today";

export interface BoardRow {
  rank: number;
  player_id: string;
  nickname: string;
  points: number;
  wins: number;
  games: number;
  win_rate: number;
  avg_guesses: number | null;
  best_guesses: number | null;
  title: string;
}

/**
 * Top-N board for a time window + the caller's own row (with its true rank). Live-updates
 * through Supabase Realtime on the leaderboard table.
 */
export function useLeaderboard(window: BoardWindow, limit = 100, live = true) {
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    try {
      const session = await ensureSession().catch(() => null);
      const id = session?.user.id ?? null;
      setMyId(id);
      const { data, error: e } = await sb.rpc("leaderboard_board", { p_window: window, p_limit: limit, p_player: id });
      if (e) throw e;
      setRows(((data ?? []) as BoardRow[]).map((r) => ({ ...r, rank: Number(r.rank), points: Number(r.points), wins: Number(r.wins), games: Number(r.games) })));
      setError(false);
    } catch {
      setError(true);
    }
  }, [window, limit]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    void load();
    if (!live) return;
    const ch = sb
      .channel(`leaderboard-${window}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leaderboard" }, () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void load(), 400);
      })
      .subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void sb.removeChannel(ch);
    };
  }, [window, live, load]);

  const top = rows?.filter((r) => r.rank <= limit) ?? null;
  const me = rows?.find((r) => r.player_id === myId) ?? null;
  return { rows: top, me, myId, error, configured: isBackendConfigured() };
}
