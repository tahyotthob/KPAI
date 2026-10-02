"use client";
import { AnimatePresence, m } from "framer-motion";
import { useEffect, useState } from "react";
import { CHAT_LINES } from "@/lib/chat";
import type { ChatMsg } from "@/hooks/useOnlineGame";

/** Preset banter buttons + the last few messages. */
export default function ChatBar({ messages, onSend, oppName }: { messages: ChatMsg[]; onSend: (id: string) => void; oppName: string }) {
  const [open, setOpen] = useState(false);
  const [cool, setCool] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const hasRecent = messages.some((x) => now - x.at < 9000);
  useEffect(() => {
    if (!messages.length) return;
    setNow(Date.now());
    if (!hasRecent && messages.length) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [messages, hasRecent]);
  const recent = messages.filter((x) => now - x.at < 9000).slice(-3);

  const send = (id: string) => {
    if (cool) return;
    onSend(id);
    setCool(true);
    setTimeout(() => setCool(false), 1500);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5 min-h-[2rem]" aria-live="polite">
        <AnimatePresence initial={false}>
          {recent.map((msg) => (
            <m.div
              key={msg.key}
              initial={{ scale: 0.6, opacity: 0, x: msg.from === "me" ? 30 : -30 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm font-bold border-2 border-black/50 ${
                msg.from === "me" ? "self-end bg-naija text-ink" : "self-start bg-gold text-ink"
              }`}
            >
              {msg.from === "them" && <span className="opacity-70 text-xs block">{oppName}</span>}
              {msg.text}
            </m.div>
          ))}
        </AnimatePresence>
      </div>
      <button className="btn btn-dark !py-2" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        💬 Gist {oppName} {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto">
          {CHAT_LINES.map((l) => (
            <button key={l.id} className="btn btn-dark !py-2 !px-3 text-sm !rounded-full" onClick={() => send(l.id)} disabled={cool}>
              {l.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
