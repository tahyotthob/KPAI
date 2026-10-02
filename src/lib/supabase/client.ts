"use client";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export const isBackendConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function getSupabase(): SupabaseClient | null {
  if (!isBackendConfigured()) return null;
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return client;
}

let serverOffsetMs = 0;
/** Server-corrected "now" - phones with a wrong clock would otherwise show the wrong turn timer. */
export const serverNow = () => Date.now() + serverOffsetMs;

let sessionPromise: Promise<Session | null> | null = null;

/** Returns a signed-in session, creating an anonymous one on first visit (only ever one in flight). */
export function ensureSession(): Promise<Session | null> {
  const sb = getSupabase();
  if (!sb) return Promise.resolve(null);
  sessionPromise ??= (async () => {
    const { data } = await sb.auth.getSession();
    if (data.session) return data.session;
    const res = await sb.auth.signInAnonymously();
    if (res.error) throw res.error;
    return res.data.session;
  })().finally(() => {
    sessionPromise = null;
  });
  return sessionPromise;
}

/** Calls a Next.js route handler with the player's access token. */
export async function api<T = unknown>(path: string, body?: unknown, method = body === undefined ? "GET" : "POST"): Promise<T> {
  const session = await ensureSession();
  if (!session) throw new ApiError(503, "backend_not_configured");
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const dateHdr = res.headers.get("date");
  if (dateHdr) {
    const t = new Date(dateHdr).getTime();
    if (Number.isFinite(t)) serverOffsetMs = t - Date.now();
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json.error ?? "error", json);
  return json as T;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, public data?: unknown) {
    super(code);
  }
}
