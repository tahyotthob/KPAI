"use client";
import { useState } from "react";

export default function ShareRoom({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const base = (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  const link = `${base}/online/${code}`;
  const text = `Oya come play KPAI! with me 💀🩸 Room code: ${code}\n${link}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  return (
    <div className="flex flex-col gap-3 items-center w-full">
      <div className="text-xs uppercase tracking-widest text-white/50">Room code</div>
      <div className="font-display text-6xl tracking-[.2em] text-gold" aria-label={`Room code ${code.split("").join(" ")}`}>{code}</div>
      <a className="btn btn-green w-full" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
        💬 Share on WhatsApp
      </a>
      <button className="btn btn-dark w-full" onClick={copy}>{copied ? "Copied ✅" : "🔗 Copy invite link"}</button>
    </div>
  );
}
