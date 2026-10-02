"use client";
import { AnimatePresence, m } from "framer-motion";
import { useEffect } from "react";

export interface Burst {
  id: number;
  dead: number;
  wounded: number;
  /** one digit away from cracking it */
  close?: boolean;
}

/**
 * Big centre-screen reveal of the result of YOUR guess: icons fly in one by one, 0-0 shows a
 * wobbling "nothing", and a near-miss adds a red heartbeat vignette.
 */
export default function GuessBurst({ burst, onDone }: { burst: Burst | null; onDone: () => void }) {
  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [burst, onDone]);

  const nothing = burst && burst.dead === 0 && burst.wounded === 0;
  const icons = burst ? ([...Array(burst.dead).fill("💀"), ...Array(burst.wounded).fill("🩸")] as string[]) : [];

  return (
    <AnimatePresence>
      {burst && (
        <>
          {burst.close && <div key={`hb-${burst.id}`} className="heartbeat pointer-events-none fixed inset-0 z-30" aria-hidden />}
          <m.div
            key={burst.id}
            className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            aria-hidden
          >
            <m.div
              className="rounded-3xl bg-black/80 px-8 py-5 text-center border-4 border-white/10"
              initial={{ scale: 0.4, rotate: -6 }}
              animate={nothing ? { scale: 1, rotate: [0, -8, 8, -6, 6, 0] } : { scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 15 }}
            >
              {nothing ? (
                <div className="font-display text-4xl text-blood">🙅 NOTHING!</div>
              ) : (
                <>
                  <div className="text-6xl leading-none flex justify-center">
                    {icons.map((ic, i) => (
                      <m.span key={i} initial={{ scale: 0, y: -60, rotate: -90 }} animate={{ scale: 1, y: 0, rotate: 0 }} transition={{ type: "spring", stiffness: 480, damping: 12, delay: i * 0.12 }}>
                        {ic}
                      </m.span>
                    ))}
                  </div>
                  <div className="font-display text-xl mt-2 text-gold">
                    {burst.dead} Dead · {burst.wounded} Wounded
                  </div>
                </>
              )}
            </m.div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
