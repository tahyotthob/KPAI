export type AiLevel = "easy" | "medium" | "hard";
export type GameMode = "computer" | "practice" | "pass" | "online";
export type DigitLength = 3 | 4 | 5;

export interface Feedback {
  dead: number;
  wounded: number;
}

export interface Move extends Feedback {
  guess: string;
}

export const DIGIT_LENGTHS: DigitLength[] = [3, 4, 5];
export const DEFAULT_LENGTH: DigitLength = 4;
