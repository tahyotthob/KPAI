import { randomInt } from "node:crypto";
import { newMatch, type MatchState, type Move } from "@/lib/game";
import { getAdmin, HttpError } from "./admin";
import type { GameRow } from "./settle";

// No 0/O/1/I so codes are easy to read out over WhatsApp voice notes.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const makeRoomCode = () => Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
export const ROOM_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;

export const DISCONNECT_SECONDS = 120;
/** Grace for network latency when enforcing the turn timer on the server. */
export const TIMER_GRACE_SECONDS = 3;

export async function loadGame(id: string, userId: string): Promise<{ game: GameRow; slot: 0 | 1 }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "not_found");
  const { data } = await getAdmin().from("games").select("*").eq("id", id).maybeSingle();
  const game = data as GameRow | null;
  if (!game || game.mode !== "online") throw new HttpError(404, "not_found");
  if (game.player1_id === userId) return { game, slot: 0 };
  if (game.player2_id === userId) return { game, slot: 1 };
  throw new HttpError(404, "not_found");
}

export interface MoveRow {
  player_id: string;
  guess: string;
  dead: number;
  wounded: number;
  move_number: number;
}

/** Rebuilds the pure match state from already-fetched database rows. */
export function buildMatch(game: GameRow, rows: MoveRow[]): MatchState {
  const s = newMatch(game.digit_length);
  const moves: [Move[], Move[]] = [[], []];
  for (const r of rows) {
    moves[r.player_id === game.player1_id ? 0 : 1].push({ guess: r.guess, dead: r.dead, wounded: r.wounded });
  }
  return { ...s, moves, turn: game.current_turn, finalTurn: game.final_turn };
}

/** Rebuilds the pure match state from the database rows. */
export async function loadMatch(game: GameRow): Promise<MatchState> {
  const { data, error } = await getAdmin()
    .from("moves")
    .select("player_id, guess, dead, wounded, move_number")
    .eq("game_id", game.id)
    .order("move_number");
  if (error) throw error;
  return buildMatch(game, (data ?? []) as MoveRow[]);
}

export const totalMoves = (m: MatchState) => m.moves[0].length + m.moves[1].length;

export function turnExpired(game: GameRow) {
  if (!game.turn_seconds || !game.turn_started_at) return false;
  return (Date.now() - new Date(game.turn_started_at).getTime()) / 1000 > game.turn_seconds + TIMER_GRACE_SECONDS;
}
