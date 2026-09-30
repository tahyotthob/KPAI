import { handle, HttpError, ok } from "@/lib/server/admin";
import { requirePlayer } from "@/lib/server/auth";
import { DISCONNECT_SECONDS, loadGame, loadMatch } from "@/lib/server/games";
import { secondsSince, settleOnline } from "@/lib/server/settle";

/** Claim the win when the opponent has been gone for 2+ minutes. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const player = await requirePlayer(req);
  const { game, slot } = await loadGame(id, player.id);
  if (game.status !== "playing" && game.status !== "setting_secrets") throw new HttpError(409, "not_claimable");

  const oppSeen = slot === 0 ? game.last_seen_p2 : game.last_seen_p1;
  const gone = secondsSince(oppSeen ?? game.created_at);
  if (gone < DISCONNECT_SECONDS) throw new HttpError(409, "opponent_still_here", { secondsLeft: Math.ceil(DISCONNECT_SECONDS - gone) });

  const m = await loadMatch(game);
  await settleOnline(game, slot, [m.moves[0].length, m.moves[1].length], "forfeit");
  return ok({ claimed: true });
});
