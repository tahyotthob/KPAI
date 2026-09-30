import type { Rng } from "../candidates";
import type { AiLevel, Move } from "../types";
import { easyGuess } from "./easy";
import { hardGuess } from "./hard";
import { mediumGuess } from "./medium";

export function nextGuess(level: AiLevel, length: number, history: Move[], rng?: Rng): string {
  switch (level) {
    case "easy":
      return easyGuess(length, history, rng);
    case "medium":
      return mediumGuess(length, history, rng);
    case "hard":
      return hardGuess(length, history, rng);
  }
}

export { easyGuess, mediumGuess, hardGuess };
