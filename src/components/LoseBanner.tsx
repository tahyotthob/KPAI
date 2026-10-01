"use client";
import { m } from "framer-motion";

/** Skull drops in, bounces and settles; the title wobbles. */
export default function LoseBanner({ text = "DEM DON KPAI YOU" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 bigshake">
      <m.div
        className="text-7xl"
        initial={{ y: -300, rotate: -30, opacity: 0 }}
        animate={{ y: [-300, 0, -40, 0, -12, 0], rotate: [-30, 0, 8, 0], opacity: 1 }}
        transition={{ duration: 1.1, times: [0, 0.35, 0.55, 0.75, 0.88, 1], ease: "easeOut" }}
        aria-hidden
      >
        💀
      </m.div>
      <m.div
        className="font-display text-4xl text-gold text-center"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotate: [0, -2, 2, -1, 0] }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        {text}
      </m.div>
    </div>
  );
}
