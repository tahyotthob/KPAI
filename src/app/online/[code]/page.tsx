"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import NicknameGate from "@/components/NicknameGate";
import { api, ApiError } from "@/lib/supabase/client";

const MSG: Record<string, string> = {
  room_not_found: "We no see that room. Check the code.",
  room_full: "That room don full.",
  bad_code: "That code no correct (6 letters/numbers).",
};

function Joiner({ code }: { code: string }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  useEffect(() => {
    api<{ id: string }>("/api/games/join", { roomCode: code })
      .then((r) => router.replace(`/online/game/${r.id}`))
      .catch((e) => setErr(e instanceof ApiError ? (MSG[e.code] ?? "Could not join.") : "Network wahala. Refresh."));
  }, [code, router]);
  return err ? <p className="card p-5 text-center text-blood" role="alert">{err}</p> : <p className="text-center text-white/60 py-10">Joining room {code}…</p>;
}

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return (
    <main className="mx-auto max-w-md px-4 pb-10">
      <Header title="Join room" />
      <NicknameGate>
        <Joiner code={code.toUpperCase()} />
      </NicknameGate>
    </main>
  );
}
