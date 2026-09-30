export type LineCategory = "zero" | "wounded" | "close" | "win" | "lose" | "invalid" | "hurry";

export interface Line {
  file: string; // path under /public/audio
  text: string;
}

const L = (category: LineCategory, slug: string, text: string): Line => ({ file: `/audio/${category}/${slug}.mp3`, text });

/** Single source of truth: the game, the audio manager and public/audio/README.md all follow this list. */
export const LINES: Record<LineCategory, Line[]> = {
  zero: [
    L("zero", "01-you-no-get-am", "You no get am!"),
    L("zero", "02-na-so-you-wan-take-win", "Na so you wan take win?"),
    L("zero", "03-oya-try-again-my-guy", "Oya try again, my guy"),
    L("zero", "04-your-guess-don-japa", "Your guess don japa"),
    L("zero", "05-even-my-grandma", "Even my grandma go do pass this"),
    L("zero", "06-e-no-reach-o", "E no reach o!"),
  ],
  wounded: [
    L("wounded", "01-e-don-touch-small", "E don touch small"),
    L("wounded", "02-you-dey-near", "You dey near, but you never reach"),
  ],
  close: [
    L("close", "01-chai-e-remain-small", "Chai, e remain small!"),
    L("close", "02-heart-dey-beat-o", "Heart dey beat o!"),
  ],
  win: [
    L("win", "01-kpai", "KPAI!!!"),
    L("win", "02-you-don-finish-am", "You don finish am!"),
    L("win", "03-baba-you-too-much", "Baba, you too much!"),
  ],
  lose: [
    L("lose", "01-dem-don-kpai-you", "Dem don kpai you"),
    L("lose", "02-better-luck-next-time", "Better luck next time, bros"),
  ],
  invalid: [L("invalid", "01-wetin-be-this", "Wetin be this? No repeat number!")],
  hurry: [L("hurry", "01-hurry-up", "Hurry up, time dey go!")],
};

export const CATEGORY_LABEL: Record<LineCategory, string> = {
  zero: "0 Dead, 0 Wounded",
  wounded: "Some Wounded, 0 Dead",
  close: "One away from cracking (3 Dead on a 4-digit code)",
  win: "Win (KPAI!)",
  lose: "Lose",
  invalid: "Invalid guess (repeated digit)",
  hurry: "Timer almost out",
};
