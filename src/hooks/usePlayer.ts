"use client";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, ensureSession, isBackendConfigured } from "@/lib/supabase/client";
import { useLocalStorage } from "./useLocalStorage";

export type PlayerStatus = "loading" | "offline" | "ready" | "error";

const MESSAGES: Record<string, string> = {
  nickname_format: "3–16 characters: letters, numbers or underscore.",
  nickname_profane: "Abeg, choose a cleaner nickname.",
  nickname_taken: "Somebody don take that name. Try another.",
};
export const nicknameMessage = (e: unknown) => (e instanceof ApiError ? (MESSAGES[e.code] ?? "Could not save nickname.") : "Network wahala. Try again.");

/** Anonymous Supabase session + nickname profile. Works (nickname only) when no backend is configured. */
export function usePlayer() {
  const [nickname, setNickname, ready] = useLocalStorage("kpai:nickname", "");
  const [status, setStatus] = useState<PlayerStatus>("loading");
  const [profile, setProfile] = useState<{ id: string; nickname: string; is_anonymous: boolean } | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!isBackendConfigured()) return setStatus("offline");
    let cancelled = false;
    (async () => {
      try {
        await ensureSession();
        const r = await api<{ profile: typeof profile }>("/api/profile");
        if (cancelled) return;
        setProfile(r.profile);
        if (r.profile) setNickname(r.profile.nickname);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const save = useCallback(
    async (nick: string) => {
      if (!isBackendConfigured()) return setNickname(nick);
      const r = await api<{ id: string; nickname: string }>("/api/profile", { nickname: nick });
      setNickname(r.nickname);
      setProfile((p) => ({ id: r.id, nickname: r.nickname, is_anonymous: p?.is_anonymous ?? true }));
    },
    [setNickname],
  );

  return { nickname, setNickname, profile, status, save, hasProfile: Boolean(profile) };
}
