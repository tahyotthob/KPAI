/**
 * Preset banter for online games. Only these ids are ever sent over the wire, and receivers
 * ignore anything not in this list - so there is no free text to moderate or abuse.
 */
export interface ChatLine {
  id: string;
  text: string;
}

export const CHAT_LINES: ChatLine[] = [
  { id: "shoot", text: "Oya shoot na! ⏰" },
  { id: "shake", text: "You dey shake? 😂" },
  { id: "chai", text: "Chai! E no easy o 😅" },
  { id: "see", text: "I don see your number 👀" },
  { id: "cheat", text: "No cheat o, I dey watch 🕵🏾" },
  { id: "lead", text: "Na you dey lead? Enjoy am 😎" },
  { id: "well", text: "Well done, my guy 👏🏾" },
  { id: "wahala", text: "Wahala dey! 😬" },
  { id: "pray", text: "Pray for your guess 🙏🏾" },
  { id: "ahn", text: "Ah ahn! Why now? 😩" },
  { id: "come", text: "I dey come for your number 🏃🏾" },
  { id: "fire", text: "You try o, fine one 🔥" },
  { id: "again", text: "Make we run am again 🔁" },
  { id: "rematch", text: "Rematch? I go flog you 💪🏾" },
];

export const CHAT_BY_ID: Record<string, ChatLine> = Object.fromEntries(CHAT_LINES.map((l) => [l.id, l]));
