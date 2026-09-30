"use client";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

/** Lets an anonymous player attach Google / email so their rank follows them to a new phone. */
export default function RankSaver({ isAnonymous }: { isAnonymous: boolean }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"save" | "signin">("save");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const sb = getSupabase();
  if (!sb) return null;
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/leaderboard` : undefined;

  const google = async () => {
    setBusy(true);
    const res = mode === "save"
      ? await sb.auth.linkIdentity({ provider: "google", options: { redirectTo } })
      : await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (res.error) setMsg(res.error.message);
    setBusy(false);
  };
  const magic = async () => {
    setBusy(true);
    const res = mode === "save"
      ? await sb.auth.updateUser({ email: email.trim() }, { emailRedirectTo: redirectTo })
      : await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo, shouldCreateUser: false } });
    setMsg(res.error ? res.error.message : "Check your email and tap the link. ✅");
    setBusy(false);
  };

  return (
    <div className="card p-4">
      {isAnonymous && (
        <p className="text-sm text-gold mb-3">
          ⚠️ You&apos;re playing as a guest. If you clear your browser data or change phone, you lose your rank.
        </p>
      )}
      {!open ? (
        <div className="grid grid-cols-2 gap-2">
          {isAnonymous && <button className="btn btn-gold !py-2" onClick={() => { setMode("save"); setOpen(true); }}>💾 Save my rank</button>}
          <button className={`btn btn-dark !py-2 ${isAnonymous ? "" : "col-span-2"}`} onClick={() => { setMode("signin"); setOpen(true); }}>Sign in on this phone</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="font-display text-gold">{mode === "save" ? "Save my rank" : "Get my rank back"}</div>
          <button className="btn btn-dark" onClick={google} disabled={busy}>Continue with Google</button>
          <input className="chip-input" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          <button className="btn btn-green" onClick={magic} disabled={busy || !email.includes("@")}>Email me a magic link</button>
          {msg && <p className="text-sm text-white/80" role="status">{msg}</p>}
          <button className="text-sm text-white/50 underline" onClick={() => { setOpen(false); setMsg(""); }}>Cancel</button>
        </div>
      )}
    </div>
  );
}
