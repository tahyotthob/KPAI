"use client";
import { motion } from "framer-motion";

export default function Avatar({ emoji, color, size = 56, thinking }: { emoji: string; color: string; size?: number; thinking?: boolean }) {
  return (
    <motion.div
      animate={thinking ? { rotate: [-6, 6, -6], y: [0, -4, 0] } : { rotate: 0, y: 0 }}
      transition={thinking ? { repeat: Infinity, duration: 0.7 } : { duration: 0.2 }}
      className="rounded-full flex items-center justify-center border-4 shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.55, borderColor: color, background: "#0b1712" }}
      aria-hidden
    >
      {emoji}
    </motion.div>
  );
}
