"use client";
import { motion } from "framer-motion";

/** Big "KPAI!" stamp that slams onto the screen. */
export default function KpaiStamp({ text = "KPAI!" }: { text?: string }) {
  return (
    <motion.div
      initial={{ scale: 4, rotate: -25, opacity: 0 }}
      animate={{ scale: 1, rotate: -8, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 14, mass: 1.2 }}
      className="font-display text-6xl text-blood border-8 border-blood rounded-2xl px-6 py-2 w-fit mx-auto bg-black/40"
    >
      {text}
    </motion.div>
  );
}
