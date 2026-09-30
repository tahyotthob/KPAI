import { skipTurn } from "@/lib/game";
import { getAdmin, handle, HttpError, ok } from "@/lib/server/admin";
import { requirePlayer } from "@/lib/server/auth";
import { loadGame, loadMatch, turnExpired } from "@/lib/server/games";
import { settleOnline } from "@/lib/server/settle";

/** Called by either client when the turn timer hits zero. The server re-checks the clock itself. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const player = await requirePlayer(req);
  const { game } = await loadGame(id, player.id);
  if (game.status !== "playing") throw new HttpError(409, "not_playing");
  if (!turnExpired(game)) throw new HttpError(409, "not_expired");

  const state = await loadMatch(game);
  const next = skipTurn(state);
  const { data } = await getAdmin()
    .from("games")
    .update({ current_turn: next.turn, final_turn: next.finalTurn, turn_started_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "playing")
    .eq("current_turn", game.current_turn)
    .select("id");
  if (!data?.length) return ok({ skipped: false });
  if (next.winner !== null) await settleOnline(game, next.winner, [next.moves[0].length, next.moves[1].length], "win");
  return ok({ skipped: true, winner: next.winner });
});
