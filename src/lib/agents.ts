import type { AiLevel } from "./game/types";

export interface Agent {
  level: AiLevel;
  name: string;
  emoji: string;
  bio: string;
  color: string;
}

export const AGENTS: Record<AiLevel, Agent> = {
  easy: {
    level: "easy",
    name: "Mama Put",
    emoji: "🍲",
    bio: "Dey serve rice and guess by mood. Anybody fit beat her.",
    color: "#f59e0b",
  },
  medium: {
    level: "medium",
    name: "Area Boy",
    emoji: "😎",
    bio: "Street-smart. Remembers every clue, no dey waste your time.",
    color: "#3b82f6",
  },
  hard: {
    level: "hard",
    name: "Oga Kpai",
    emoji: "🕶️",
    bio: "The mathematician of Lagos. Solves am in about 5. Good luck!",
    color: "#ef4444",
  },
};

export const AGENT_LIST = [AGENTS.easy, AGENTS.medium, AGENTS.hard];
