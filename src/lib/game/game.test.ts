import { describe, expect, it } from "vitest";
import {
  allCodes, basePoints, codeProblem, hardGuess, isValidCode, nextGuess, randomCode,
  scoreGuess, titleFor, easyGuess, mediumGuess, type AiLevel, type Move,
} from "./index";

function play(level: AiLevel, secret: string, max = 40): number {
  const history: Move[] = [];
  for (let n = 1; n <= max; n++) {
    const guess = nextGuess(level, secret.length, history);
    expect(isValidCode(guess, secret.length)).toBe(true);
    const f = scoreGuess(secret, guess);
    history.push({ guess, ...f });
    if (f.dead === secret.length) return n;
  }
  return max + 1;
}

describe("scoreGuess", () => {
  it("6247 vs 1234 = 1 Dead, 1 Wounded", () => {
    expect(scoreGuess("6247", "1234")).toEqual({ dead: 1, wounded: 1 });
  });
  it("4 dead on exact match", () => {
    expect(scoreGuess("0381", "0381")).toEqual({ dead: 4, wounded: 0 });
  });
  it("all wounded", () => {
    expect(scoreGuess("1234", "4321")).toEqual({ dead: 0, wounded: 4 });
  });
  it("nothing", () => {
    expect(scoreGuess("1234", "5678")).toEqual({ dead: 0, wounded: 0 });
  });
  it("works for 3 and 5 digits", () => {
    expect(scoreGuess("123", "132")).toEqual({ dead: 1, wounded: 2 });
    expect(scoreGuess("12345", "54321")).toEqual({ dead: 1, wounded: 4 });
  });
});

describe("validation", () => {
  it("rejects repeated digits", () => {
    expect(isValidCode("1123")).toBe(false);
    expect(codeProblem("1123")).toBe("repeat");
  });
  it("accepts leading zero", () => expect(isValidCode("0381")).toBe(true));
  it("rejects wrong length / non digits", () => {
    expect(isValidCode("123")).toBe(false);
    expect(isValidCode("12a4")).toBe(false);
    expect(codeProblem("12a4")).toBe("digits");
    expect(codeProblem("12")).toBe("length");
  });
  it("has 5040 four-digit codes", () => {
    expect(allCodes(4)).toHaveLength(5040);
    expect(allCodes(3)).toHaveLength(720);
    expect(allCodes(5)).toHaveLength(30240);
  });
  it("randomCode is always valid", () => {
    for (let i = 0; i < 200; i++) for (const l of [3, 4, 5]) expect(isValidCode(randomCode(l), l)).toBe(true);
  });
});

describe("solvers", () => {
  it("Hard solves every one of 200 random secrets within 7 guesses", () => {
    let total = 0;
    for (let i = 0; i < 200; i++) {
      const n = play("hard", randomCode(4));
      expect(n).toBeLessThanOrEqual(7);
      total += n;
    }
    expect(total / 200).toBeLessThan(5.6);
  });
  it("Medium (Area Boy) solves eventually and averages ~6-6.5 guesses", () => {
    let total = 0;
    const N = 150;
    for (let i = 0; i < N; i++) {
      const n = play("medium", randomCode(4));
      expect(n).toBeLessThanOrEqual(25);
      total += n;
    }
    expect(total / N).toBeLessThan(7.5);
  });
  it("Easy always produces valid, non-repeating guesses", () => {
    const secret = randomCode(4);
    const hist: Move[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const g = easyGuess(4, hist);
      expect(seen.has(g)).toBe(false);
      seen.add(g);
      hist.push({ guess: g, ...scoreGuess(secret, g) });
    }
  });
  it("Medium only proposes consistent codes", () => {
    const secret = "6247";
    const hist: Move[] = [{ guess: "1234", ...scoreGuess(secret, "1234") }];
    for (let i = 0; i < 20; i++) {
      const g = mediumGuess(4, hist);
      expect(scoreGuess(g, "1234")).toEqual({ dead: 1, wounded: 1 });
    }
  });
  it("Hard works on 3 and 5 digits", () => {
    expect(play("hard", randomCode(3))).toBeLessThanOrEqual(8);
    expect(hardGuess(5, [])).toBe("01234");
    expect(play("hard", randomCode(5))).toBeLessThanOrEqual(10);
  });
});

describe("points & titles", () => {
  it("awards per the table", () => {
    expect(basePoints({ mode: "online", outcome: "win", guesses: 9 }).points).toBe(30);
    expect(basePoints({ mode: "online", outcome: "win", guesses: 5 }).points).toBe(35);
    expect(basePoints({ mode: "pass", outcome: "win", guesses: 8 }).points).toBe(10);
    expect(basePoints({ mode: "computer", aiLevel: "hard", outcome: "win", guesses: 6 }).points).toBe(25);
    expect(basePoints({ mode: "computer", aiLevel: "medium", outcome: "win", guesses: 4 }).points).toBe(17);
    expect(basePoints({ mode: "computer", aiLevel: "easy", outcome: "win", guesses: 9 }).points).toBe(4);
    expect(basePoints({ mode: "computer", aiLevel: "easy", outcome: "draw", guesses: 9 }).points).toBe(5);
    expect(basePoints({ mode: "online", outcome: "lose", guesses: 9 }).points).toBe(1);
    expect(basePoints({ mode: "practice", outcome: "win", guesses: 5 }).points).toBe(8);
    expect(basePoints({ mode: "practice", outcome: "win", guesses: 7 }).points).toBe(4);
    expect(basePoints({ mode: "practice", outcome: "win", guesses: 8 }).points).toBe(1);
  });
  it("scales win rows by code length; 4 digits is unchanged", () => {
    const b = (length: 3 | 4 | 5, guesses: number, mode: "online" | "pass" = "online") =>
      basePoints({ mode, outcome: "win", guesses, length }).points;
    expect(b(4, 9)).toBe(30);
    expect(b(3, 9)).toBe(18);
    expect(b(5, 9)).toBe(42);
    expect(b(3, 4)).toBe(23); // speed bonus at <=4 guesses
    expect(b(3, 5)).toBe(18);
    expect(b(5, 7)).toBe(47); // speed bonus at <=7 guesses
    expect(b(5, 8)).toBe(42);
    expect(b(3, 9, "pass")).toBe(6);
    expect(basePoints({ mode: "computer", aiLevel: "hard", outcome: "win", guesses: 9, length: 5 }).points).toBe(35);
    expect(basePoints({ mode: "computer", aiLevel: "medium", outcome: "win", guesses: 9, length: 3 }).points).toBe(7);
    expect(basePoints({ mode: "computer", aiLevel: "easy", outcome: "win", guesses: 9, length: 5 }).points).toBe(6);
    // flat rows are not scaled
    expect(basePoints({ mode: "online", outcome: "lose", guesses: 9, length: 5 }).points).toBe(1);
    expect(basePoints({ mode: "online", outcome: "draw", guesses: 9, length: 3 }).points).toBe(5);
  });
  it("practice tiers shift with length", () => {
    const p = (length: 3 | 4 | 5, guesses: number) => basePoints({ mode: "practice", outcome: "win", guesses, length }).points;
    expect([p(3, 4), p(3, 5), p(3, 6), p(3, 7)]).toEqual([8, 4, 4, 1]);
    expect([p(5, 7), p(5, 9), p(5, 10)]).toEqual([8, 4, 1]);
  });
  it("titles by threshold", () => {
    expect(titleFor(0).name).toBe("Learner");
    expect(titleFor(99).name).toBe("Learner");
    expect(titleFor(100).name).toBe("Street Sharp");
    expect(titleFor(500).name).toBe("Area Champion");
    expect(titleFor(1500).name).toBe("Oga");
    expect(titleFor(5000).name).toBe("Kpai Master");
  });
});
