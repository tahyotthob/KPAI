import { LINES, type Line, type LineCategory } from "./lines";

/**
 * Audio manager: random clip per category (never the same twice in a row), mute toggle
 * remembered in localStorage, playback only after the first user tap. Until the real
 * mp3 files exist it falls back to the browser's speechSynthesis reading the line.
 */
const MUTE_KEY = "kpai:muted";
const last = new Map<LineCategory, number>();
const fileOk = new Map<string, Promise<boolean>>();
const howls = new Map<string, import("howler").Howl>();
let unlocked = false;
let muted = false;
let initialised = false;
const listeners = new Set<() => void>();

function init() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;
  try {
    muted = localStorage.getItem(MUTE_KEY) === "1";
  } catch {}
  const unlock = () => {
    unlocked = true;
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

export function isMuted() {
  init();
  return muted;
}
export function setMuted(m: boolean) {
  init();
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {}
  if (m && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  listeners.forEach((l) => l());
}
export function subscribeMute(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export function pickLine(category: LineCategory): Line {
  const lines = LINES[category];
  let i = Math.floor(Math.random() * lines.length);
  const prev = last.get(category);
  if (lines.length > 1 && i === prev) i = (i + 1 + Math.floor(Math.random() * (lines.length - 1))) % lines.length;
  last.set(category, i);
  return lines[i];
}

function exists(url: string): Promise<boolean> {
  let p = fileOk.get(url);
  if (!p) {
    p = fetch(url, { method: "HEAD" })
      .then((r) => r.ok && (r.headers.get("content-type") ?? "").includes("audio"))
      .catch(() => false);
    fileOk.set(url, p);
  }
  return p;
}

function speak(text: string) {
  if (typeof speechSynthesis === "undefined") return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-NG";
    u.rate = 1.05;
    u.pitch = 1.1;
    speechSynthesis.speak(u);
  } catch {}
}

/** Picks a line, plays it (if allowed) and returns it so the UI can always show the text. */
export function say(category: LineCategory): Line {
  init();
  const line = pickLine(category);
  if (muted || !unlocked || typeof window === "undefined") return line;
  void exists(line.file).then(async (ok) => {
    if (muted) return;
    if (!ok) return speak(line.text);
    const { Howl } = await import("howler");
    let h = howls.get(line.file);
    if (!h) {
      h = new Howl({ src: [line.file], html5: false, onloaderror: () => speak(line.text) });
      howls.set(line.file, h);
    }
    h.play();
  });
  return line;
}
