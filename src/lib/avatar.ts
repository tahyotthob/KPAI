export const AVATARS = ["😎", "🦁", "🐆", "🐸", "👑", "🧙🏾", "🥷🏾", "👽", "🤠", "🦊", "🐙", "🔥"];
const KEY = "kpai:avatar";
export function loadAvatar(): string {
  try {
    const v = localStorage.getItem(KEY);
    if (v && AVATARS.includes(v)) return v;
  } catch {}
  return AVATARS[0];
}
export function saveAvatar(a: string) {
  try {
    localStorage.setItem(KEY, a);
  } catch {}
}
