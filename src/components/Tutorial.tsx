"use client";
import { AnimatePresence, m } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AGENTS } from "@/lib/agents";
import { randomCode, scoreGuess, type Move } from "@/lib/game";
import { unlockBadge } from "@/lib/progress";
import { explain, hintFor, nudge, setTutorialDone, type Mark } from "@/lib/tutorial";
import { haptic } from "@/lib/toast";
import Avatar from "./Avatar";
import CodeInput from "./CodeInput";
import Confetti from "./Confetti";
import DigitTracker, { emptyTracker, type TrackerState } from "./DigitTracker";
import HistoryPanel from "./HistoryPanel";
import KpaiStamp from "./KpaiStamp";

const MAMA = AGENTS.easy;
const LEN = 4;

type Step = "welcome" | "secret" | "clues" | "first" | "notepad" | "play" | "done";
const ORDER: Step[] = ["welcome", "secret", "clues", "first", "notepad", "play", "done"];

const MARK_STYLE: Record<Mark, string> = {
  dead: "border-blood bg-blood/25",
  wounded: "border-hot bg-hot/25",
  none: "border-white/20 bg-white/5 opacity-70",
};
const MARK_LABEL: Record<Mark, string> = { dead: "💀 right place", wounded: "🩸 wrong place", none: "✗ not in code" };

/** Digit tiles coloured by verdict, with a caption under each. */
function Tiles({ digits, marks, labels = true }: { digits: string; marks: Mark[]; labels?: boolean }) {
  return (
    <div className="flex justify-center gap-2">
      {digits.split("").map((d, i) => (
        <m.div key={i} initial={{ scale: 0.5, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ delay: 0.12 * i, type: "spring", stiffness: 420, damping: 16 }} className="flex flex-col items-center gap-1 w-16">
          <div className={`font-num w-14 h-16 rounded-2xl border-4 flex items-center justify-center text-3xl ${MARK_STYLE[marks[i]]}`}>{d}</div>
          {labels && <div className="text-[11px] leading-tight text-center text-white/80">{MARK_LABEL[marks[i]]}</div>}
        </m.div>
      ))}
    </div>
  );
}

function Mama({ children, k }: { children: React.ReactNode; k: string }) {
  return (
    <div className="flex items-start gap-3">
      <Avatar emoji={MAMA.emoji} color={MAMA.color} size={64} active />
      <AnimatePresence mode="wait">
        <m.div
          key={k}
          initial={{ opacity: 0, x: -16, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 24 }}
          className="relative flex-1 rounded-2xl rounded-tl-sm bg-cream text-ink px-4 py-3 text-[15px] leading-snug font-medium border-[3px] border-black shadow-[3px_3px_0_#000]"
        >
          <b className="block text-xs uppercase opacity-60 mb-0.5">Mama Put</b>
          {children}
        </m.div>
      </AnimatePresence>
    </div>
  );
}

export default function Tutorial() {
  const [step, setStep] = useState<Step>("welcome");
  const [secret, setSecret] = useState("");
  const [moves, setMoves] = useState<Move[]>([]);
  const [tracker, setTracker] = useState<TrackerState>(emptyTracker());
  const [touched, setTouched] = useState(false);
  const [hint, setHint] = useState("");
  const [shout, setShout] = useState("");
  const [badge, setBadge] = useState(false);

  useEffect(() => setSecret(randomCode(LEN)), []);
  const idx = ORDER.indexOf(step);
  const next = useCallback(() => {
    setShout("");
    setStep((s) => ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(s) + 1)]);
  }, []);

  const last = moves[moves.length - 1];
  const lastExp = useMemo(() => (last && secret ? explain(secret, last.guess) : null), [last, secret]);

  const onGuess = (guess: string) => {
    const fb = scoreGuess(secret, guess);
    const mv: Move = { guess, ...fb };
    setMoves((cur) => [...cur, mv]);
    setHint("");
    setShout("");
    haptic(fb.dead === LEN ? [30, 40, 70] : 20);
    if (fb.dead === LEN) {
      setStep("done");
      setTutorialDone();
      setBadge(unlockBadge("mama_pikin"));
    }
  };

  const onInvalid = (why: "repeat" | "length") => {
    if (why === "repeat") setShout("Ah ahn! No repeat digits o — every digit must be different. 🙅🏾");
  };

  const ready = step === "first" ? moves.length > 0 : step === "notepad" ? touched : true;
  const showInput = (step === "first" && moves.length === 0) || step === "play";

  return (
    <div className="flex flex-col gap-4">
      {/* progress dots */}
      <div className="flex justify-center gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={ORDER.length} aria-valuenow={idx + 1} aria-label="Lesson progress">
        {ORDER.map((s, i) => (
          <span key={s} className={`h-2.5 rounded-full transition-all ${i === idx ? "w-8 bg-gold" : i < idx ? "w-2.5 bg-acid" : "w-2.5 bg-white/20"}`} />
        ))}
      </div>

      {step === "welcome" && (
        <>
          <Mama k="welcome">
            Ah ahn, welcome my pikin! 🍲 Make I teach you this game small small. E no hard — na just <b>one rule</b>, <b>two clues</b>, and <b>one note pad</b>. Ready?
          </Mama>
          <ul className="card p-4 text-sm space-y-2 text-white/90">
            <li>🔒 I go hide a secret code (4 different digits).</li>
            <li>🔫 You go guess am. I go tell you how close you be.</li>
            <li>🏆 Crack am and you shout <b className="text-gold">KPAI!</b></li>
          </ul>
        </>
      )}

      {step === "secret" && (
        <>
          <Mama k="secret">
            Look, I don choose my secret code o. 🤫 E get <b>4 digits</b> (0 to 9), and <b>no digit dey show twice</b>. So <span className="font-num">1123</span> is not allowed, but <span className="font-num">0381</span> is fine (zero fit begin am too).
          </Mama>
          <div className="flex justify-center gap-2" aria-label="Hidden code">
            {Array.from({ length: LEN }).map((_, i) => (
              <m.div key={i} animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.18 }} className="font-num w-14 h-16 rounded-2xl border-4 border-gold bg-ink flex items-center justify-center text-3xl text-gold">?</m.div>
            ))}
          </div>
        </>
      )}

      {step === "clues" && (
        <>
          <Mama k="clues">
            After every guess I go give you <b>two clues</b>. 💀 <b>Dead</b> = right digit, <b>right place</b>. 🩸 <b>Wounded</b> = right digit, <b>wrong place</b>. See example — if my secret na <span className="font-num">6247</span> and you guess <span className="font-num">1234</span>:
          </Mama>
          <div className="card p-4 flex flex-col gap-3">
            <div className="text-center text-xs uppercase tracking-widest text-white/60">Secret (hidden from you) <span className="font-num text-gold text-base ml-1">6 2 4 7</span></div>
            <Tiles digits="1234" marks={["none", "dead", "none", "wounded"]} />
            <p className="text-center font-display text-gold">= 1 Dead, 1 Wounded</p>
          </div>
          <Mama k="clues2">
            The <b>2</b> is in my code AND for the same spot → Dead. The <b>4</b> is in my code but for another spot → Wounded. <b>1</b> and <b>3</b> no dey at all. Easy, abi? 😄
          </Mama>
        </>
      )}

      {step === "first" && (
        <>
          <Mama k={`first-${moves.length}`}>
            {moves.length === 0 ? (
              <>Your turn! 🔫 Tap any <b>4 different digits</b> on the pad, then press <b>Shoot!</b> Don&apos;t think too much — this one na just for practice.</>
            ) : (
              <>See wetin happen! Below, I explain every digit of your guess. This na how you go read the clues every time.</>
            )}
          </Mama>
        </>
      )}

      {step === "notepad" && (
        <Mama k="notepad">
          Now the <b>note pad</b> 📝 — your best friend! Tap a digit one time to <b>cross it out</b> (you sure say e no dey the code). Tap again to mark it <b>green</b> (you sure say e dey inside). Try tap one digit now!
        </Mama>
      )}

      {step === "play" && (
        <Mama k={`play-${moves.length}-${hint}-${shout}`}>
          {shout || hint || (last ? nudge(LEN, last, moves.length) : "Okay, now crack my code for real! Use the clues and your note pad.")}
        </Mama>
      )}

      {step === "done" && (
        <>
          <Confetti />
          <KpaiStamp text="KPAI!" />
          <Mama k="done">
            Chai! You crack my code in <b>{moves.length}</b> {moves.length === 1 ? "guess" : "guesses"}! 🎉 You don graduate from Mama Put&apos;s class. One last thing: when you play against somebody, the <b>first player</b> wey crack the code, the <b>second player</b> still get <b>one last turn</b> — if both crack am, na draw. Fair is fair! ⚖️
          </Mama>
          {badge && <div className="card !bg-gold text-ink p-3 text-center font-bold">🍲 Badge unlocked: Mama&apos;s Pikin</div>}
        </>
      )}

      {/* what happened with the last guess, digit by digit */}
      {lastExp && (step === "first" || step === "notepad" || step === "play" || step === "done") && last && (
        <div className="card p-4 flex flex-col gap-3" aria-live="polite">
          <div className="text-xs uppercase tracking-widest text-white/60">Your guess #{moves.length}: <span className="font-num text-gold text-base">{last.guess}</span></div>
          <Tiles digits={last.guess} marks={lastExp.marks} />
          <ul className="text-sm space-y-1 text-white/90">
            {lastExp.lines.map((l, i) => (
              <li key={i}>• {l}</li>
            ))}
          </ul>
          <p className="font-display text-gold text-center">= {lastExp.dead} Dead, {lastExp.wounded} Wounded</p>
        </div>
      )}

      {step === "play" && moves.length > 1 && <HistoryPanel moves={moves} />}

      {showInput && <CodeInput length={LEN} submitLabel="Shoot! 🔫" onSubmit={onGuess} onInvalid={onInvalid} />}
      {(step === "notepad" || step === "play") && (
        <DigitTracker
          value={tracker}
          onChange={(t) => {
            setTracker(t);
            setTouched(true);
          }}
        />
      )}

      {step === "play" && moves.length >= 2 && (
        <button className="btn btn-dark" onClick={() => setHint(hintFor(secret, moves))}>
          🤫 Mama, give me a small clue
        </button>
      )}

      {/* navigation */}
      {step !== "done" && step !== "play" && (
        <div className="flex gap-3 items-center">
          <button className="btn btn-gold flex-1 text-lg" onClick={next} disabled={!ready}>
            {step === "welcome" ? "Oya, teach me! 🍲" : step === "notepad" ? (touched ? "Next ▶" : "Tap a digit first ☝🏾") : step === "first" && moves.length === 0 ? "Shoot a guess first ☝🏾" : "Next ▶"}
          </button>
        </div>
      )}

      {step === "done" ? (
        <div className="grid gap-3">
          <Link href="/play/computer" className="btn btn-hot tilt-l text-lg">Play Mama Put for real 🍲</Link>
          <Link href="/play/daily" className="btn btn-acid tilt-r">Try today&apos;s Daily Kpai 📅</Link>
          <Link href="/" className="btn btn-dark">Back home</Link>
        </div>
      ) : (
        <Link href="/how-to-play" className="text-center text-sm text-white/60 underline">Skip class — I sabi am already</Link>
      )}
    </div>
  );
}
