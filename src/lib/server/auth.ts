import { getAdmin, HttpError } from "./admin";

export interface AuthedUser {
  id: string;
  isAnonymous: boolean;
}

/** Verifies the Supabase JWT from the Authorization header. */
export async function requireUser(req: Request): Promise<AuthedUser> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "unauthorized");
  const { data, error } = await getAdmin().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "unauthorized");
  return { id: data.user.id, isAnonymous: Boolean(data.user.is_anonymous) };
}

/** Like requireUser, but also insists the player has picked a nickname. */
export async function requirePlayer(req: Request) {
  const user = await requireUser(req);
  const { data } = await getAdmin().from("players").select("id, nickname").eq("id", user.id).maybeSingle();
  if (!data) throw new HttpError(428, "need_profile");
  return { ...user, nickname: data.nickname as string };
}
