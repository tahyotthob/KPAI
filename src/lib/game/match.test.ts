import { describe, expect, it } from "vitest";
import { applyGuess, forfeit, newMatch, skipTurn } from "./match";

const miss = { dead: 0, wounded: 1 };
const kpai = { dead: 4, wounded: 0 };

describe("match fairness rule", () => {
  it("P0 cracks, P1 misses on final turn -> P0 wins", () => {
    let s = newMatch(4);
    s = applyGuess(s, 0, "1234", kpai);
    expect(s.winner).toBeNull();
    expect(s.finalTurn).toBe(true);
    s = applyGuess(s, 1, "5678", miss);
    expect(s.winner).toBe(0);
  });
  it("P0 cracks, P1 also cracks -> draw", () => {
    let s = newMatch(4);
    s = applyGuess(s, 0, "1234", kpai);
    s = applyGuess(s, 1, "5678", kpai);
    expect(s.winner).toBe("draw");
  });
  it("P1 cracks first -> P1 wins immediately", () => {
    let s = newMatch(4);
    s = applyGuess(s, 0, "1234", miss);
    s = applyGuess(s, 1, "5678", kpai);
    expect(s.winner).toBe(1);
  });
  it("enforces turn order and game over", () => {
    const s = newMatch(4);
    expect(() => applyGuess(s, 1, "1234", miss)).toThrow();
    const done = applyGuess(applyGuess(s, 0, "1234", miss), 1, "5678", kpai);
    expect(() => applyGuess(done, 0, "1234", miss)).toThrow();
  });
  it("skip and forfeit", () => {
    let s = skipTurn(newMatch(4));
    expect(s.turn).toBe(1);
    s = applyGuess(newMatch(4), 0, "1234", kpai);
    expect(skipTurn(s).winner).toBe(0);
    expect(forfeit(newMatch(4), 0).winner).toBe(1);
  });
});
