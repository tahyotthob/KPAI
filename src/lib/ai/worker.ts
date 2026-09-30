/// <reference lib="webworker" />
import { nextGuess } from "@/lib/game";
import type { AiLevel, Move } from "@/lib/game";

export interface AiRequest {
  id: number;
  level: AiLevel;
  length: number;
  history: Move[];
}
export interface AiResponse {
  id: number;
  guess: string;
}

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const { id, level, length, history } = e.data;
  const guess = nextGuess(level, length, history);
  (self as unknown as Worker).postMessage({ id, guess } satisfies AiResponse);
};
