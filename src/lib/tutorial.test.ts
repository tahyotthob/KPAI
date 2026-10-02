import { describe, expect, it } from "vitest";
import { explain, hintFor, markDigits, nudge } from "./tutorial";

describe("tutorial explanations", () => {
  it("marks the worked example 6247 vs 1234 exactly like the rules", () => {
    expect(markDigits("6247", "1234")).toEqual(["none", "dead", "none", "wounded"]);
    const e = explain("6247", "1234");
    expect([e.dead, e.wounded]).toEqual([1, 1]);
    expect(e.lines).toHaveLength(3);
    expect(e.lines.join(" ")).toContain("2 dey the code AND");
    expect(e.lines.join(" ")).toContain("1, 3 no dey the code");
  });
  it("agrees with scoreGuess for random pairs", async () => {
    const { scoreGuess, randomCode } = await import("./game");
    for (let i = 0; i < 200; i++) {
      const s = randomCode(4);
      const g = randomCode(4);
      const e = explain(s, g);
      expect({ dead: e.dead, wounded: e.wounded }).toEqual(scoreGuess(s, g));
    }
  });
  it("nudges for each situation", () => {
    expect(nudge(4, { guess: "1234", dead: 0, wounded: 0 }, 1)).toContain("good news");
    expect(nudge(4, { guess: "1234", dead: 1, wounded: 3 }, 2)).toContain("ALL the right digits");
    expect(nudge(4, { guess: "1234", dead: 3, wounded: 0 }, 2)).toContain("almost");
    expect(nudge(4, { guess: "1234", dead: 0, wounded: 2 }, 2)).toContain("wrong place");
    expect(nudge(4, { guess: "1234", dead: 2, wounded: 0 }, 2)).toContain("right place");
    expect(nudge(4, { guess: "1234", dead: 1, wounded: 1 }, 2)).toContain("Keep the Dead");
  });
  it("hint reveals the first unpinned position", () => {
    expect(hintFor("6247", [])).toBe("The first digit na 6.");
    expect(hintFor("6247", [{ guess: "6999", dead: 1, wounded: 0 }])).toBe("The second digit na 2.");
    expect(hintFor("6247", [{ guess: "6247", dead: 4, wounded: 0 }])).toContain("press Shoot");
  });
});
