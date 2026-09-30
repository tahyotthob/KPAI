import { describe, expect, it } from "vitest";
import { isProfane, nicknameProblem } from "./profanity";

describe("profanity filter", () => {
  it("blocks obvious and leetspeak variants", () => {
    for (const n of ["fuckyou", "Sh1t_head", "b1tch", "Ashawo", "olosho_99", "N1gga"]) expect(isProfane(n)).toBe(true);
  });
  it("blocks short words only as whole words", () => {
    expect(isProfane("ass")).toBe(true);
    expect(isProfane("sex_king")).toBe(true);
  });
  it("lets normal nicknames through (no Scunthorpe problem)", () => {
    for (const n of ["ClassAct", "Lagos_Boy", "Mama_Put", "Kpai_Master", "Assassin", "Codebreaker", "Obinna", "Adebayo"]) expect(isProfane(n)).toBe(false);
  });
  it("validates format", () => {
    expect(nicknameProblem("ab")).toBe("format");
    expect(nicknameProblem("has space")).toBe("format");
    expect(nicknameProblem("Good_Name1")).toBeNull();
  });
});
