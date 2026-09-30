import { codeProblem } from "@/lib/game";
import { getAdmin, handle, HttpError, ok, readJson } from "@/lib/server/admin";
import { requirePlayer } from "@/lib/server/auth";
import { loadGame } from "@/lib/server/games";

/** Lock in your secret. It is stored server-side only and can never be changed or read back by clients. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const player = await requirePlayer(req);
  const { secret } = await readJson<{ secret?: string }>(req);
  const { game, slot } = await loadGame(id, player.id);
  if (game.status !== "setting_secrets") throw new HttpError(409, "not_setting_secrets");
  const s = String(secret ?? "");
  if (codeProblem(s, game.digit_length)) throw new HttpError(400, "bad_secret");

  const admin = getAdmin();
  const { error } = await admin.from("game_secrets").insert({ game_id: id, player_id: player.id, secret: s });
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "secret_already_locked");
    throw error;
  }

  await admin.from("games").update(slot === 0 ? { p1_ready: true } : { p2_ready: true }).eq("id", id);

  const { count } = await admin.from("game_secrets").select("player_id", { count: "exact", head: true }).eq("game_id", id);
  if (count === 2) {
    const now = new Date().toISOString();
    await admin
      .from("games")
      .update({ status: "playing", current_turn: 0, turn_started_at: now, started_at: now })
      .eq("id", id)
      .eq("status", "setting_secrets");
  }
  return ok({ locked: true, started: count === 2 });
});
