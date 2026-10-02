import type { AiLevel, GameMode } from "./types";

export type Outcome = "win" | "lose" | "draw";

export interface PointsInput {
  mode: GameMode;
  outcome: Outcome;
  aiLevel?: AiLevel | null;
  /** Number of guesses the scoring player needed (for wins / practice). */
  guesses: number;
  /** Code length (default 4). Longer codes are harder, so they pay more. */
  length?: 3 | 4 | 5 | number;
}

export const MIN_GAME_SECONDS = 10;
/** Daily anti-farming caps (see supabase finalize_game for the server copy). */
export const DAILY_CAPS = { humanOpponentWins: 5, easyWins: 10, practice: 10 } as const;

/**
 * Win-row multiplier by code length (4 digits is the spec baseline). The flat rows
 * (lose = 1, draw = 5, the +5 speed bonus and the practice tier values) are NOT scaled;
 * only the guess thresholds shift with the length.
 */
const LENGTH_MULT: Record<number, number> = { 3: 0.6, 4: 1, 5: 1.4 };
/** Guesses that still earn the speed bonus / "fast" practice tier. */
const FAST_GUESSES: Record<number, number> = { 3: 4, 4: 5, 5: 7 };

export interface PointsResult {
  points: number;
  reason: string;
}

/** KPAI Points before daily caps. The server applies caps and is the source of truth. */
export function basePoints(i: PointsInput): PointsResult {
  const len = i.length ?? 4;
  const fast = FAST_GUESSES[len] ?? 5;
  if (i.mode === "practice") {
    if (i.guesses <= fast) return { points: 8, reason: "practice_fast" };
    if (i.guesses <= fast + 2) return { points: 4, reason: "practice_ok" };
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

  points = Math.round(points * (LENGTH_MULT[len] ?? 1));
  if (i.guesses <= fast) points += 5; // speed bonus
  return { points, reason };
}
