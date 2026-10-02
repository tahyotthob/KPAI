import type { AiLevel } from "@/lib/game/types";

export interface Badge {
  id: string;
  emoji: string;
  name: string;
  desc: string;
}

export const BADGES: Badge[] = [
  { id: "first_blood", emoji: "🩸", name: "First Blood", desc: "Win your first game" },
  { id: "zero_waste", emoji: "🎯", name: "Zero Waste", desc: "Crack the code in 3 guesses or fewer" },
  { id: "oga_slayer", emoji: "🕶️", name: "Oga Slayer", desc: "Beat Oga Kpai" },
  { id: "on_fire", emoji: "🔥", name: "On Fire", desc: "Win 3 games in a row" },
  { id: "who_born_you", emoji: "👑", name: "Who Born You?", desc: "Win 5 games in a row" },
  { id: "night_owl", emoji: "🦉", name: "Night Owl", desc: "Win between midnight and 5am" },
  { id: "patience", emoji: "🐢", name: "Patience Pays", desc: "Win a game that took 10+ guesses" },
  { id: "big_brain", emoji: "🧠", name: "Big Brain", desc: "Win a 5-digit game" },
  { id: "friend_beater", emoji: "🌍", name: "Friend Beater", desc: "Win an online game" },
  { id: "na_tie", emoji: "🤝", name: "Na Tie", desc: "Draw a game" },
  { id: "daily_hustler", emoji: "📅", name: "Daily Hustler", desc: "Solve a Daily Kpai" },
  { id: "consistent", emoji: "🗓️", name: "Consistent", desc: "Solve the Daily 3 days in a row" },
];

export const BADGE_BY_ID: Record<string, Badge> = Object.fromEntries(BADGES.map((b) => [b.id, b]));

export interface BadgeContext {
  mode: "computer" | "practice" | "pass" | "online" | "daily";
  outcome: "win" | "lose" | "draw";
  guesses: number;
  length: number;
  level?: AiLevel;
  /** win streak AFTER this game */
  streak: number;
  dailyStreak?: number;
  /** hour of day 0-23 in Lagos */
  hour: number;
}

/** Pure: which badges does this finished game newly unlock? */
export function evaluateBadges(ctx: BadgeContext, have: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const add = (id: string, cond: boolean) => {
    if (cond && !have.has(id) && !out.includes(id)) out.push(id);
  };
  const won = ctx.outcome === "win";
  add("first_blood", won);
  add("zero_waste", won && ctx.guesses <= (ctx.length === 3 ? 2 : 3));
  add("oga_slayer", won && ctx.mode === "computer" && ctx.level === "hard");
  add("on_fire", ctx.streak >= 3);
  add("who_born_you", ctx.streak >= 5);
  add("night_owl", won && ctx.hour >= 0 && ctx.hour < 5);
  add("patience", won && ctx.guesses >= 10);
  add("big_brain", won && ctx.length === 5);
  add("friend_beater", won && ctx.mode === "online");
  add("na_tie", ctx.outcome === "draw");
  add("daily_hustler", won && ctx.mode === "daily");
  add("consistent", ctx.mode === "daily" && won && (ctx.dailyStreak ?? 0) >= 3);
  return out;
}

const KEY = "kpai:badges";
export function loadBadges(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}
export function saveBadges(b: Record<string, number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {}
}
