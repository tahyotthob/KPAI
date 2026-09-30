import { describe, expect, it } from "vitest";
import { replayTranscript, type Transcript } from "./transcript";

const base: Transcript = {
  mode: "computer", length: 4, secrets: ["1234", "5678"],
  events: [{ p: 0, g: "5678" }, { p: 1, g: "0000" }],
};

describe("replayTranscript", () => {
  it("player 0 cracks, player 1 misses on final turn -> 0 wins", () => {
    const r = replayTranscript({ ...base, events: [{ p: 0, g: "5678" }, { p: 1, g: "1243" }] });
    expect(r).toEqual({ ok: true, winner: 0, guesses: [1, 1] });
  });
  it("both crack -> draw", () => {
    const r = replayTranscript({ ...base, events: [{ p: 0, g: "5678" }, { p: 1, g: "1234" }] });
    expect(r).toMatchObject({ ok: true, winner: "draw" });
  });
  it("player 1 cracks first -> 1 wins", () => {
    const r = replayTranscript({ ...base, events: [{ p: 0, g: "0123" }, { p: 1, g: "1234" }] });
    expect(r).toMatchObject({ ok: true, winner: 1 });
  });
  it("rejects unfinished, out-of-turn, invalid and post-game events", () => {
    expect(replayTranscript({ ...base, events: [{ p: 0, g: "0123" }] }).ok).toBe(false);
    expect(replayTranscript({ ...base, events: [{ p: 1, g: "1234" }] }).ok).toBe(false);
    expect(replayTranscript({ ...base, events: [{ p: 0, g: "1123" }] }).ok).toBe(false);
    expect(replayTranscript({ ...base, events: [{ p: 0, g: "5678" }, { p: 1, g: "1234" }, { p: 0, g: "1234" }] }).ok).toBe(false);
    expect(replayTranscript({ ...base, secrets: ["1123", "5678"] }).ok).toBe(false);
  });
  it("timer skips are allowed; skipping the final turn hands player 0 the win", () => {
    const r = replayTranscript({ ...base, events: [{ p: 0, g: null }, { p: 1, g: "0123" }, { p: 0, g: "5678" }, { p: 1, g: null }] });
    expect(r).toMatchObject({ ok: true, winner: 0 });
  });
  it("practice", () => {
    const t: Transcript = { mode: "practice", length: 4, secrets: ["9876"], events: [{ p: 0, g: "1234" }, { p: 0, g: "9876" }] };
    expect(replayTranscript(t)).toEqual({ ok: true, winner: 0, guesses: [2, 0] });
    expect(replayTranscript({ ...t, events: [{ p: 0, g: "1234" }] }).ok).toBe(false);
  });
});
