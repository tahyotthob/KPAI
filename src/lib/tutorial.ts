import type { Move } from "./game/types";

export type Mark = "dead" | "wounded" | "none";

/** Per-digit verdict for a guess: right place, wrong place, or not in the code. */
export function markDigits(secret: string, guess: string): Mark[] {
  return guess.split("").map((d, i) => (secret[i] === d ? "dead" : secret.includes(d) ? "wounded" : "none"));
}

export interface Explanation {
  marks: Mark[];
  dead: number;
  wounded: number;
  /** Mama Put explains each digit in plain language. */
  lines: string[];
}

export function explain(secret: string, guess: string): Explanation {
  const marks = markDigits(secret, guess);
  const lines: string[] = [];
  const none: string[] = [];
  marks.forEach((mk, i) => {
    const d = guess[i];
    if (mk === "dead") lines.push(`${d} dey the code AND e dey the right place → 💀 Dead`);
    else if (mk === "wounded") lines.push(`${d} dey the code, but for another place → 🩸 Wounded`);
    else none.push(d);
  });
  if (none.length) lines.push(`${none.join(", ")} no dey the code at all → cross ${none.length > 1 ? "them" : "am"} out!`);
  return { marks, dead: marks.filter((x) => x === "dead").length, wounded: marks.filter((x) => x === "wounded").length, lines };
}

/** One friendly nudge based on how the last guess went. */
export function nudge(len: number, last: Move, count: number): string {
  const { dead, wounded } = last;
  if (dead === len) return "KPAI! You cracked am!";
  if (dead + wounded === 0)
    return count === 1
      ? "Zero and zero looks bad, but na good news: none of these digits dey the code. Cross all of them out and use the other digits!"
      : "Nothing again! Cross those digits out on the note pad — now you know say dem no dey.";
  if (dead + wounded === len) return "You get ALL the right digits! Na only the arrangement remain — shuffle dem small small.";
  if (dead === len - 1) return "E don almost reach! Only one thing dey wrong — change one digit.";
  if (dead === 0) return "Everybody wey you hit dey inside the code but for the wrong place. Try to move dem around.";
  if (wounded === 0) return "The digits wey you hit dey the right place. Keep dem there and change the rest!";
  return "Keep the Dead digits where dem dey, and try to move the Wounded ones to new places.";
}

/** A concrete clue Mama Put can give: the first position not yet pinned down by a Dead. */
export function hintFor(secret: string, history: Move[]): string {
  const pinned = new Set<number>();
  for (const m of history) m.guess.split("").forEach((d, i) => secret[i] === d && pinned.add(i));
  for (let i = 0; i < secret.length; i++) {
    if (!pinned.has(i)) return `The ${ordinal(i + 1)} digit na ${secret[i]}.`;
  }
  return "You don find everything o — just press Shoot!";
}

const ordinal = (n: number) => ["", "first", "second", "third", "fourth", "fifth"][n] ?? `${n}th`;

export const TUTORIAL_DONE_KEY = "kpai:tutorialDone";
export const isTutorialDone = (): boolean => {
  try {
    return localStorage.getItem(TUTORIAL_DONE_KEY) === "1";
  } catch {
    return false;
  }
};
export const setTutorialDone = () => {
  try {
    localStorage.setItem(TUTORIAL_DONE_KEY, "1");
  } catch {}
};
