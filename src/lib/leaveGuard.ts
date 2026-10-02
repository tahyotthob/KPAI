"use client";
import { useEffect, useSyncExternalStore } from "react";

let active = false;
const subs = new Set<() => void>();

function beforeUnload(e: BeforeUnloadEvent) {
  e.preventDefault();
  e.returnValue = "";
}

export function setLeaveGuard(v: boolean) {
  if (active === v) return;
  active = v;
  if (typeof window !== "undefined") {
    if (v) window.addEventListener("beforeunload", beforeUnload);
    else window.removeEventListener("beforeunload", beforeUnload);
  }
  subs.forEach((f) => f());
}

/** True while a game is in progress (Home link asks before leaving). */
export function useLeaveGuard() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => active,
    () => false,
  );
}

/** Call from a game screen: guard is on while `when` is true, off on unmount. */
export function useGuardWhile(when: boolean) {
  useEffect(() => {
    setLeaveGuard(when);
    return () => setLeaveGuard(false);
  }, [when]);
}
