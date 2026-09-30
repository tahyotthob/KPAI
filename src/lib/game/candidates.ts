import { scoreGuess } from "./score";
import type { Move } from "./types";

const cache = new Map<number, string[]>();

/** Every valid code of a given length (5,040 for 4 digits). Computed once. */
export function allCodes(length: number): string[] {
  const hit = cache.get(length);
  if (hit) return hit;
  const out: string[] = [];
  const build = (prefix: string, used: number) => {
    if (prefix.length === length) return void out.push(prefix);
    for (let d = 0; d < 10; d++) if (!(used & (1 << d))) build(prefix + d, used | (1 << d));
  };
  build("", 0);
  cache.set(length, out);
  return out;
}

export type Rng = () => number;

export function randomCode(length: number, rng: Rng = Math.random): string {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, length).join("");
}

export function pick<T>(arr: readonly T[], rng: Rng = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Codes still consistent with every feedback received so far. */
export function consistentCodes(length: number, history: Move[], from?: string[]): string[] {
  const pool = from ?? allCodes(length);
  return pool.filter((c) =>
    history.every((m) => {
      const f = scoreGuess(c, m.guess);
      return f.dead === m.dead && f.wounded === m.wounded;
    }),
  );
}
