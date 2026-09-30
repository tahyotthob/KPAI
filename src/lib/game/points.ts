import type { AiLevel, GameMode } from "./types";

export type Outcome = "win" | "lose" | "draw";

export interface PointsInput {
  mode: GameMode;
  outcome: Outcome;
  aiLevel?: AiLevel | null;
  /** Number of guesses the scoring player needed (for wins / practice). */
  guesses: number;
}

export const MIN_GAME_SECONDS = 10;
/** Daily anti-farming caps (see supabase finalize_game for the server copy). */
export const DAILY_CAPS = { humanOpponentWins: 5, easyWins: 10, practice: 10 } as const;

export interface PointsResult {
  points: number;
  reason: string;
}

/** KPAI Points before daily caps. The server applies caps and is the source of truth. */
export function basePoints(i: PointsInput): PointsResult {
  if (i.mode === "practice") {
    if (i.guesses <= 5) return { points: 8, reason: "practice_fast" };
    if (i.guesses <= 7) return { points: 4, reason: "practice_ok" };
    return { points: 1, reason: "practice_slow" };
  }
  if (i.outcome === "lose") return { points: 1, reason: "lose" };
  if (i.outcome === "draw") return { points: 5, reason: "draw" };

  let points: number;
  let reason: string;
  if (i.mode === "online") [points, reason] = [30, "win_online"];
  else if (i.mode === "pass") [points, reason] = [10, "win_pass"];
  else if (i.aiLevel === "hard") [points, reason] = [25, "win_hard"];
  else if (i.aiLevel === "medium") [points, reason] = [12, "win_medium"];
  else [points, reason] = [4, "win_easy"];

  if (i.guesses <= 5) points += 5; // speed bonus
  return { points, reason };
}
