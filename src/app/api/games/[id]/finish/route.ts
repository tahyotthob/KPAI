import { MIN_GAME_SECONDS, replayTranscript, type Transcript } from "@/lib/game";
import { getAdmin, handle, HttpError, ok, readJson } from "@/lib/server/admin";
import { requirePlayer } from "@/lib/server/auth";
import { awardPoints, secondsSince, type GameRow } from "@/lib/server/settle";

/**
 * Finishes an offline game. The client sends the whole transcript; the server replays it with
 * the same rules code to derive the winner itself, then awards points (once per game).
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const player = await requirePlayer(req);
  const b = await readJson<{ secrets: string[]; events: Transcript["events"] }>(req);
  const admin = getAdmin();

  const { data } = await admin.from("games").select("*").eq("id", id).maybeSingle();
  const game = data as GameRow | null;
  if (!game || game.player1_id !== player.id || game.mode === "online") throw new HttpError(404, "not_found");
  if (game.status === "finished") throw new HttpError(409, "already_finished");

  const replay = replayTranscript({
    mode: game.mode as Transcript["mode"],
    length: game.digit_length,
    secrets: b.secrets,
    events: b.events,
  });
  if (!replay.ok) throw new HttpError(400, "bad_transcript", { detail: replay.error });

  const tooFast = secondsSince(game.started_at) < MIN_GAME_SECONDS;
  const winner = replay.winner;
  const outcome = game.mode === "practice" ? "win" : winner === "draw" ? "draw" : winner === 0 ? "win" : "lose";

  const { data: flipped } = await admin
    .from("games")
    .update({
      status: "finished",
      finished_at: new Date().toISOString(),
      winner_id: outcome === "win" ? player.id : null,
      result: outcome === "draw" ? "draw" : "win",
    })
    .eq("id", id)
    .neq("status", "finished")
    .select("id");
  if (!flipped?.length) throw new HttpError(409, "already_finished");

  if (tooFast) return ok({ points: 0, rejected: "too_fast", minSeconds: MIN_GAME_SECONDS });

  const points = await awardPoints({
    playerId: player.id,
    gameId: id,
    mode: game.mode,
    outcome,
    guesses: replay.guesses[0],
    opponentId: null,
    aiLevel: game.ai_level,
  });
  return ok({ points, outcome });
});
