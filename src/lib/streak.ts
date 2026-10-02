export interface StreakState {
  current: number;
  best: number;
}

export type StreakOutcome = "win" | "lose" | "draw";

/** Win streak: win +1, lose resets to 0, draw leaves it alone. */
export function nextStreak(s: StreakState, outcome: StreakOutcome): StreakState {
  if (outcome === "draw") return s;
  if (outcome === "lose") return { current: 0, best: s.best };
  const current = s.current + 1;
  return { current, best: Math.max(s.best, current) };
}

export function streakLine(before: StreakState, after: StreakState): string | null {
  if (after.current === 3) return "3 wins! You dey cook 🔥";
  if (after.current === 5) return "5 in a row! Who born you? 👑";
  if (after.current === 10) return "10 STRAIGHT?! Dem go register you 🏆";
  if (before.current >= 3 && after.current === 0) return "Streak don die. Dust yourself 😮‍💨";
  return null;
}

const KEY = "kpai:streak";

export function loadStreak(): StreakState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw && Number.isFinite(raw.current) && Number.isFinite(raw.best)) return raw;
  } catch {}
  return { current: 0, best: 0 };
}

export function saveStreak(s: StreakState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
