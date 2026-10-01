"use client";
import { m } from "framer-motion";
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
      <div className="relative flex items-center justify-center h-16 w-16 my-1" aria-hidden>
        <span className="radar-ring absolute inset-0 rounded-full border-4 border-naija" />
        <span className="radar-ring absolute inset-0 rounded-full border-4 border-naija" style={{ animationDelay: "0.9s" }} />
        <span className="text-3xl relative">📡</span>
      </div>
      <div className="text-xs uppercase tracking-widest text-white/50">Room code</div>
      <div className="font-display text-6xl tracking-[.15em] text-gold flex" aria-label={`Room code ${code.split("").join(" ")}`}>
        {code.split("").map((ch, i) => (
          <m.span key={i} initial={{ y: -40, opacity: 0, rotate: -20 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 420, damping: 14, delay: i * 0.07 }}>
            {ch}
          </m.span>
        ))}
      </div>
      <a className="btn btn-green w-full" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
        💬 Share on WhatsApp
      </a>
      <button className="btn btn-dark w-full" onClick={copy}>{copied ? "Copied ✅" : "🔗 Copy invite link"}</button>
    </div>
  );
}
