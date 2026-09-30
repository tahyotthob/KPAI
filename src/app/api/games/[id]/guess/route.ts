import { applyGuess, codeProblem, scoreGuess, skipTurn } from "@/lib/game";
import { getAdmin, handle, HttpError, ok, readJson } from "@/lib/server/admin";
import { requirePlayer } from "@/lib/server/auth";
import { loadGame, loadMatch, totalMoves, turnExpired } from "@/lib/server/games";
import { settleOnline } from "@/lib/server/settle";

/**
 * Score a guess. Turn order, timer and input format are all validated here; the response only
 * ever contains {dead, wounded} - the opponent's secret never leaves the server.
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const player = await requirePlayer(req);
  const { guess } = await readJson<{ guess?: string }>(req);
  const { game, slot } = await loadGame(id, player.id);
  const admin = getAdmin();

  if (game.status !== "playing") throw new HttpError(409, "not_playing");
  const g = String(guess ?? "");
  const problem = codeProblem(g, game.digit_length);
  if (problem) throw new HttpError(400, "bad_guess", { reason: problem });
  if (game.current_turn !== slot) throw new HttpError(409, "not_your_turn");

  const state = await loadMatch(game);
  if (turnExpired(game)) {
    // Too late: the turn passes to the opponent instead.
    const next = skipTurn(state);
    await applyState(game.id, slot, next.turn, next.finalTurn);
    if (next.winner !== null) await settleOnline(game, next.winner, [next.moves[0].length, next.moves[1].length], "win");
    throw new HttpError(409, "time_up");
  }

  const oppId = slot === 0 ? game.player2_id : game.player1_id;
  const { data: sec } = await admin.from("game_secrets").select("secret").eq("game_id", id).eq("player_id", oppId!).single();
  if (!sec) throw new HttpError(409, "not_ready");

  const fb = scoreGuess(sec.secret, g);
  const next = applyGuess(state, slot, g, fb);

  const { error } = await admin.from("moves").insert({
    game_id: id, player_id: player.id, guess: g, dead: fb.dead, wounded: fb.wounded, move_number: totalMoves(state) + 1,
  });
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "move_conflict");
    throw error;
  }
  const flipped = await applyState(game.id, slot, next.turn, next.finalTurn);
  if (!flipped) {
    await admin.from("moves").delete().eq("game_id", id).eq("move_number", totalMoves(state) + 1);
    throw new HttpError(409, "move_conflict");
  }

  let points: number | undefined;
  if (next.winner !== null) {
    const how = next.winner === "draw" ? "draw" : "win";
    const res = await settleOnline(game, next.winner, [next.moves[0].length, next.moves[1].length], how);
    points = res.points[slot];
  }
  return ok({ dead: fb.dead, wounded: fb.wounded, winner: next.winner, points });
});

/** Optimistic update: only succeeds if it is still `slot`'s turn (guards double-submits). */
async function applyState(gameId: string, slot: 0 | 1, turn: 0 | 1, finalTurn: boolean) {
  const { data } = await getAdmin()
    .from("games")
    .update({ current_turn: turn, final_turn: finalTurn, turn_started_at: new Date().toISOString() })
    .eq("id", gameId)
    .eq("status", "playing")
    .eq("current_turn", slot)
    .select("id");
  return Boolean(data?.length);
}
