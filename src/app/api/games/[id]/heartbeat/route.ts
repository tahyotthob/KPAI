import { getAdmin, handle, ok } from "@/lib/server/admin";
import { requirePlayer } from "@/lib/server/auth";
import { loadGame } from "@/lib/server/games";

/** Presence ping (every ~30s) used for the 2-minute disconnect rule. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const player = await requirePlayer(req);
  const { slot } = await loadGame(id, player.id);
  await getAdmin()
    .from("games")
    .update(slot === 0 ? { last_seen_p1: new Date().toISOString() } : { last_seen_p2: new Date().toISOString() })
    .eq("id", id);
  return ok({ ok: true });
});
