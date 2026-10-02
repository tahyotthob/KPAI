import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeFakeAdmin } from "@/lib/server/fakeDb";

const fake = makeFakeAdmin();
vi.mock("@/lib/server/admin", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/admin")>("@/lib/server/admin");
  return { ...actual, getAdmin: () => fake.admin };
});

import { POST as create } from "./route";
import { POST as join } from "./join/route";
import { POST as secret } from "./[id]/secret/route";
import { POST as guess } from "./[id]/guess/route";
import { GET as reveal } from "./[id]/reveal/route";
import { POST as claim } from "./[id]/claim/route";
import { POST as local } from "./local/route";
import { POST as finish } from "./[id]/finish/route";

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const C = "cccccccc-0000-4000-8000-000000000003";

const req = (user: string, body?: unknown, method = "POST") =>
  new Request("http://test/api", { method, headers: { authorization: `Bearer tok-${user}`, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const json = async (r: Response) => ({ status: r.status, body: await r.json() });

async function setupGame() {
  const c = await json(await create(req(A, { length: 4, timer: 0 })));
  const id = c.body.id as string;
  const j = await json(await join(req(B, { roomCode: c.body.roomCode })));
  expect(j.body.id).toBe(id);
  expect((await json(await secret(req(A, { secret: "1234" }), ctx(id)))).status).toBe(200);
  const s2 = await json(await secret(req(B, { secret: "5678" }), ctx(id)));
  expect(s2.body.started).toBe(true);
  // backdate so the 10-second anti-farming rule doesn't reject the game
  const g = fake.tables.games.find((x) => x.id === id)!;
  g.started_at = new Date(Date.now() - 60_000).toISOString();
  return id;
}

beforeEach(() => {
  for (const k of Object.keys(fake.tables)) fake.tables[k].length = 0;
  fake.rpcCalls.length = 0;
  fake.tables.players.push({ id: A, nickname: "Alice" }, { id: B, nickname: "Bob" }, { id: C, nickname: "Carol" });
});

describe("online game routes", () => {
  it("rejects unauthenticated requests and users without a nickname", async () => {
    expect((await json(await create(new Request("http://t", { method: "POST", body: "{}" })))).status).toBe(401);
    expect((await json(await create(req("dddddddd-0000-4000-8000-000000000004", {})))).status).toBe(428);
  });

  it("never returns a secret; only dead/wounded", async () => {
    const id = await setupGame();
    const r = await json(await guess(req(A, { guess: "5670" }), ctx(id)));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ dead: 3, wounded: 0, winner: null, moveNumber: 1 });
    // the response carries the new turn state so the client can update instantly
    expect(r.body.game).toMatchObject({ current_turn: 1, status: "playing", final_turn: false });
    expect(typeof r.body.game.turn_started_at).toBe("string");
    expect(JSON.stringify(r.body)).not.toContain("5678");
    // the game_secrets table is never part of what a client can select; reveal is blocked until finished
    expect((await json(await reveal(req(A, undefined, "GET"), ctx(id)))).status).toBe(403);
  });

  it("enforces turn order, input format and membership on the server", async () => {
    const id = await setupGame();
    expect((await json(await guess(req(B, { guess: "1234" }), ctx(id)))).body.error).toBe("not_your_turn");
    expect((await json(await guess(req(A, { guess: "1123" }), ctx(id)))).body.error).toBe("bad_guess");
    expect((await json(await guess(req(A, { guess: "12" }), ctx(id)))).status).toBe(400);
    expect((await json(await guess(req(A, { guess: "12a4" }), ctx(id)))).status).toBe(400);
    expect((await json(await guess(req(C, { guess: "1234" }), ctx(id)))).status).toBe(404);
  });

  it("fairness rule: P1 cracks, P2 also cracks -> draw, both get +5", async () => {
    const id = await setupGame();
    await guess(req(A, { guess: "0123" }), ctx(id));
    await guess(req(B, { guess: "0123" }), ctx(id));
    expect((await json(await guess(req(A, { guess: "5678" }), ctx(id)))).body).toMatchObject({ dead: 4, winner: null });
    const last = await json(await guess(req(B, { guess: "1234" }), ctx(id)));
    expect(last.body.winner).toBe("draw");
    expect(fake.rpcCalls.filter((c) => c.name === "record_score").map((c) => [c.args.p_outcome, c.args.p_points])).toEqual([["draw", 5], ["draw", 5]]);
    expect(fake.tables.games[0].status).toBe("finished");
    // reveal now works, and only for players in the game
    const rv = await json(await reveal(req(A, undefined, "GET"), ctx(id)));
    expect(rv.body.secrets).toEqual(["1234", "5678"]);
    expect((await json(await reveal(req(C, undefined, "GET"), ctx(id)))).status).toBe(404);
    expect((await json(await guess(req(A, { guess: "1234" }), ctx(id)))).body.error).toBe("not_playing");
  });

  it("P1 cracks, P2 misses on the final turn -> P1 wins with speed bonus (35)", async () => {
    const id = await setupGame();
    await guess(req(A, { guess: "0123" }), ctx(id));
    await guess(req(B, { guess: "0123" }), ctx(id));
    await guess(req(A, { guess: "5678" }), ctx(id));
    const last = await json(await guess(req(B, { guess: "0123" }), ctx(id)));
    expect(last.body.winner).toBe(0);
    const calls = fake.rpcCalls.filter((c) => c.name === "record_score").map((c) => [c.args.p_player, c.args.p_outcome, c.args.p_points]);
    expect(calls).toEqual([[A, "win", 35], [B, "lose", 1]]);
  });

  it("P2 cracking first wins immediately", async () => {
    const id = await setupGame();
    await guess(req(A, { guess: "0123" }), ctx(id));
    expect((await json(await guess(req(B, { guess: "1234" }), ctx(id)))).body.winner).toBe(1);
  });

  it("disconnect claim needs 2 minutes of silence, and forfeit wins get no speed bonus", async () => {
    const id = await setupGame();
    for (const [u, g] of [[A, "0123"], [B, "0123"], [A, "0124"], [B, "0124"]] as const) await guess(req(u, { guess: g }), ctx(id));
    const early = await json(await claim(req(A, {}), ctx(id)));
    expect(early.body.error).toBe("opponent_still_here");
    fake.tables.games[0].last_seen_p2 = new Date(Date.now() - 150_000).toISOString();
    expect((await json(await claim(req(A, {}), ctx(id)))).body.claimed).toBe(true);
    const calls = fake.rpcCalls.filter((c) => c.name === "record_score").map((c) => [c.args.p_player, c.args.p_outcome, c.args.p_points, c.args.p_guesses]);
    expect(calls).toEqual([[A, "win", 30, null], [B, "lose", 1, null]]);
  });

  it("a room can only hold two players and secrets lock once", async () => {
    const c = await json(await create(req(A, { length: 3 })));
    await join(req(B, { roomCode: c.body.roomCode }));
    expect((await json(await join(req(C, { roomCode: c.body.roomCode })))).body.error).toBe("room_full");
    expect((await json(await secret(req(A, { secret: "123" }), ctx(c.body.id)))).status).toBe(200);
    expect((await json(await secret(req(A, { secret: "456" }), ctx(c.body.id)))).body.error).toBe("secret_already_locked");
    expect((await json(await secret(req(B, { secret: "1123" }), ctx(c.body.id)))).status).toBe(400);
  });

  it("5 parallel guesses for the same turn: exactly one succeeds", async () => {
    const id = await setupGame();
    const rs = await Promise.all(Array.from({ length: 5 }, (_, i) => guess(req(A, { guess: ["0123", "0124", "0125", "0126", "0127"][i] }), ctx(id))));
    const statuses = rs.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409, 409, 409, 409]);
    const errs = await Promise.all(rs.filter((r) => r.status === 409).map(async (r) => (await r.json()).error));
    expect(errs.every((e) => e === "not_your_turn")).toBe(true);
    expect(fake.tables.moves).toHaveLength(1);
    expect(fake.tables.games[0].current_turn).toBe(1);
  });

  it("forfeit/claim before each player has made 2 moves pays nothing, but finishes the game", async () => {
    const id = await setupGame();
    await guess(req(A, { guess: "0123" }), ctx(id));
    fake.tables.games[0].last_seen_p2 = new Date(Date.now() - 150_000).toISOString();
    expect((await json(await claim(req(A, {}), ctx(id)))).body.claimed).toBe(true);
    expect(fake.tables.games[0].status).toBe("finished");
    expect(fake.rpcCalls.filter((c) => c.name === "record_score")).toHaveLength(0);
  });

  it("limits open rooms to 3 per player", async () => {
    for (let i = 0; i < 3; i++) expect((await json(await create(req(A, {})))).status).toBe(200);
    const r = await json(await create(req(A, {})));
    expect(r).toMatchObject({ status: 429, body: { error: "too_many_rooms" } });
    expect((await json(await create(req(B, {})))).status).toBe(200);
  });

  it("limits open local games to 5 per hour", async () => {
    for (let i = 0; i < 5; i++) expect((await json(await local(req(A, { mode: "practice", length: 4 })))).status).toBe(200);
    const r = await json(await local(req(A, { mode: "practice", length: 4 })));
    expect(r).toMatchObject({ status: 429, body: { error: "too_many_open_games" } });
  });

  it("finish rejects implausibly fast / lucky offline games but still closes them", async () => {
    const mk = async (ageSec: number) => {
      const id = (await json(await local(req(A, { mode: "practice", length: 4 })))).body.id as string;
      fake.tables.games.find((x) => x.id === id)!.started_at = new Date(Date.now() - ageSec * 1000).toISOString();
      return id;
    };
    const events = [{ p: 0, g: "1234" }];
    // 1-guess win on 4 digits: implausible
    const id1 = await mk(60);
    const r1 = await json(await finish(req(A, { secrets: ["1234"], events }), ctx(id1)));
    expect(r1.body).toMatchObject({ points: 0, rejected: "implausible" });
    expect(fake.tables.games.find((x) => x.id === id1)!.status).toBe("finished");
    expect(fake.rpcCalls).toHaveLength(0);
    // older than 6h
    const id2 = await mk(7 * 3600);
    const events3 = [{ p: 0, g: "0123" }, { p: 0, g: "0124" }, { p: 0, g: "1234" }];
    expect((await json(await finish(req(A, { secrets: ["1234"], events: events3 }), ctx(id2)))).body.rejected).toBe("too_old");
    // 3 guesses need >= 10s (max(10, 9))
    const id3 = await mk(5);
    expect((await json(await finish(req(A, { secrets: ["1234"], events: events3 }), ctx(id3)))).body.rejected).toBe("too_fast");
    // plausible: scores, with length passed through
    const id4 = await mk(60);
    const ok = await json(await finish(req(A, { secrets: ["1234"], events: events3 }), ctx(id4)));
    expect(ok.status).toBe(200);
    expect(fake.rpcCalls.at(-1)?.args).toMatchObject({ p_mode: "practice", p_outcome: "win", p_points: 8 });
  });
});
