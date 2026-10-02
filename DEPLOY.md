# Deploying KPAI!

No DevOps experience needed. You will use three free websites: **Supabase** (database + realtime + logins), **GitHub** (stores the code) and **Vercel** (runs the website). Budget about 25 minutes.

> Everything works on the free plans. Vercel's free "Hobby" plan is enough (the daily cleanup job runs once a day, which Hobby allows).

---

## 1. Create the Supabase project

1. Go to <https://supabase.com> → **Start your project** → sign in (GitHub login is easiest).
2. Click **New project**. Pick an organisation, name it `kpai`, choose a **database password** (save it somewhere) and a region close to your players (for Nigeria, **London / eu-west-2** is closest).
3. Wait ~2 minutes until the dashboard says the project is ready.

## 2. Run the database migrations

The folder `supabase/migrations/` holds the SQL that creates all tables, security rules and scoring functions. Run the files **in order**:

1. In Supabase open **SQL Editor** (left sidebar) → **New query**.
2. Open `supabase/migrations/0001_schema.sql` from this repo, copy everything, paste it into the editor, press **Run**. You should see "Success".
3. Repeat for `0002_rls.sql`, then `0003_functions.sql`, then `0005_ready_flags.sql`, then `0006_hardening.sql` (there is no `0004` file; its change is folded into `0003`).

(Comfortable with a terminal? `npx supabase link --project-ref <ref>` then `npx supabase db push` does the same.)

Check: **Table Editor** should list `players, games, game_secrets, moves, score_events, leaderboard`, each with an "RLS enabled" badge.

## 3. Switch on anonymous sign-ins, linking and Realtime

1. **Authentication → Sign In / Providers** (may be called *Providers* / *Settings*):
   - Turn **ON** "Allow anonymous sign-ins" (players just pick a nickname, no signup).
   - Turn **ON** "Allow manual linking" (needed for the "Save my rank" button).
   - **Email** provider: keep enabled (used for magic links). Optionally turn off "Confirm email" if you want fewer steps.
   - *(Optional)* **Google**: enable and paste a Google OAuth client ID/secret ([Supabase guide](https://supabase.com/docs/guides/auth/social-login/auth-google)). Skip it and players can still save their rank by email.
2. **Database → Publications** (or **Replication**): open `supabase_realtime` and make sure the tables **games**, **moves** and **leaderboard** are switched on. Migration `0002` already does this; just confirm.
3. *(Recommended)* **Authentication → Attack Protection**: enable CAPTCHA if you see bots creating thousands of anonymous accounts.

## 4. Copy your keys

**Project Settings → API** (or **API Keys**). You need three values:

| Name | Where | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | "Project URL" | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / publishable key | no |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key | **YES - never share, never commit** |

## 5. Put the code on GitHub

If it isn't already: create an empty repo on <https://github.com/new>, then in the project folder run

```bash
git remote add origin https://github.com/<you>/kpai.git
git push -u origin main
```

## 6. Import into Vercel

1. <https://vercel.com> → sign in with GitHub → **Add New… → Project** → pick the `kpai` repo → **Import**.
2. Framework is detected as **Next.js**. Leave build settings as they are.
3. Open **Environment Variables** and add (see `.env.example`):

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from step 4 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from step 4 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from step 4 (server only - do **not** prefix with `NEXT_PUBLIC_`) |
   | `CRON_SECRET` | any long random text (e.g. 40 random characters) |
   | `NEXT_PUBLIC_SITE_URL` | optional: your final address, e.g. `https://kpai.vercel.app` (used in WhatsApp links / previews) |

4. Click **Deploy**. After ~1 minute you get a `https://….vercel.app` address.

## 7. Tell Supabase your website address

Back in Supabase → **Authentication → URL Configuration**:

- **Site URL**: your Vercel address (e.g. `https://kpai.vercel.app`).
- **Redirect URLs**: add `https://kpai.vercel.app/**` (and `http://localhost:3000/**` if you develop locally).

This makes the "Save my rank" magic links and Google sign-in come back to your site.

## 8. Test it (5 minutes)

- [ ] Home loads; type a nickname and press **Save** ("Nickname saved ✅").
- [ ] **Practice** and **Play Computer** work; at the end you see "+N KPAI Points" (play at least 10 seconds).
- [ ] **Leaderboard** shows you. Play another game with the page open: the board updates live.
- [ ] **Play Friend → Create room**: you get a 6-character code. Open the link on a second phone/incognito window, pick another nickname, and play a game.
- [ ] **Share on WhatsApp** opens WhatsApp with the invite; the link preview shows the KPAI! card.
- [ ] Phone browser menu → **Add to Home Screen** installs KPAI!.

## Optional: turn on the real voices

After you add the recorded MP3s (see `public/audio/README.md`), set `NEXT_PUBLIC_HAS_AUDIO=1` in Vercel and redeploy. Without it the game uses speech bubbles + the browser voice.

## Daily cleanup

`vercel.json` schedules `/api/cron/cleanup` once a day; it deletes online rooms that sat in "waiting" for over 24 hours. Vercel sends the `CRON_SECRET` automatically. Nothing else to do.

## Recording the real voices

See `public/audio/README.md` for the exact filenames and lines. Drop the MP3s in, commit, push - Vercel redeploys. Until then the game shows the line in a speech bubble and reads it with the browser voice.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Backend not connected" under the nickname box | The two `NEXT_PUBLIC_…` variables are missing in Vercel. Add them and **Redeploy**. |
| Nickname can't be saved / "server_error" | `SUPABASE_SERVICE_ROLE_KEY` missing or wrong, or migrations not run. Check Vercel → Deployment → **Runtime Logs**. |
| Nothing happens on first load / 422 from `/auth/v1/signup` | Anonymous sign-ins are off (step 3). |
| Online game doesn't update live | `games`/`moves` not in the `supabase_realtime` publication (step 3.2). The game still refreshes every 6 seconds as a fallback. |
| "Save my rank" says manual linking disabled | Turn on "Allow manual linking" (step 3.1). |
| Changed an env var but nothing changed | Vercel only applies env changes on a **new deployment** - press Redeploy. |

## How players' secrets stay secret

Secrets live in the `game_secrets` table, which has Row Level Security enabled with **no** policies and no grants for the browser roles, so only the server (service-role key, used inside Next.js route handlers) can read it. Guesses are scored on the server and only `{dead, wounded}` is returned. Leaderboard points are written only by a server-only SQL function. Run **Supabase → Advisors → Security** after deploying; the remaining notes about `leaderboard_board` being callable by everyone are intentional (it is the public leaderboard query).
