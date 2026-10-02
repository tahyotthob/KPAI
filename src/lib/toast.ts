export interface ToastMsg {
  id: number;
  emoji: string;
  title: string;
  body?: string;
}

const EVENT = "kpai:toast";
let seq = 0;

/** Fire-and-forget toast; rendered by <ToastHost/>. */
export function toast(title: string, emoji = "✨", body?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastMsg>(EVENT, { detail: { id: ++seq, emoji, title, body } }));
}
export const TOAST_EVENT = EVENT;

/** Short buzz where supported (Android). Safe no-op elsewhere. */
export function haptic(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}
