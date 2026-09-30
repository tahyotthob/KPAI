import type { Feedback, Move } from "./types";

/**
 * Pure two-player match state machine, shared by the client (offline modes) and the
 * server (online rooms). Player 0 always moves first in a round.
 *
 * Fairness rule: if player 0 cracks the code, player 1 gets one final turn. If they also
 * crack it, the game is a draw. If player 1 cracks first, the round is already complete,
 * so they simply win.
 */
export type Winner = 0 | 1 | "draw" | null;

export interface MatchState {
  length: number;
  turn: 0 | 1;
  moves: [Move[], Move[]];
  /** Player 0 has cracked the code and player 1 is playing their last turn. */
  finalTurn: boolean;
  winner: Winner;
}

export function newMatch(length: number): MatchState {
  return { length, turn: 0, moves: [[], []], finalTurn: false, winner: null };
}

export function applyGuess(s: MatchState, player: 0 | 1, guess: string, fb: Feedback): MatchState {
  if (s.winner !== null) throw new Error("Game over");
  if (s.turn !== player) throw new Error("Not your turn");
  const moves: [Move[], Move[]] = [s.moves[0].slice(), s.moves[1].slice()];
  moves[player].push({ guess, ...fb });
  const cracked = fb.dead === s.length;

  if (player === 0) {
    return cracked
      ? { ...s, moves, turn: 1, finalTurn: true, winner: null }
      : { ...s, moves, turn: 1 };
  }
  // player 1
  if (s.finalTurn) return { ...s, moves, winner: cracked ? "draw" : 0 };
  return cracked ? { ...s, moves, winner: 1 } : { ...s, moves, turn: 0 };
}

/** Timer ran out: the turn passes. If it was the final turn, player 0 wins. */
export function skipTurn(s: MatchState): MatchState {
  if (s.winner !== null) return s;
  if (s.turn === 1 && s.finalTurn) return { ...s, winner: 0 };
  return { ...s, turn: s.turn === 0 ? 1 : 0 };
}

/** A player forfeits / abandons: the other wins immediately. */
export function forfeit(s: MatchState, loser: 0 | 1): MatchState {
  return s.winner !== null ? s : { ...s, winner: loser === 0 ? 1 : 0 };
}
