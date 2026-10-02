"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import GameSetup from "@/components/GameSetup";
import Header from "@/components/Header";
import NicknameGate from "@/components/NicknameGate";
import { api, ApiError } from "@/lib/supabase/client";

export default function OnlineMenu() {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className="mx-auto max-w-md px-4 pb-10">
      <Header title="Play Friend" />
      <NicknameGate>
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button className={`btn ${tab === "create" ? "btn-gold" : "btn-dark"}`} onClick={() => setTab("create")}>Create room</button>
          <button className={`btn ${tab === "join" ? "btn-gold" : "btn-dark"}`} onClick={() => setTab("join")}>Join with code</button>
        </div>
        {tab === "create" ? (
          <GameSetup
            mode="online"
            initial={{ timer: 60 }}
            onStart={async (s) => {
              if (busy) return;
              setBusy(true);
              setErr("");
              try {
                const r = await api<{ id: string }>("/api/games", { length: s.length, timer: s.timer });
                router.push(`/online/game/${r.id}`);
              } catch (e) {
                setErr(e instanceof ApiError ? "Could not create room." : "Network wahala. Try again.");
                setBusy(false);
              }
            }}
          />
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const c = code.trim().toUpperCase();
              if (c.length === 6) router.push(`/online/${c}`);
              else setErr("Room code na 6 characters.");
            }}
          >
            <input className="chip-input font-display text-3xl text-center tracking-[.3em] uppercase" maxLength={6} value={code} onChange={(e) => { setCode(e.target.value); setErr(""); }} placeholder="ABC123" aria-label="Room code" autoCapitalize="characters" />
            <button className="btn btn-green h-14 text-xl font-display" disabled={code.trim().length !== 6}>Join</button>
          </form>
        )}
        {err && <p className="text-blood text-center mt-3" role="alert">{err}</p>}
      </NicknameGate>
    </main>
  );
}
