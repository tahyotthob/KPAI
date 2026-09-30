"use client";
import { AnimatePresence, motion } from "framer-motion";

export default function SpeechBubble({ line }: { line: { text: string; n: number } | null }) {
  return (
    <div className="h-14 relative" role="status" aria-live="polite">
      <AnimatePresence mode="wait">
        {line && (
          <motion.div
            key={line.n}
            initial={{ scale: 0.3, rotate: -8, opacity: 0, y: 10 }}
            animate={{ scale: 1, rotate: [-3, 3, -2, 0], opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 380, damping: 14 }}
            className="absolute inset-x-0 mx-auto w-fit max-w-full bg-gold text-ink font-black rounded-2xl px-4 py-2 border-4 border-black/60 shadow-[0_4px_0_rgba(0,0,0,.5)] text-center"
          >
            🗣️ {line.text}
            <span className="absolute -bottom-2 left-8 w-4 h-4 bg-gold rotate-45 border-b-4 border-r-4 border-black/60" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
