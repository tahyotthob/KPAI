"use client";
import { useCallback, useEffect, useRef } from "react";
import { nextGuess } from "@/lib/game";
import type { AiLevel, Move } from "@/lib/game";
import type { AiRequest, AiResponse } from "./worker";

/** Human-feeling "thinking" delay range (ms) per level. */
const THINK_MS: Record<AiLevel, [number, number]> = {
  easy: [400, 800],
  medium: [600, 1200],
  hard: [1200, 2200],
};
/** If the worker hasn't answered in this long, compute on the main thread instead. */
const WORKER_TIMEOUT_MS = 8000;

interface Pending {
  resolve: (g: string) => void;
  /** Main-thread computation used when the worker fails or times out. */
  fallback: () => string;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Runs the solver in a Web Worker so the UI never freezes, and adds a human-feeling
 * thinking delay. Falls back to the main thread if Workers are unavailable, error out or
 * take more than 8 s, so the UI can never hang on "thinking...".
 */
export function useAgent() {
  const worker = useRef<Worker | null>(null);
  const pending = useRef(new Map<number, Pending>());
  const seq = useRef(0);

  useEffect(() => {
    const map = pending.current;
    const settle = (id: number, guess?: string) => {
      const p = map.get(id);
      if (!p) return;
      map.delete(id);
      clearTimeout(p.timer);
      p.resolve(guess ?? p.fallback());
    };
    const failAll = () => {
      for (const id of [...map.keys()]) settle(id);
      worker.current?.terminate();
      worker.current = null; // later requests compute on the main thread
    };
    try {
      const w = new Worker(new URL("./worker.ts", import.meta.url));
      w.onmessage = (e: MessageEvent<AiResponse>) => settle(e.data.id, e.data.guess);
      w.onerror = failAll;
      w.onmessageerror = failAll;
      worker.current = w;
    } catch {
      worker.current = null;
    }
    return () => {
      worker.current?.terminate();
      worker.current = null;
      for (const p of map.values()) clearTimeout(p.timer);
      map.clear();
    };
  }, []);

  return useCallback((level: AiLevel, length: number, history: Move[]): Promise<string> => {
    const [lo, hi] = THINK_MS[level] ?? THINK_MS.medium;
    const delay = lo + Math.random() * (hi - lo);
    const compute = new Promise<string>((resolve) => {
      const w = worker.current;
      const local = () => nextGuess(level, length, history);
      if (!w) return resolve(local());
      const id = ++seq.current;
      const timer = setTimeout(() => {
        const p = pending.current.get(id);
        if (!p) return;
        pending.current.delete(id);
        p.resolve(p.fallback());
      }, WORKER_TIMEOUT_MS);
      pending.current.set(id, { resolve, fallback: local, timer });
      try {
        w.postMessage({ id, level, length, history } satisfies AiRequest);
      } catch {
        clearTimeout(timer);
        pending.current.delete(id);
        resolve(local());
      }
    });
    const wait = new Promise<void>((r) => setTimeout(r, delay));
    return Promise.all([compute, wait]).then(([g]) => g);
  }, []);
}
