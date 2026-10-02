"use client";
import { AnimatePresence, m } from "framer-motion";
import { useEffect, useState } from "react";
import { TOAST_EVENT, type ToastMsg } from "@/lib/toast";

/** Stack of short-lived celebratory toasts (badges, streaks...). */
export default function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const t = (e as CustomEvent<ToastMsg>).detail;
      setItems((cur) => [...cur.slice(-2), t]);
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== t.id)), 4200);
    };
    window.addEventListener(TOAST_EVENT, on);
    return () => window.removeEventListener(TOAST_EVENT, on);
  }, []);
  return (
    <div className="fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4 pointer-events-none" role="status" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <m.div
            key={t.id}
            initial={{ y: 60, opacity: 0, scale: 0.8, rotate: -3 }}
            animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 20 }}
            className="card !bg-gold text-ink !border-black px-4 py-2 flex items-center gap-3 max-w-sm w-full"
          >
            <span className="text-3xl" aria-hidden>{t.emoji}</span>
            <span>
              <b className="block leading-tight">{t.title}</b>
              {t.body && <span className="text-sm opacity-80">{t.body}</span>}
            </span>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
