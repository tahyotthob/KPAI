"use client";
import { api, isBackendConfigured } from "@/lib/supabase/client";
import type { AiLevel, GameMode, TranscriptEvent } from "@/lib/game";

/**
 * Best-effort scoring for offline games. The game itself is fully playable offline; if the
 * backend is missing/unreachable or the player has no nickname yet, scoring is silently skipped.
 */
export async function startScored(mode: GameMode, length: number, aiLevel?: AiLevel): Promise<string | null> {
  if (!isBackendConfigured()) return null;
  try {
    const r = await api<{ id: string }>("/api/games/local", { mode, length, aiLevel });
    return r.id;
  } catch {
    return null;
  }
}

export interface FinishResult {
  points: number;
  rejected?: string;
}

export async function finishScored(id: string | null, secrets: string[], events: TranscriptEvent[]): Promise<FinishResult | null> {
  if (!id) return null;
  try {
    return await api<FinishResult>(`/api/games/${id}/finish`, { secrets, events });
  } catch {
    return null;
  }
}
