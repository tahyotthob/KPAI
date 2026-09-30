"use client";
import { useState } from "react";
import { nicknameMessage, usePlayer } from "@/hooks/usePlayer";

/** Renders children once the player has a saved nickname; otherwise asks for one. */
export default function NicknameGate({ children }: { children: React.ReactNode }) {
  const { nickname, setNickname, save, hasProfile, status } = usePlayer();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (status === "loading") return <p className="text-center text-white/60 py-10">Loading…</p>;
  if (status === "offline")
    return (
      <div className="card p-5 text-center">
        <p className="font-display text-xl text-gold mb-2">Online play is off</p>
        <p className="text-white/70 text-sm">This copy of KPAI! isn&apos;t connected to a backend yet. Ask the owner to finish DEPLOY.md. Offline modes still work.</p>
      </div>
    );
  if (status === "error")
    return <p className="card p-5 text-center text-white/80">Cannot reach the server. Check your network and refresh.</p>;
  if (hasProfile) return <>{children}</>;

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      await save(nickname.trim());
    } catch (e) {
      setErr(nicknameMessage(e));
    }
    setBusy(false);
  };
  return (
    <div className="card p-5 flex flex-col gap-3">
      <h2 className="font-display text-xl text-gold">Pick a nickname first</h2>
      <input className="chip-input" maxLength={16} placeholder="3–16 letters or numbers" value={nickname} onChange={(e) => setNickname(e.target.value)} aria-label="Nickname" />
      {err && <p className="text-blood text-sm" role="alert">{err}</p>}
      <button className="btn btn-green" onClick={submit} disabled={busy || nickname.trim().length < 3}>Save nickname</button>
    </div>
  );
}
