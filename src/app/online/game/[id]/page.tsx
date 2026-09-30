"use client";
import { use } from "react";
import Header from "@/components/Header";
import NicknameGate from "@/components/NicknameGate";
import OnlineGame from "@/components/OnlineGame";

export default function OnlineGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <main className="mx-auto max-w-md px-4 pb-10">
      <Header title="Online" />
      <NicknameGate>
        <OnlineGame gameId={id} />
      </NicknameGate>
    </main>
  );
}
