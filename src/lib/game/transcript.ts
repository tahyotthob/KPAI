import { applyGuess, newMatch, skipTurn } from "./match";
import { isValidCode, scoreGuess } from "./score";
import type { Winner } from "./match";

export interface TranscriptEvent {
  /** Which player acted (0 = you / player 1). */
  p: 0 | 1;
  /** The guess, or null when the turn timer expired and the turn passed. */
  g: string | null;
}

export interface Transcript {
  mode: "computer" | "pass" | "practice";
  length: number;
  /** secrets[0] = player 1's secret (or the code being guessed in practice); secrets[1] = player 2's. */
  secrets: string[];
  events: TranscriptEvent[];
}

export type ReplayResult =
  | { ok: true; winner: Winner; guesses: [number, number] }
  | { ok: false; error: string };

export const MAX_EVENTS = 300;

/**
 * Replays a finished offline game from scratch and derives the outcome, so the server never
 * has to trust a client-reported "I won". Used for Vs Computer, Pass-and-Play and Practice.
 */
export function replayTranscript(t: Transcript): ReplayResult {
  const fail = (error: string): ReplayResult => ({ ok: false, error });
  if (![3, 4, 5].includes(t.length)) return fail("bad length");
  if (!Array.isArray(t.events) || t.events.length === 0 || t.events.length > MAX_EVENTS) return fail("bad events");
  const need = t.mode === "practice" ? 1 : 2;
  if (!Array.isArray(t.secrets) || t.secrets.length !== need) return fail("bad secrets");
  if (!t.secrets.every((s) => typeof s === "string" && isValidCode(s, t.length))) return fail("bad secret");

  if (t.mode === "practice") {
    let n = 0;
    for (let i = 0; i < t.events.length; i++) {
      const e = t.events[i];
      if (e.p !== 0 || typeof e.g !== "string" || !isValidCode(e.g, t.length)) return fail("bad guess");
      n++;
      if (e.g === t.secrets[0]) {
        return i === t.events.length - 1 ? { ok: true, winner: 0, guesses: [n, 0] } : fail("events after solve");
      }
    }
    return fail("not solved");
  }

  let m = newMatch(t.length);
  for (const e of t.events) {
    if (m.winner !== null) return fail("events after game over");
    if (e.p !== m.turn) return fail("turn order");
    if (e.g === null) {
      m = skipTurn(m);
      continue;
    }
    if (typeof e.g !== "string" || !isValidCode(e.g, t.length)) return fail("bad guess");
    m = applyGuess(m, e.p, e.g, scoreGuess(t.secrets[e.p === 0 ? 1 : 0], e.g));
  }
  if (m.winner === null) return fail("not finished");
  return { ok: true, winner: m.winner, guesses: [m.moves[0].length, m.moves[1].length] };
}
