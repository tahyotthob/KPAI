import { getAdmin, handle, HttpError, ok, readJson } from "@/lib/server/admin";
import { requirePlayer } from "@/lib/server/auth";

/** Registers the start of an offline game (computer / practice / pass) so the server can time it. */
export const POST = handle(async (req: Request) => {
  const player = await requirePlayer(req);
  const b = await readJson<{ mode?: string; length?: number; aiLevel?: string }>(req);
  if (!["computer", "practice", "pass"].includes(String(b.mode))) throw new HttpError(400, "bad_mode");
  if (![3, 4, 5].includes(Number(b.length))) throw new HttpError(400, "bad_length");
  if (b.mode === "computer" && !["easy", "medium", "hard"].includes(String(b.aiLevel))) throw new HttpError(400, "bad_level");

  const { data, error } = await getAdmin()
    .from("games")
    .insert({
      mode: b.mode,
      digit_length: b.length,
      status: "playing",
      player1_id: player.id,
      ai_level: b.mode === "computer" ? b.aiLevel : null,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return ok({ id: data.id });
});
