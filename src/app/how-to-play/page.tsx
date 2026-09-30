"use client";
import { animate, motion } from "framer-motion";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { scoreGuess } from "@/lib/game";

const SECRET = "6247";
const GUESS = "1234";

export default function HowToPlay() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const c = animate(0, 4, { duration: 8, ease: "linear", repeat: Infinity, repeatDelay: 1.5, onUpdate: (v) => setStep(Math.floor(v)) });
    return () => c.stop();
  }, []);
  const fb = scoreGuess(SECRET, GUESS);
  const color = (i: number) =>
    step < 1 ? "border-white/15" : SECRET[i] === GUESS[i] ? "border-naija bg-naija/30" : SECRET.includes(GUESS[i]) ? "border-gold bg-gold/20" : "border-white/15 opacity-60";

  return (
    <main className="mx-auto max-w-md px-4 pb-12">
      <Header title="How to Play" />
      <ol className="flex flex-col gap-3 text-white/85 leading-snug">
        <li className="card p-4">🔒 Each player picks a secret code of <b>4 different digits</b> (0–9, no repeats; a leading 0 is fine, e.g. <span className="font-num">0381</span>). You can also play with 3 or 5 digits.</li>
        <li className="card p-4">🔫 Take turns guessing the other person&apos;s code. Every guess must also have unique digits.</li>
        <li className="card p-4">💀 <b>Dead</b> = right digit, right place. 🩸 <b>Wounded</b> = right digit, wrong place.</li>
        <li className="card p-4">🏆 4 Dead = <b>KPAI!</b> You cracked the code. If the first player cracks it, the other player gets <b>one last turn</b>. If they crack it too, na draw.</li>
      </ol>

      <h2 className="font-display text-xl text-gold mt-6 mb-2">Example</h2>
      <div className="card p-4 flex flex-col gap-3 items-center">
        <div className="text-sm text-white/60">Secret: <span className="font-num text-white">{SECRET}</span> · Guess: <span className="font-num text-white">{GUESS}</span></div>
        <div className="flex gap-2">
          {GUESS.split("").map((d, i) => (
            <motion.div key={i} animate={{ scale: step >= 1 ? [1, 1.25, 1] : 1 }} transition={{ delay: i * 0.15 }} className={`font-num w-14 h-16 rounded-2xl border-4 flex items-center justify-center text-3xl font-black ${color(i)}`}>
              {d}
            </motion.div>
          ))}
        </div>
        <div className="text-sm text-white/70 h-16 text-center">
          {step >= 2 && <div><b className="text-naija">2</b> is in the right place → 💀 Dead</div>}
          {step >= 3 && <div><b className="text-gold">4</b> is in the code but elsewhere → 🩸 Wounded</div>}
        </div>
        {step >= 3 && (
          <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-2xl">
            {fb.dead} Dead {fb.wounded} Wounded 💀🩸
          </motion.div>
        )}
      </div>
    </main>
  );
}
