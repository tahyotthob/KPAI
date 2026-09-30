import { nicknameProblem } from "@/lib/profanity";
import { getAdmin, handle, HttpError, ok, readJson } from "@/lib/server/admin";
import { requireUser } from "@/lib/server/auth";

/** GET: my profile.  POST {nickname}: create or rename (unique, profanity-filtered). */
export const GET = handle(async (req: Request) => {
  const user = await requireUser(req);
  const { data } = await getAdmin().from("players").select("id, nickname, is_anonymous").eq("id", user.id).maybeSingle();
  return ok({ profile: data });
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser(req);
  const { nickname } = await readJson<{ nickname?: string }>(req);
  const nick = String(nickname ?? "").trim();
  const problem = nicknameProblem(nick);
  if (problem) throw new HttpError(400, problem === "format" ? "nickname_format" : "nickname_profane");

  const admin = getAdmin();
  const { data: existing } = await admin.from("players").select("id").eq("id", user.id).maybeSingle();
  const row = { nickname: nick, is_anonymous: user.isAnonymous, last_seen: new Date().toISOString() };
  const res = existing
    ? await admin.from("players").update(row).eq("id", user.id)
    : await admin.from("players").insert({ id: user.id, ...row });
  if (res.error) {
    if (res.error.code === "23505") throw new HttpError(409, "nickname_taken");
    throw res.error;
  }
  // keep the denormalised leaderboard name in sync
  await admin.from("leaderboard").update({ nickname: nick }).eq("player_id", user.id);
  return ok({ id: user.id, nickname: nick });
});
