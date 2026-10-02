<div align="center">

# 💀 KPAI! 🩸
### Dead or Wounded — naija style

**The Nigerian take on the classic *Bulls and Cows* code-breaking game.**
Pick a secret number, crack your opponent's before they crack yours, and climb one universal leaderboard.

Next.js · TypeScript · Tailwind · Supabase · Framer Motion · Howler.js · Vercel

</div>

---

## What is KPAI!?

Every player secretly picks a code of **4 unique digits** (0–9, no repeats, a leading `0` is fine — e.g. `0381`). You take turns guessing each other's code. After every guess you get two clues:

| Clue | Meaning |
|---|---|
| 💀 **Dead** | right digit, **right** position |
| 🩸 **Wounded** | right digit, **wrong** position |

> Secret `6247`, guess `1234` → **1 Dead, 1 Wounded** (the `2` is dead, the `4` is wounded).

Get **4 Dead** and you shout **KPAI!** — you cracked the code and win.

**Fairness rule:** if the first player cracks the code, the second player gets **one final turn** in that round. If they crack it too, it's a **draw**.

You can also play with **3 or 5 digits** and an optional **30s / 60s turn timer**.

## Game modes

| Mode | What it is |
|---|---|
| 🤖 **Vs Computer** | Set a secret; the computer sets one; you alternate guesses. Three opponents with personality (below). Runs fully offline. |
| 🌍 **Play Friend (online)** | Create a room → get a **6-character code** + shareable link + **Share on WhatsApp**. Your friend joins; both lock secrets and play in real time. Reconnect-safe, with a 2-minute disconnect rule. |
| 🤝 **Pass-and-Play** | Two players, one phone. A *"Hand phone to Player 2"* screen hides the board between turns so secrets are never exposed. |
| 🎯 **Practice** | Solo: crack the computer's number in as few guesses as you can. |

### The computer opponents

| Level | Name | Behaviour |
|---|---|---|
| Easy | 🍲 **Mama Put** | Guesses mostly at random; only occasionally (25%) listens to feedback. Beatable by anyone. |
| Medium | 😎 **Area Boy** | Keeps every code still consistent with all feedback and picks one at random. ~6–7 guesses on average. |
| Hard | 🕶️ **Oga Kpai** | Consistent-candidate list + **minimax** (Knuth-style): picks the guess that minimises the worst-case remaining candidates. About 5 guesses; never more than 7 for 4 digits. |

The solver runs in a **Web Worker** so the UI never freezes, with a 600–1200 ms "thinking…" delay and animated avatar.

## Features

- 🔢 Big-thumb **number pad** (used digits are greyed out so repeats are impossible) plus **keyboard support** on desktop
- 📝 **Digit note pad**: tap each 0–9 chip to cycle *unknown → ruled out → confirmed*, saved per game
- 📜 **History panel** with 💀/🩸 icons and text like "2 Dead 1 Wounded", newest on top
- 🎉 Pop-in feedback, **shake + red flash** on 0-0, a slamming **KPAI!** stamp and confetti on a win
- 🗣️ **Sarcastic Pidgin voice lines** ("You no get am!", "Chai, e remain small!"…) — always shown as a speech bubble, with mute toggle. Drop your own recordings in `public/audio/` (see its README); until then the browser's speech synthesis reads them
- 🏆 **One universal leaderboard** across every mode — *All-time / This week / Today*, live via Supabase Realtime, your own row pinned at the bottom, Top 5 on the home screen
- 🏅 Titles by all-time points: **Learner → Street Sharp → Area Champion → Oga → Kpai Master**
- 💾 Anonymous by default (just a nickname); **"Save my rank"** links Google / email so points follow you to a new phone
- 📅 **Daily Kpai** — one shared code per Lagos day (no backend needed), Wordle-style emoji grid you can brag with on WhatsApp, plus a daily streak
- 🔥 **Win streaks, 🏅 12 collectible badges, 😎 avatars** — all stored on the device; toasts + haptics when you unlock things
- 🗣️ **AI trash talk** — Mama Put, Area Boy and Oga Kpai react to *your* play (three misses in a row, a near-crack, winning, losing…)
- 💬 **Preset banter chat** online (14 funny Pidgin lines, no free text → nothing to moderate) and a "what did they just play?" move notification
- 🎨 **Gen-Z "Danfo Neon Sticker-Bomb" look** — danfo yellow, acid lime, hot pink, grain, sticker buttons, bento home, marquee tape
- 📲 **PWA** (Add to Home Screen), WhatsApp-friendly **Open Graph** preview, light bundle for Android on mobile data

## KPAI Points

Awarded **only on the server** when a game finishes.

| Result | Points |
|---|---|
| Beat a human (online) | +30 |
| Beat a human (pass-and-play) | +10 |
| Beat Oga Kpai / Area Boy / Mama Put | +25 / +12 / +4 |
| Draw | +5 |
| Lose to anyone | +1 |
| Practice solve | +8 (≤5 guesses) · +4 (6–7) · +1 |
| ⚡ Speed bonus on any win | +5 if cracked in ≤5 guesses |

**Anti-farming** (days roll over at midnight Lagos time): the first 5 wins per day against the same human; per-day caps on every mode (practice 10, Easy 10, Medium/Hard 15, pass-and-play 8, 12 games per online opponent); offline modes together can earn at most 120 points a day and online counts at most 40 games a day. Games must last at least `max(10 s, 3 s × your guesses)`, online games need 2+ moves per player, and implausibly fast offline wins are rejected. Digit length scales win points (3 digits ×0.6, 5 digits ×1.4) and the speed-bonus threshold (≤4 / ≤5 / ≤7 guesses).

## Security model

- **Secrets never reach the opponent's browser.** Online secrets live in `game_secrets` (RLS on, no policy, no grants for `anon`/`authenticated`). Guesses are scored inside Next.js Route Handlers with the service-role key, which return only `{dead, wounded}`.
- **Server validates everything:** turn order, input format (`N` unique digits), the turn timer, room membership, one-time secret locking.
- **RLS on every table.** Clients can only *read* their own games/moves; all writes go through the server. The leaderboard is written only by a server-only SQL function (`record_score`).
- **Offline modes** (Computer / Practice / Pass) are played on the client, so the server can't watch them live. Instead the client submits the full game transcript and the server **replays it with the same rules code**, derives the winner itself, checks the server-measured duration, and scores each game once. Caps and the 10-second rule limit abuse; a determined cheater could still fabricate a plausible transcript for the low-value offline modes, which is why online wins are worth the most.
- Nicknames are unique (case-insensitive) and pass a profanity filter that includes common Pidgin/Nigerian vulgarities.

## Project structure

```
src/
  app/                  Next.js App Router pages + /api route handlers
    api/games/…         create / join / secret / guess / skip / claim / rematch / reveal
    api/profile         nickname (unique + profanity filtered)
    api/cron/cleanup    daily stale-room cleanup (Vercel Cron)
  components/           NumPad (CodeInput), DigitTracker, HistoryPanel, OnlineGame, PassGame, LocalGame…
  hooks/                usePlayer, useOnlineGame, useLeaderboard, useSpeech…
  lib/
    game/               PURE rules, solvers, match state machine, points, titles (+ Vitest tests)
    ai/                 Web Worker wrapper for the solvers
    audio/              Howler-based audio manager + voice-line catalogue
    server/             service-role client, auth, settle/scoring helpers
supabase/migrations/    SQL: schema, RLS policies, scoring + leaderboard functions
public/audio/           where the voice-line MP3s go (README lists filenames + lines)
```

## Run it locally

```bash
npm install
cp .env.example .env.local     # fill in your Supabase values (optional: offline modes work without them)
npm run dev                    # http://localhost:3000
npm test                       # Vitest: rules, solvers, match, routes, profanity
npm run build                  # production build
```

Without Supabase variables the app still runs: Practice, Vs Computer and Pass-and-Play work fully offline; online play, ranking and the leaderboard are disabled with a friendly message.

## Deploy

Step-by-step for non-developers: **[DEPLOY.md](DEPLOY.md)** (Supabase → GitHub → Vercel).

## License

Personal / community project. Have fun — and **KPAI!** 💀🩸
