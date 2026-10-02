"use client";
import { AnimatePresence, m } from "framer-motion";
import { useEffect } from "react";
import { FeedbackIcons, feedbackText } from "./HistoryPanel";

export interface Notice {
  /** unique per notice - a new id replays the animation */
  id: number;
  who: string;
  guess: string;
  dead: number;
  wounded: number;
  /** 1-based round number of this move */
  round: number;
  /** your own result in the same round, when you've already played it */
  mine?: { guess: string; dead: number; wounded: number } | null;
  yourTurn?: boolean;
}

/** Slide-in card: what the opponent just played, its result, and how the round compares. */
export default function MoveNotice({ notice, onClose, ms = 4200 }: { notice: Notice | null; onClose: () => void; ms?: number }) {
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(onClose, ms);
    return () => clearTimeout(t);
  }, [notice, onClose, ms]);

  return (
    <div className="fixed inset-x-0 top-14 z-50 px-3 pointer-events-none flex justify-center" role="status" aria-live="polite">
      <AnimatePresence>
        {notice && (
          <m.button
            key={notice.id}
            type="button"
            onClick={onClose}
            initial={{ y: -60, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className="pointer-events-none w-full max-w-md text-left card !bg-panel2 !border-gold p-2.5"
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl" aria-hidden>🎯</div>
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-widest text-white/60">Round {notice.round} · {notice.who} played</div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="font-num text-2xl font-black text-gold tracking-widest">{notice.guess}</span>
                  <span className="text-lg"><FeedbackIcons dead={notice.dead} wounded={notice.wounded} /></span>
                </div>
                <div className="text-sm text-white/80">{feedbackText(notice.dead, notice.wounded)}</div>
              </div>
            </div>
            {notice.mine && (
              <div className="mt-2 pt-2 border-t border-white/10 text-sm flex flex-wrap gap-x-4 gap-y-1">
                <span className="text-white/60">Round {notice.round}:</span>
                <span>You <b className="font-num text-gold">{notice.mine.guess}</b> → {feedbackText(notice.mine.dead, notice.mine.wounded)}</span>
                <span>{notice.who} → {feedbackText(notice.dead, notice.wounded)}</span>
              </div>
            )}
            {notice.yourTurn && <div className="mt-1 text-naija font-bold text-sm">Your turn now! 🔫</div>}
          </m.button>
        )}
      </AnimatePresence>
    </div>
  );
}
