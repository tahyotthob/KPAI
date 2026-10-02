import { consistentCodes, pick, type Rng } from "../candidates";
import type { Move } from "../types";

/**
 * Area Boy: a random pick from the codes still consistent with the feedback. Like a human he
 * sometimes loses track: half the time (once past move 2) he only checks the LAST two clues,
 * so he can repeat old mistakes, though he never re-tries a guess he has already made.
 */
export function mediumGuess(length: number, history: Move[], rng: Rng = Math.random): string {
  if (history.length > 2 && rng() < 0.5) {
    const tried = new Set(history.map((m) => m.guess));
    const cands = consistentCodes(length, history.slice(-2)).filter((c) => !tried.has(c));
    if (cands.length) return pick(cands, rng);
  }
  return pick(consistentCodes(length, history), rng);
}
