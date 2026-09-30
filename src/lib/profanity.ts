/** Simple nickname profanity filter, including common Pidgin / Nigerian vulgarities. */

// Long / unambiguous: blocked anywhere inside the (normalised) nickname.
const CONTAINS = [
  "fuck", "shit", "bitch", "cunt", "nigga", "nigger", "whore", "slut", "bastard", "asshole", "dickhead",
  "pussy", "cocksucker", "motherfucker", "faggot", "pornhub", "hitler", "nazi",
  // Pidgin / Yoruba / Igbo / Hausa
  "ashawo", "ashewo", "olosho", "oloshi", "akwuna", "agbaya", "yansh", "kwarto", "sharrap", "oloribu",
  "ahuofe", "omoale",
];

// Short words: only blocked when they ARE the whole nickname or a whole "word" (split on _ / digits).
const EXACT = ["ass", "dick", "cock", "sex", "rape", "fck", "wtf", "stfu", "mumu", "ode", "ndi", "fool", "idiot"];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

function normalise(s: string) {
  return s.toLowerCase().replace(/[013457@$!]/g, (c) => LEET[c]).replace(/[^a-z]/g, "");
}

export function isProfane(nickname: string): boolean {
  const flat = normalise(nickname);
  if (CONTAINS.some((w) => flat.includes(w))) return true;
  const words = nickname.toLowerCase().split(/[_\d]+/).filter(Boolean).map(normalise);
  return [flat, ...words].some((w) => EXACT.includes(w));
}

export const NICKNAME_RE = /^[A-Za-z0-9_]{3,16}$/;

export function nicknameProblem(nickname: string): "format" | "profanity" | null {
  if (!NICKNAME_RE.test(nickname)) return "format";
  return isProfane(nickname) ? "profanity" : null;
}
