"use client";
import { m } from "framer-motion";

/** Full-screen cover shown between turns so nobody sees the other player's board. */
export default function HandPhone({ to, onReady, note }: { to: string; onReady: () => void; note?: string }) {
  return (
    <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card p-8 flex flex-col items-center gap-5 text-center mt-8">
      <m.div className="text-6xl" aria-hidden animate={{ x: [-18, 18, -18] }} transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}>
        📱➡️
      </m.div>
      <h2 className="font-display text-3xl text-gold">Hand phone to {to}</h2>
      <p className="text-white/70">{note ?? "No peeping o! Only take the phone when the other person don look away."}</p>
      <button className="btn btn-green w-full h-16 text-xl font-display" onClick={onReady}>
        I&apos;m {to} — show me
      </button>
    </m.div>
  );
}
