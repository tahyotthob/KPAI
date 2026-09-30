import { allCodes, consistentCodes, pick, type Rng } from "../candidates";
import { scoreGuess } from "../score";
import type { Move } from "../types";

// Memo of best guesses keyed by the exact candidate set, so repeated positions are instant.
const memo = new Map<string, string>();

/** Worst-case bucket size (and bucket-count tiebreak) of a guess against a candidate set. */
function evaluate(guess: string, cands: string[]): { worst: number; buckets: number } {
  const counts = new Map<number, number>();
  let worst = 0;
  for (let i = 0; i < cands.length; i++) {
    const f = scoreGuess(cands[i], guess);
    const k = f.dead * 10 + f.wounded;
    const n = (counts.get(k) ?? 0) + 1;
    counts.set(k, n);
    if (n > worst) worst = n;
  }
  return { worst, buckets: counts.size };
}

/**
 * Oga Kpai: keep the consistent candidates, then choose the guess that minimises the
 * worst-case number of remaining candidates (Knuth-style minimax). Candidates are
 * preferred on ties so a lucky guess can win outright.
 */
export function hardGuess(length: number, history: Move[], rng: Rng = Math.random): string {
  const cands = consistentCodes(length, history);
  if (cands.length <= 2) return cands[0];

  const key = length + ":" + cands.join(",");
  const cached = memo.get(key);
  if (cached) return cached;

  const candSet = new Set(cands);
  // Opening move: every first guess is equivalent by symmetry, so skip the heavy search.
  if (history.length === 0) {
    const open = length === 3 ? "012" : length === 4 ? "0123" : "01234";
    return open;
  }

  // Keep the search cheap on phones: big sets sample, small sets search every code.
  let scoreSet = cands;
  let pool: string[];
  if (cands.length > 1200) {
    scoreSet = sample(cands, 500, rng);
    pool = sample(cands, 250, rng);
  } else if (cands.length > 150) {
    pool = cands;
  } else {
    pool = allCodes(length);
  }

  let best = pool[0];
  let bestWorst = Infinity;
  let bestBuckets = -1;
  let bestIsCand = false;
  for (const g of pool) {
    const { worst, buckets } = evaluate(g, scoreSet);
    const isCand = candSet.has(g);
    if (
      worst < bestWorst ||
      (worst === bestWorst && buckets > bestBuckets) ||
      (worst === bestWorst && buckets === bestBuckets && isCand && !bestIsCand)
    ) {
      best = g;
      bestWorst = worst;
      bestBuckets = buckets;
      bestIsCand = isCand;
    }
  }
  if (scoreSet === cands) memo.set(key, best);
  return best ?? pick(cands, rng);
}

function sample<T>(arr: T[], n: number, rng: Rng): T[] {
  const copy = arr.slice();
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const j = i + Math.floor(rng() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
