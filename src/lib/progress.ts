import { BADGE_BY_ID, evaluateBadges, loadBadges, saveBadges, type BadgeContext } from "./badges";
import { loadDaily, liveDailyStreak, lagosDateKey } from "./daily";
import { loadStreak, nextStreak, saveStreak, streakLine, type StreakState } from "./streak";
import { haptic, toast } from "./toast";
import type { AiLevel } from "./game/types";

export interface EndInfo {
  mode: BadgeContext["mode"];
  outcome: "win" | "lose" | "draw";
  guesses: number;
  length: number;
  level?: AiLevel;
}

/** Direct unlock (e.g. finishing the tutorial). Returns true if it was newly unlocked. */
export function unlockBadge(id: string): boolean {
  try {
    const have = loadBadges();
    if (have[id] || !BADGE_BY_ID[id]) return false;
    saveBadges({ ...have, [id]: Date.now() });
    const b = BADGE_BY_ID[id];
    setTimeout(() => toast(`Badge unlocked: ${b.name}`, b.emoji, b.desc), 700);
    return true;
  } catch {
    return false;
  }
}

const lagosHour = () => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", hour12: false }).format(new Date())) % 24;

/**
 * Called once when a game finishes: updates the win streak, unlocks badges, buzzes the phone
 * and pops toasts. Purely local (localStorage); never blocks the result screen.
 */
export function recordGameEnd(info: EndInfo): { streak: StreakState; unlocked: string[] } {
  try {
    const before = loadStreak();
    // practice and daily are solo: they never touch the head-to-head win streak
    const counts = info.mode === "computer" || info.mode === "pass" || info.mode === "online";
    const after = counts ? nextStreak(before, info.outcome) : before;
    if (counts) saveStreak(after);

    const have = loadBadges();
    const daily = loadDaily();
    const ids = evaluateBadges(
      { ...info, streak: after.current, dailyStreak: liveDailyStreak(daily, lagosDateKey()), hour: lagosHour() },
      new Set(Object.keys(have)),
    );
    if (ids.length) saveBadges({ ...have, ...Object.fromEntries(ids.map((id) => [id, Date.now()])) });

    haptic(info.outcome === "win" ? [30, 40, 70] : info.outcome === "lose" ? [220] : [40]);
    const line = counts ? streakLine(before, after) : null;
    if (line) toast(line, "🔥");
    ids.forEach((id, i) => {
      const b = BADGE_BY_ID[id];
      setTimeout(() => toast(`Badge unlocked: ${b.name}`, b.emoji, b.desc), 900 + i * 1200);
    });
    try {
      window.dispatchEvent(new Event("kpai:progress"));
    } catch {}
    return { streak: after, unlocked: ids };
  } catch {
    return { streak: { current: 0, best: 0 }, unlocked: [] };
  }
}
