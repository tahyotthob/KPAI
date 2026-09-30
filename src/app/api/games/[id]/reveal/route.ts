import { getAdmin, handle, HttpError, ok } from "@/lib/server/admin";
import { requirePlayer } from "@/lib/server/auth";
import { loadGame } from "@/lib/server/games";

/** Both secrets - only after the game has finished. */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const player = await requirePlayer(req);
  const { game } = await loadGame(id, player.id);
  if (game.status !== "finished") throw new HttpError(403, "game_not_finished");
  const { data } = await getAdmin().from("game_secrets").select("player_id, secret").eq("game_id", id);
  const by = Object.fromEntries((data ?? []).map((r) => [r.player_id, r.secret]));
  return ok({ secrets: [by[game.player1_id] ?? null, game.player2_id ? (by[game.player2_id] ?? null) : null] });
});
