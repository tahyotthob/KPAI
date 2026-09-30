import type { Feedback } from "./types";

/** A code is valid when it is exactly `length` digits with no repeats (leading 0 allowed). */
export function isValidCode(code: string, length = 4): boolean {
  if (typeof code !== "string" || code.length !== length) return false;
  let seen = 0;
  for (let i = 0; i < code.length; i++) {
    const d = code.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (seen & (1 << d)) return false;
    seen |= 1 << d;
  }
  return true;
}

/** Reason a code is invalid, or null when it is fine. */
export function codeProblem(code: string, length = 4): "length" | "digits" | "repeat" | null {
  if (code.length !== length) return "length";
  if (!/^\d+$/.test(code)) return "digits";
  if (new Set(code).size !== code.length) return "repeat";
  return null;
}

/**
 * Dead = right digit, right place. Wounded = right digit, wrong place.
 * Both codes must be valid (unique digits) and equally long.
 */
export function scoreGuess(secret: string, guess: string): Feedback {
  if (secret.length !== guess.length) throw new Error("Length mismatch");
  let dead = 0;
  let common = 0;
  let secretMask = 0;
  for (let i = 0; i < secret.length; i++) secretMask |= 1 << (secret.charCodeAt(i) - 48);
  for (let i = 0; i < guess.length; i++) {
    if (secret.charCodeAt(i) === guess.charCodeAt(i)) dead++;
    if (secretMask & (1 << (guess.charCodeAt(i) - 48))) common++;
  }
  return { dead, wounded: common - dead };
}

export const isKpai = (f: Feedback, length: number) => f.dead === length;
