import { getAdmin, handle, HttpError, ok, readJson } from "@/lib/server/admin";
import { requirePlayer } from "@/lib/server/auth";
import { ROOM_CODE_RE } from "@/lib/server/games";
import type { GameRow } from "@/lib/server/settle";

/** Join a room by its code (or re-open a room you're already in). */
export const POST = handle(async (req: Request) => {
  const player = await requirePlayer(req);
  const { roomCode } = await readJson<{ roomCode?: string }>(req);
  const code = String(roomCode ?? "").trim().toUpperCase();
  if (!ROOM_CODE_RE.test(code)) throw new HttpError(400, "bad_code");

  const admin = getAdmin();
  const { data } = await admin.from("games").select("*").eq("room_code", code).maybeSingle();
  const game = data as GameRow | null;
  if (!game) throw new HttpError(404, "room_not_found");

  if (game.player1_id === player.id || game.player2_id === player.id) return ok({ id: game.id });
  if (game.status !== "waiting" || game.player2_id) throw new HttpError(409, "room_full");

  const { data: joined } = await admin
    .from("games")
    .update({ player2_id: player.id, status: "setting_secrets", last_seen_p2: new Date().toISOString() })
    .eq("id", game.id)
    .eq("status", "waiting")
    .is("player2_id", null)
    .select("id");
  if (!joined?.length) throw new HttpError(409, "room_full");
  return ok({ id: game.id });
});
