"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { say } from "@/lib/audio/manager";
import type { LineCategory } from "@/lib/audio/lines";

/** Plays a random line for a category and exposes its text for the speech bubble. */
export function useSpeech() {
  const [line, setLine] = useState<{ text: string; n: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const n = useRef(0);

  const speak = useCallback((cat: LineCategory) => {
    const l = say(cat);
    setLine({ text: l.text, n: ++n.current });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLine(null), 3200);
  }, []);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  return { line, speak };
}
