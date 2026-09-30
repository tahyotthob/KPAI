import { describe, expect, it } from "vitest";
import { CHAT_BY_ID, CHAT_LINES } from "./chat";

describe("chat presets", () => {
  it("has unique ids and short lines", () => {
    expect(new Set(CHAT_LINES.map((l) => l.id)).size).toBe(CHAT_LINES.length);
    for (const l of CHAT_LINES) expect(l.text.length).toBeLessThanOrEqual(40);
  });
  it("rejects unknown ids (nothing but presets is ever shown)", () => {
    expect(CHAT_BY_ID["<script>"]).toBeUndefined();
    expect(CHAT_BY_ID["shoot"].text).toContain("shoot");
  });
});
