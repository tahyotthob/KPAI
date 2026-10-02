import { describe, expect, it } from "vitest";
import { evaluateBadges } from "./badges";
import { dailyCode, dailyNumber, emojiGrid, emptyDaily, lagosDateKey, liveDailyStreak, msUntilNextDaily, recordDaily, shareText, yesterdayKey } from "./daily";
import { nextStreak, streakLine } from "./streak";
import { pickTaunt, TAUNTS } from "./taunts";
import { isValidCode } from "./game/score";

describe("win streak", () => {
  it("win +1, lose resets, draw keeps", () => {
    let s = { current: 0, best: 0 };
    s = nextStreak(s, "win");
    s = nextStreak(s, "win");
    s = nextStreak(s, "draw");
    expect(s).toEqual({ current: 2, best: 2 });
    s = nextStreak(s, "lose");
    expect(s).toEqual({ current: 0, best: 2 });
  });
  it("milestone lines", () => {
    expect(streakLine({ current: 2, best: 2 }, { current: 3, best: 3 })).toContain("3 wins");
    expect(streakLine({ current: 4, best: 4 }, { current: 0, best: 4 })).toContain("Streak don die");
    expect(streakLine({ current: 0, best: 0 }, { current: 1, best: 1 })).toBeNull();
  });
});

describe("daily kpai", () => {
  it("same day -> same valid code; different day -> (almost surely) different", () => {
    expect(dailyCode("2026-10-02")).toBe(dailyCode("2026-10-02"));
    expect(isValidCode(dailyCode("2026-10-02"), 4)).toBe(true);
    const codes = new Set(Array.from({ length: 30 }, (_, i) => dailyCode(`2026-11-${String(i + 1).padStart(2, "0")}`)));
    expect(codes.size).toBeGreaterThan(25);
  });
  it("numbering and date helpers", () => {
    expect(dailyNumber("2026-01-01")).toBe(1);
    expect(dailyNumber("2026-01-31")).toBe(31);
    expect(yesterdayKey("2026-03-01")).toBe("2026-02-28");
    expect(lagosDateKey(new Date("2026-10-02T23:30:00Z"))).toBe("2026-10-03"); // Lagos is UTC+1
    expect(msUntilNextDaily(new Date("2026-10-02T22:00:00Z"))).toBe(3600000);
  });
  it("emoji grid + share text", () => {
    const moves = [{ guess: "1234", dead: 1, wounded: 2 }, { guess: "5678", dead: 4, wounded: 0 }];
    expect(emojiGrid(moves, 4)).toEqual(["🟥🟪🟪⬛", "🟥🟥🟥🟥"]);
    const t = shareText("2026-01-02", moves, 4, 3, "https://x.test/play/daily");
    expect(t).toContain("Daily #2 - cracked in 2 🔥3");
    expect(t).toContain("🟥🟥🟥🟥");
    expect(t.endsWith("https://x.test/play/daily")).toBe(true);
  });
  it("daily streak continues on consecutive days and resets after a gap", () => {
    let s = emptyDaily();
    s = recordDaily(s, "2026-10-01", 4, []);
    s = recordDaily(s, "2026-10-02", 5, []);
    expect(s.streak).toBe(2);
    expect(recordDaily(s, "2026-10-02", 1, []).results["2026-10-02"].guesses).toBe(5); // once per day
    s = recordDaily(s, "2026-10-05", 3, []);
    expect(s.streak).toBe(1);
    expect(s.best).toBe(2);
    expect(liveDailyStreak(s, "2026-10-07")).toBe(0);
    expect(liveDailyStreak(s, "2026-10-06")).toBe(1);
  });
});

describe("badges", () => {
  const base = { mode: "computer" as const, outcome: "win" as const, guesses: 6, length: 4, streak: 1, hour: 14 };
  it("first win unlocks First Blood only", () => {
    expect(evaluateBadges(base, new Set())).toEqual(["first_blood"]);
  });
  it("never re-awards", () => {
    expect(evaluateBadges(base, new Set(["first_blood"]))).toEqual([]);
  });
  it("situational badges", () => {
    const ids = evaluateBadges({ ...base, guesses: 3, level: "hard", streak: 5, hour: 2, length: 5 }, new Set(["first_blood"]));
    expect(ids).toEqual(expect.arrayContaining(["zero_waste", "oga_slayer", "on_fire", "who_born_you", "night_owl", "big_brain"]));
    expect(evaluateBadges({ ...base, outcome: "lose" }, new Set())).toEqual([]);
    expect(evaluateBadges({ ...base, outcome: "draw" }, new Set(["first_blood"]))).toEqual(["na_tie"]);
    expect(evaluateBadges({ ...base, mode: "daily", dailyStreak: 3 }, new Set(["first_blood"]))).toEqual(expect.arrayContaining(["daily_hustler", "consistent"]));
  });
});

describe("taunts", () => {
  it("every persona has lines for every trigger, short and non-repeating back-to-back", () => {
    for (const lvl of ["easy", "medium", "hard"] as const)
      for (const [trig, lines] of Object.entries(TAUNTS[lvl])) {
        expect(lines.length, `${lvl}.${trig}`).toBeGreaterThanOrEqual(2);
        for (const l of lines) expect(l.length).toBeLessThanOrEqual(70);
      }
    const a = pickTaunt("hard", "start");
    const b = pickTaunt("hard", "start");
    expect(a).not.toBe(b);
  });
});
