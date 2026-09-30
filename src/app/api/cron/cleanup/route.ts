import { getAdmin, handle, HttpError, ok } from "@/lib/server/admin";

/** Vercel Cron (see vercel.json): removes online rooms left in "waiting" for over 24 hours. */
export const GET = handle(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) throw new HttpError(401, "unauthorized");
  const { data, error } = await getAdmin().rpc("cleanup_stale_games");
  if (error) throw error;
  return ok({ deleted: data });
});
