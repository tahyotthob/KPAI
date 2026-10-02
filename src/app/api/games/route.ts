import { getAdmin, handle, HttpError, ok, readJson } from "@/lib/server/admin";
import { requirePlayer } from "@/lib/server/auth";
import { makeRoomCode } from "@/lib/server/games";

/** Create an online room. Returns the 6-character room code. */
export const POST = handle(async (req: Request) => {
  const player = await requirePlayer(req);
  const b = await readJson<{ length?: number; timer?: number }>(req);
  const length = Number(b.length ?? 4);
  const timer = Number(b.timer ?? 0);
  if (![3, 4, 5].includes(length)) throw new HttpError(400, "bad_length");
  if (![0, 30, 60].includes(timer)) throw new HttpError(400, "bad_timer");

  const admin = getAdmin();
  const { count: open } = await admin
    .from("games")
    .select("id", { count: "exact", head: true })
    .eq("mode", "online")
    .eq("player1_id", player.id)
    .in("status", ["waiting", "setting_secrets"]);
  if ((open ?? 0) >= 3) throw new HttpError(429, "too_many_rooms");

  for (let i = 0; i < 5; i++) {
    const room_code = makeRoomCode();
    const { data, error } = await admin
      .from("games")
      .insert({ mode: "online", room_code, digit_length: length, turn_seconds: timer, status: "waiting", player1_id: player.id })
      .select("id, room_code")
      .single();
    if (!error) return ok({ id: data.id, roomCode: data.room_code });
    if (error.code !== "23505") throw error; // retry only on room-code collisions
  }
  throw new HttpError(503, "no_room_code");
});
