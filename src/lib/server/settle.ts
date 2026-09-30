import { basePoints, MIN_GAME_SECONDS } from "@/lib/game";
import type { AiLevel, GameMode } from "@/lib/game";
import { getAdmin } from "./admin";

export interface GameRow {
  id: string;
  mode: GameMode;
  digit_length: number;
  status: "waiting" | "setting_secrets" | "playing" | "finished";
  player1_id: string;
  player2_id: string | null;
  current_turn: 0 | 1;
  final_turn: boolean;
  turn_seconds: number;
  turn_started_at: string | null;
  ai_level: AiLevel | null;
  started_at: string | null;
  created_at: string;
  last_seen_p1: string;
  last_seen_p2: string | null;
  rematch_game_id: string | null;
  p1_ready: boolean;
  p2_ready: boolean;
}

export const secondsSince = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 1000 : 0);

interface ScoreArgs {
  playerId: string;
  gameId: string;
  mode: GameMode;
  outcome: "win" | "lose" | "draw";
  /** guesses this player needed; null when unknown (forfeit) -> no speed bonus, no guess stats */
  guesses: number | null;
  opponentId: string | null;
  aiLevel: AiLevel | null;
}

/** Awards KPAI Points via the record_score SQL function (service role only). */
export async function awardPoints(a: ScoreArgs): Promise<number> {
  const { points, reason } = basePoints({ mode: a.mode, outcome: a.outcome, aiLevel: a.aiLevel, guesses: a.guesses ?? 99 });
  const { data, error } = await getAdmin().rpc("record_score", {
    p_player: a.playerId,
    p_game: a.gameId,
    p_mode: a.mode,
    p_outcome: a.outcome,
    p_points: points,
    p_reason: reason,
    p_guesses: a.guesses,
    p_opponent: a.opponentId,
    p_ai_level: a.aiLevel,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

/**
 * Marks an online game finished and awards points to both players. Safe to call twice:
 * only the call that flips the game to "finished" scores it.
 */
export async function settleOnline(
  game: GameRow,
  winner: 0 | 1 | "draw",
  guesses: [number, number],
  how: "win" | "draw" | "forfeit",
) {
  const admin = getAdmin();
  const winnerId = winner === "draw" ? null : winner === 0 ? game.player1_id : game.player2_id;
  const { data: updated } = await admin
    .from("games")
    .update({ status: "finished", winner_id: winnerId, result: how, finished_at: new Date().toISOString() })
    .eq("id", game.id)
    .neq("status", "finished")
    .select("id");
  if (!updated?.length) return { points: [0, 0] as [number, number] };

  // Too-fast games (< 10s) don't count, to stop point farming with two accounts.
  const started = game.started_at ?? game.created_at;
  if (secondsSince(started) < MIN_GAME_SECONDS || !game.player2_id) return { points: [0, 0] as [number, number] };

  const ids = [game.player1_id, game.player2_id] as const;
  const points: [number, number] = [0, 0];
  for (const slot of [0, 1] as const) {
    const outcome = winner === "draw" ? "draw" : winner === slot ? "win" : "lose";
    points[slot] = await awardPoints({
      playerId: ids[slot],
      gameId: game.id,
      mode: "online",
      outcome,
      guesses: how === "forfeit" ? null : guesses[slot],
      opponentId: ids[slot === 0 ? 1 : 0],
      aiLevel: null,
    });
  }
  return { points };
}
