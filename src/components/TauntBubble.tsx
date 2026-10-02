"use client";
import { AnimatePresence, m } from "framer-motion";
import type { Agent } from "@/lib/agents";

export interface Taunt {
  id: number;
  text: string;
}

/** The AI persona talks back: a comic bubble next to their avatar. Text only (no audio). */
export default function TauntBubble({ agent, taunt }: { agent: Agent; taunt: Taunt | null }) {
  return (
    <div className="min-h-[3.25rem]" aria-live="polite">
      <AnimatePresence mode="wait">
        {taunt && (
          <m.div
            key={taunt.id}
            initial={{ opacity: 0, x: -24, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="relative ml-1 rounded-2xl rounded-bl-sm bg-cream text-ink px-3 py-2 text-sm font-bold border-[3px] border-black shadow-[3px_3px_0_#000]"
          >
            <span className="mr-1" aria-hidden>{agent.emoji}</span>
            <b className="opacity-60 text-xs uppercase mr-1">{agent.name}:</b>
            {taunt.text}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
