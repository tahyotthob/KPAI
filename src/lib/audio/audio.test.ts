import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LINES } from "./lines";

describe("audio lines", () => {
  const readme = readFileSync("public/audio/README.md", "utf8");
  it("README lists every file and line", () => {
    for (const lines of Object.values(LINES))
      for (const l of lines) {
        expect(readme).toContain(l.file.replace(/^\//, "public/"));
        expect(readme).toContain(l.text);
      }
  });
  it("has the required categories", () => {
    expect(Object.keys(LINES).sort()).toEqual(["close", "hurry", "invalid", "lose", "win", "wounded", "zero"]);
    expect(LINES.zero).toHaveLength(6);
  });
});
