"use client";
import { m } from "framer-motion";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { BADGES, loadBadges } from "@/lib/badges";

export default function BadgesPage() {
  const [have, setHave] = useState<Record<string, number>>({});
  useEffect(() => setHave(loadBadges()), []);
  const count = BADGES.filter((b) => have[b.id]).length;
  return (
    <main className="mx-auto max-w-md px-4 pb-10">
      <Header title="Badges" />
      <p className="text-center text-white/75 mb-4">
        <b className="font-num text-gold text-xl">{count}</b>/{BADGES.length} collected. Play to unlock the rest. 🏅
      </p>
      <div className="grid grid-cols-2 gap-3">
        {BADGES.map((b, i) => {
          const got = Boolean(have[b.id]);
          return (
            <m.div
              key={b.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 380, damping: 18 }}
              className={`card p-3 text-center ${got ? "!bg-gold text-ink" : "opacity-70"}`}
            >
              <div className={`text-4xl ${got ? "" : "grayscale"}`} aria-hidden>{got ? b.emoji : "🔒"}</div>
              <div className="font-display text-sm mt-1">{b.name}</div>
              <div className={`text-xs mt-1 ${got ? "opacity-80" : "text-white/70"}`}>{b.desc}</div>
            </m.div>
          );
        })}
      </div>
    </main>
  );
}
