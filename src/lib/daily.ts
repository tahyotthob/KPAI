import { randomCode } from "@/lib/game/candidates";
import type { Move } from "@/lib/game/types";

const TZ = "Africa/Lagos";
const EPOCH = Date.UTC(2026, 0, 1);

/** YYYY-MM-DD in Lagos time - the "day" everybody shares. */
export function lagosDateKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

const keyToUtc = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Puzzle number, #1 = 1 Jan 2026. */
export function dailyNumber(key: string): number {
  return Math.round((keyToUtc(key) - EPOCH) / 86400000) + 1;
}

export function yesterdayKey(key: string): string {
  return new Date(keyToUtc(key) - 86400000).toISOString().slice(0, 10);
}

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Same code for every player on a given Lagos day, no server needed. */
export function dailyCode(key: string, len = 4): string {
  return randomCode(len, mulberry32(hashStr(`kpai:${key}`)));
}

/** Wordle-style grid: 🟥 per Dead, 🟪 per Wounded, ⬛ for the rest. */
export function emojiGrid(moves: Move[], len: number): string[] {
  return moves.map((m) => "🟥".repeat(m.dead) + "🟪".repeat(m.wounded) + "⬛".repeat(Math.max(0, len - m.dead - m.wounded)));
}

export function shareText(key: string, moves: Move[], len: number, streak: number, url: string): string {
  const flame = streak > 1 ? ` 🔥${streak}` : "";
  return [`KPAI! Daily #${dailyNumber(key)} - cracked in ${moves.length}${flame}`, ...emojiGrid(moves, len), "Can you beat me? 💀🩸", url].join("\n");
}

export interface DailyStore {
  results: Record<string, { guesses: number; grid: string[] }>;
  streak: number;
  best: number;
  lastKey: string | null;
}

export const emptyDaily = (): DailyStore => ({ results: {}, streak: 0, best: 0, lastKey: null });

export function recordDaily(s: DailyStore, key: string, guesses: number, grid: string[]): DailyStore {
  if (s.results[key]) return s;
  const streak = s.lastKey === yesterdayKey(key) ? s.streak + 1 : 1;
  const keep = Object.entries(s.results).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 60);
  return { results: { ...Object.fromEntries(keep), [key]: { guesses, grid } }, streak, best: Math.max(s.best, streak), lastKey: key };
}

/** Streak shown today: it lapses if yesterday was missed. */
export function liveDailyStreak(s: DailyStore, key: string): number {
  return s.lastKey === key || s.lastKey === yesterdayKey(key) ? s.streak : 0;
}

export function msUntilNextDaily(now: Date = new Date()): number {
  const key = lagosDateKey(now);
  const nextMidnightLagos = keyToUtc(key) + 86400000 - 3600000; // Lagos = UTC+1, no DST
  return Math.max(0, nextMidnightLagos - now.getTime());
}

const STORE_KEY = "kpai:daily";
export function loadDaily(): DailyStore {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null");
    if (raw && raw.results) return raw as DailyStore;
  } catch {}
  return emptyDaily();
}
export function saveDaily(s: DailyStore) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {}
}
