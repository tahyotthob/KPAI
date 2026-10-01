"use client";
import { m } from "framer-motion";

/** Big stamp that slams onto the screen with a shockwave and a screen shake. */
export default function KpaiStamp({ text = "KPAI!" }: { text?: string }) {
  return (
    <div className="relative w-fit mx-auto py-3">
      {[0, 0.12].map((d) => (
        <m.span
          key={d}
          className="absolute inset-0 rounded-2xl border-4 border-gold/70"
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: [1, 1.9], opacity: [0.9, 0] }}
          transition={{ duration: 0.8, delay: 0.28 + d, ease: "easeOut" }}
          aria-hidden
        />
      ))}
      <m.div
        initial={{ scale: 4.5, rotate: -28, opacity: 0 }}
        animate={{ scale: [4.5, 0.9, 1], rotate: [-28, -6, -8], opacity: 1 }}
        transition={{ duration: 0.55, times: [0, 0.7, 1], ease: "easeOut" }}
        className="font-display text-6xl text-blood border-8 border-blood rounded-2xl px-6 py-2 bg-black/40 relative"
      >
        {text}
        <m.span
          className="absolute inset-0 rounded-xl bg-white/50 mix-blend-overlay"
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          aria-hidden
        />
      </m.div>
    </div>
  );
}
