import { applyGuess, codeProblem, scoreGuess, skipTurn } from "@/lib/game";
import { getAdmin, handle, HttpError, ok, readJson } from "@/lib/server/admin";
import { requireUser } from "@/lib/server/auth";
import { buildMatch, turnExpired, type MoveRow } from "@/lib/server/games";
import { settleOnline, type GameRow } from "@/lib/server/settle";

/**
 * Score a guess. Turn order, timer and input format are all validated here; the response only
 * ever contains {dead, wounded} - the opponent's secret never leaves the server.
 *
 * Latency: everything we need is fetched in ONE parallel round trip (auth + game + moves +
 * secrets), then ONE atomic write (the apply_guess RPC).
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "not_found");
  const { guess } = await readJson<{ guess?: string }>(req);
  const admin = getAdmin();

  const [user, gameRes, movesRes, secretsRes] = await Promise.all([
    requireUser(req),
    admin.from("games").select("*").eq("id", id).maybeSingle(),
    admin.from("moves").select("player_id, guess, dead, wounded, move_number").eq("game_id", id).order("move_number"),
    admin.from("game_secrets").select("player_id, secret").eq("game_id", id),
  ]);
  const game = gameRes.data as GameRow | null;
  if (!game || game.mode !== "online") throw new HttpError(404, "not_found");
  const slot: 0 | 1 | null = game.player1_id === user.id ? 0 : game.player2_id === user.id ? 1 : null;
  if (slot === null) throw new HttpError(404, "not_found"); // membership implies a profile exists

  if (game.status !== "playing") throw new HttpError(409, "not_playing");
  const g = String(guess ?? "");
  const problem = codeProblem(g, game.digit_length);
  if (problem) throw new HttpError(400, "bad_guess", { reason: problem });
  if (game.current_turn !== slot) throw new HttpError(409, "not_your_turn");

  const state = buildMatch(game, (movesRes.data ?? []) as MoveRow[]);
  if (turnExpired(game)) {
    // Too late: the turn passes to the opponent instead.
    const next = skipTurn(state);
    await applyState(game.id, slot, next.turn, next.finalTurn);
    if (next.winner !== null) await settleOnline(game, next.winner, [next.moves[0].length, next.moves[1].length], "win");
    throw new HttpError(409, "time_up");
  }

  const oppId = slot === 0 ? game.player2_id : game.player1_id;
  const secret = secretsRes.data?.find((r) => r.player_id === oppId)?.secret as string | undefined;
  if (!secret) throw new HttpError(409, "not_ready");

  const fb = scoreGuess(secret, g);
  const next = applyGuess(state, slot, g, fb);
  // One atomic RPC: locks the game row, re-checks status + turn, inserts the move and flips the turn.
  // This is what stops parallel requests from each getting an extra oracle query in the same turn.
  const { data: applied, error } = await admin.rpc("apply_guess", {
    p_game: id, p_player: user.id, p_guess: g, p_dead: fb.dead, p_wounded: fb.wounded,
    p_next_turn: next.turn, p_final: next.finalTurn,
  });
  if (error) {
    const msg = String(error.message ?? "");
    if (msg.includes("not_your_turn")) throw new HttpError(409, "not_your_turn");
    if (msg.includes("not_playing")) throw new HttpError(409, "not_playing");
    if (msg.includes("not_member") || msg.includes("not_found")) throw new HttpError(404, "not_found");
    if (error.code === "23505") throw new HttpError(409, "move_conflict");
    throw error;
  }
  const row = (Array.isArray(applied) ? applied[0] : applied) as { move_number: number; turn_started_at: string } | null;
  if (!row) throw new HttpError(409, "move_conflict");
  const moveNumber = row.move_number;
  const turnStartedAt = row.turn_started_at;

  let points: number | undefined;
  if (next.winner !== null) {
    const how = next.winner === "draw" ? "draw" : "win";
    const res = await settleOnline(game, next.winner, [next.moves[0].length, next.moves[1].length], how);
    points = res.points[slot];
  }
  return ok({
    dead: fb.dead,
    wounded: fb.wounded,
    winner: next.winner,
    points,
    moveNumber,
    // lets the client update instantly instead of waiting for the realtime echo
    game: { current_turn: next.turn, final_turn: next.finalTurn, turn_started_at: turnStartedAt, status: next.winner !== null ? "finished" : "playing" },
  });
});

/** Used only for the expired-turn path. Optimistic update: only succeeds if it is still `slot`'s turn (guards double-submits). Returns the new turn start time. */
async function applyState(gameId: string, slot: 0 | 1, turn: 0 | 1, finalTurn: boolean) {
  const at = new Date().toISOString();
  const { data } = await getAdmin()
    .from("games")
    .update({ current_turn: turn, final_turn: finalTurn, turn_started_at: at })
    .eq("id", gameId)
    .eq("status", "playing")
    .eq("current_turn", slot)
    .select("id");
  return data?.length ? at : null;
}
