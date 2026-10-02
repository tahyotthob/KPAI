import type { AiLevel } from "@/lib/game/types";

export type TauntTrigger = "start" | "playerMiss3" | "playerClose" | "aiClose" | "aiWins" | "aiLoses";

/** State-aware trash talk. Short, clean, Pidgin. */
export const TAUNTS: Record<AiLevel, Record<TauntTrigger, string[]>> = {
  easy: {
    start: ["Oya, make I serve rice first, then we play 🍲", "Shey you don chop? Make we guess small."],
    playerMiss3: ["Ah ahn! Even me wey dey cook rice go aim better 😂", "My pikin, you dey guess or you dey sleep?"],
    playerClose: ["Chai! You dey near o! No vex!", "Ehn! Who teach you this one?"],
    aiClose: ["I think I don smell am o 👃🏾", "Something dey sweet for here… I dey close!"],
    aiWins: ["Sorry o, my pikin. Chop rice, try again 🍚", "I win?! Na God o. Come, take plantain."],
    aiLoses: ["You win? Wahala! Sit down, take free rice 🍲", "Haba! You beat Mama Put? Respect 🙌🏾"],
  },
  medium: {
    start: ["Who be this? Oya show me wetin you carry 😎", "Na we dey here. No dull yourself."],
    playerMiss3: ["Zero? You dey guess with your eyes closed abi? 😭", "Boss, na shege you dey find?"],
    playerClose: ["Ahn ahn! You wan finish me? Calm down!", "Hmm. You get small sense. I dey watch you 👀"],
    aiClose: ["I don see your number small small 👀", "Omo, I dey near your code o!"],
    aiWins: ["Next time bring better brain, my guy 😎", "Area Boy never lose. Remember that."],
    aiLoses: ["Wow! Respect. Run am back make I avenge.", "Beginner's luck… abi? Rematch!"],
  },
  hard: {
    start: ["I solve this in 5. You? Pray. 🕶️", "Mathematics don enter the chat."],
    playerMiss3: ["Zero dead? Even NEPA gives light sometimes. 💡", "You dey guess or you dey pray?"],
    playerClose: ["Impossible… you are lucky. For now.", "Hmm. Interesting. Don't get excited."],
    aiClose: ["Four digits. One move left. Tick tock ⏱️", "The numbers have spoken. I'm one step away."],
    aiWins: ["As expected. Class dismissed. 🎓", "Calculated. Come back when you have a plan."],
    aiLoses: ["…I need to recalibrate. Rematch. NOW.", "A glitch. It must be a glitch. Again!"],
  },
};

const last = new Map<string, number>();

export function pickTaunt(level: AiLevel, trigger: TauntTrigger, rng: () => number = Math.random): string {
  const lines = TAUNTS[level][trigger];
  const k = `${level}:${trigger}`;
  let i = Math.floor(rng() * lines.length);
  if (lines.length > 1 && i === last.get(k)) i = (i + 1) % lines.length;
  last.set(k, i);
  return lines[i];
}
