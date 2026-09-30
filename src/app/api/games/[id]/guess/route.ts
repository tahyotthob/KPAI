import { applyGuess, codeProblem, scoreGuess, skipTurn } from "@/lib/game";
import { getAdmin, handle, HttpError, ok, readJson } from "@/lib/server/admin";
import { requireUser } from "@/lib/server/auth";
import { buildMatch, totalMoves, turnExpired, type MoveRow } from "@/lib/server/games";
import { settleOnline, type GameRow } from "@/lib/server/settle";

/**
 * Score a guess. Turn order, timer and input format are all validated here; the response only
 * ever contains {dead, wounded} - the opponent's secret never leaves the server.
 *
 * Latency: everything we need is fetched in ONE parallel round trip (auth + game + moves +
 * secrets), then we do just two writes (insert move, update game).
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
  const moveNumber = totalMoves(state) + 1;

  const { error } = await admin.from("moves").insert({
    game_id: id, player_id: user.id, guess: g, dead: fb.dead, wounded: fb.wounded, move_number: moveNumber,
  });
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "move_conflict");
    throw error;
  }
  const turnStartedAt = await applyState(game.id, slot, next.turn, next.finalTurn);
  if (!turnStartedAt) {
    await admin.from("moves").delete().eq("game_id", id).eq("move_number", moveNumber);
    throw new HttpError(409, "move_conflict");
  }

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

/** Optimistic update: only succeeds if it is still `slot`'s turn (guards double-submits). Returns the new turn start time. */
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
