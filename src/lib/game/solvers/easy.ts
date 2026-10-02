import { allCodes, consistentCodes, pick, randomCode, type Rng } from "../candidates";
import type { Move } from "../types";

/** Mama Put: mostly random, only sometimes (40%) listens to the feedback. */
export function easyGuess(length: number, history: Move[], rng: Rng = Math.random): string {
  const tried = new Set(history.map((m) => m.guess));
  if (history.length > 0 && rng() < 0.4) {
    const cands = consistentCodes(length, history).filter((c) => !tried.has(c));
    if (cands.length) return pick(cands, rng);
  }
  for (let i = 0; i < 50; i++) {
    const c = randomCode(length, rng);
    if (!tried.has(c)) return c;
  }
  return pick(allCodes(length), rng);
}
