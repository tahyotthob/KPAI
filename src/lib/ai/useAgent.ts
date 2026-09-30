"use client";
import { useCallback, useEffect, useRef } from "react";
import { nextGuess } from "@/lib/game";
import type { AiLevel, Move } from "@/lib/game";
import type { AiRequest, AiResponse } from "./worker";

/**
 * Runs the solver in a Web Worker so the UI never freezes, and adds a human-feeling
 * 600-1200ms "thinking" delay. Falls back to the main thread if Workers are unavailable.
 */
export function useAgent() {
  const worker = useRef<Worker | null>(null);
  const pending = useRef(new Map<number, (g: string) => void>());
  const seq = useRef(0);

  useEffect(() => {
    try {
      const w = new Worker(new URL("./worker.ts", import.meta.url));
      w.onmessage = (e: MessageEvent<AiResponse>) => {
        pending.current.get(e.data.id)?.(e.data.guess);
        pending.current.delete(e.data.id);
      };
      worker.current = w;
    } catch {
      worker.current = null;
    }
    const map = pending.current;
    return () => {
      worker.current?.terminate();
      worker.current = null;
      map.clear();
    };
  }, []);

  return useCallback((level: AiLevel, length: number, history: Move[]): Promise<string> => {
    const delay = 600 + Math.random() * 600;
    const compute = new Promise<string>((resolve) => {
      const w = worker.current;
      if (!w) return resolve(nextGuess(level, length, history));
      const id = ++seq.current;
      pending.current.set(id, resolve);
      w.postMessage({ id, level, length, history } satisfies AiRequest);
    });
    const wait = new Promise<void>((r) => setTimeout(r, delay));
    return Promise.all([compute, wait]).then(([g]) => g);
  }, []);
}
