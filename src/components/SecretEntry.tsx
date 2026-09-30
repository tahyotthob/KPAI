"use client";
import CodeInput from "./CodeInput";

export default function SecretEntry({ length, who, onLock, busy }: { length: number; who?: string; onLock: (code: string) => void; busy?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="font-display text-2xl text-gold text-center">{who ? `${who}: set your secret` : "Set your secret"}</h2>
      <p className="text-white/60 text-sm text-center">{length} different digits. Leading 0 is allowed. Tap 👁️ to double-check.</p>
      <CodeInput length={length} masked submitLabel="Lock am 🔒" onSubmit={onLock} disabled={busy} />
    </div>
  );
}
