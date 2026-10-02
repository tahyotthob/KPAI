# KPAI! voice lines to record

Record each line in your own voice (Nigerian Pidgin, with attitude - sarcastic is the point).
Save as **mono, 64 kbps MP3, under ~40 KB each** (about 2-3 seconds), using exactly the
filenames below, inside the matching folder.

Until a file exists the game shows the line in a speech bubble and reads it with the
browser's built-in voice, so nothing breaks while you record. Text always shows on screen.

Tip (ffmpeg): `ffmpeg -i raw.wav -ac 1 -b:a 64k -ar 24000 01-you-no-get-am.mp3`

## `zero/` - 0 Dead, 0 Wounded

| File | Line to record |
|---|---|
| `public/audio/zero/01-you-no-get-am.mp3` | "You no get am!" |
| `public/audio/zero/02-na-so-you-wan-take-win.mp3` | "Na so you wan take win?" |
| `public/audio/zero/03-oya-try-again-my-guy.mp3` | "Oya try again, my guy" |
| `public/audio/zero/04-your-guess-don-japa.mp3` | "Your guess don japa" |
| `public/audio/zero/05-even-my-grandma.mp3` | "Even my grandma go do pass this" |
| `public/audio/zero/06-e-no-reach-o.mp3` | "E no reach o!" |

## `wounded/` - Some Wounded, 0 Dead

| File | Line to record |
|---|---|
| `public/audio/wounded/01-e-don-touch-small.mp3` | "E don touch small" |
| `public/audio/wounded/02-you-dey-near.mp3` | "You dey near, but you never reach" |

## `close/` - One digit from cracking (3 Dead on a 4-digit code)

| File | Line to record |
|---|---|
| `public/audio/close/01-chai-e-remain-small.mp3` | "Chai, e remain small!" |
| `public/audio/close/02-heart-dey-beat-o.mp3` | "Heart dey beat o!" |

## `win/` - Win (4 Dead)

| File | Line to record |
|---|---|
| `public/audio/win/01-kpai.mp3` | "KPAI!!!" |
| `public/audio/win/02-you-don-finish-am.mp3` | "You don finish am!" |
| `public/audio/win/03-baba-you-too-much.mp3` | "Baba, you too much!" |

## `lose/` - Lose

| File | Line to record |
|---|---|
| `public/audio/lose/01-dem-don-kpai-you.mp3` | "Dem don kpai you" |
| `public/audio/lose/02-better-luck-next-time.mp3` | "Better luck next time, bros" |

## `invalid/` - Invalid guess (repeated digit)

| File | Line to record |
|---|---|
| `public/audio/invalid/01-wetin-be-this.mp3` | "Wetin be this? No repeat number!" |

## `hurry/` - Timer almost out

| File | Line to record |
|---|---|
| `public/audio/hurry/01-hurry-up.mp3` | "Hurry up, time dey go!" |

Each category picks a random clip and never plays the same clip twice in a row (add more files by adding a line to `src/lib/audio/lines.ts` and re-running the docs check `npm test`).

## Switching the real voices on

The game only looks for these files when the environment variable **`NEXT_PUBLIC_HAS_AUDIO=1`** is set (Vercel → Settings → Environment Variables, then redeploy). Until then it skips the lookup entirely and uses the speech bubble + browser voice, so players don't get 404 noise.
