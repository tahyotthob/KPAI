"use client";
import { useEffect, useRef, useState } from "react";

/** Counts down `seconds` while `active`; restarts whenever `resetKey` changes. */
export function useCountdown(seconds: number, active: boolean, resetKey: unknown, onExpire: () => void) {
  const [left, setLeft] = useState(seconds);
  const cb = useRef(onExpire);
  cb.current = onExpire;

  useEffect(() => {
    setLeft(seconds);
    if (!active || seconds <= 0) return;
    const end = Date.now() + seconds * 1000;
    const t = setInterval(() => {
      const l = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(l);
      if (l <= 0) {
        clearInterval(t);
        cb.current();
      }
    }, 250);
    return () => clearInterval(t);
  }, [seconds, active, resetKey]);

  return left;
}
