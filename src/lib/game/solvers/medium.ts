import { consistentCodes, pick, type Rng } from "../candidates";
import type { Move } from "../types";

/** Area Boy: a random pick from every code still consistent with all feedback. */
export function mediumGuess(length: number, history: Move[], rng: Rng = Math.random): string {
  const cands = consistentCodes(length, history);
  return pick(cands, rng);
}
