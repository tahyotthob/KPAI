import { getAdmin, handle, HttpError, ok } from "@/lib/server/admin";
import { requirePlayer } from "@/lib/server/auth";
import { loadGame, makeRoomCode } from "@/lib/server/games";

/** Start a rematch: one new game for the same two players (players swap who goes first). */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const player = await requirePlayer(req);
  const { game } = await loadGame(id, player.id);
  if (game.status !== "finished" || !game.player2_id) throw new HttpError(409, "not_finished");
  if (game.rematch_game_id) return ok({ id: game.rematch_game_id });

  const admin = getAdmin();
  for (let i = 0; i < 5; i++) {
    const { data, error } = await admin
      .from("games")
      .insert({
        mode: "online", room_code: makeRoomCode(), digit_length: game.digit_length, turn_seconds: game.turn_seconds,
        status: "setting_secrets", player1_id: game.player2_id, player2_id: game.player1_id,
        last_seen_p2: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") continue;
      throw error;
    }
    // only the first click wins; the other player is pointed at the same game
    const { data: set } = await admin.from("games").update({ rematch_game_id: data.id }).eq("id", id).is("rematch_game_id", null).select("id");
    if (!set?.length) {
      await admin.from("games").delete().eq("id", data.id);
      const { data: cur } = await admin.from("games").select("rematch_game_id").eq("id", id).single();
      return ok({ id: cur?.rematch_game_id });
    }
    return ok({ id: data.id });
  }
  throw new HttpError(503, "no_room_code");
});
