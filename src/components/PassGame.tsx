"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { applyGuess, newMatch, scoreGuess, skipTurn } from "@/lib/game";
import type { MatchState, TranscriptEvent } from "@/lib/game";
import { finishScored, startScored, type FinishResult } from "@/lib/scoring-client";
import { useCountdown } from "@/hooks/useCountdown";
import { useSpeech } from "@/hooks/useSpeech";
import CodeInput from "./CodeInput";
import Confetti from "./Confetti";
import DigitTracker, { emptyTracker, type TrackerState } from "./DigitTracker";
import HandPhone from "./HandPhone";
import HistoryPanel, { FeedbackIcons, feedbackText } from "./HistoryPanel";
import KpaiStamp from "./KpaiStamp";
import RedFlash from "./RedFlash";
import SecretEntry from "./SecretEntry";
import SpeechBubble from "./SpeechBubble";
import type { Settings } from "./GameSetup";

type Stage = "secret" | "play" | "result";

export default function PassGame({ settings, names }: { settings: Settings; names: [string, string] }) {
  const { length, timer } = settings;
  const [stage, setStage] = useState<Stage>("secret");
  const [secretTurn, setSecretTurn] = useState<0 | 1>(0);
  const [ready, setReady] = useState(false);
  const [secrets, setSecrets] = useState<[string, string]>(["", ""]);
  const [match, setMatch] = useState<MatchState>(() => newMatch(length));
  const [last, setLast] = useState<{ p: 0 | 1; guess: string; dead: number; wounded: number } | null>(null);
  const [trackers, setTrackers] = useState<[TrackerState, TrackerState]>([emptyTracker(), emptyTracker()]);
  const [flash, setFlash] = useState(0);
  const [scored, setScored] = useState<FinishResult | null>(null);
  const { line, speak } = useSpeech();
  const serverId = useRef<string | null>(null);
  const events = useRef<TranscriptEvent[]>([]);
  const [round, setRound] = useState(0);

  const turn = match.turn;
  const active = stage === "play" && ready && !last && match.winner === null;

  const finish = (m: MatchState) => {
    if (m.winner === null) return;
    void finishScored(serverId.current, secrets, events.current).then(setScored);
    speak(m.winner === 1 ? "lose" : "win");
  };

  const onGuess = (guess: string) => {
    const fb = scoreGuess(secrets[turn === 0 ? 1 : 0], guess);
    events.current.push({ p: turn, g: guess });
    const next = applyGuess(match, turn, guess, fb);
    setMatch(next);
    setLast({ p: turn, guess, ...fb });
    if (fb.dead === 0 && fb.wounded === 0) {
      setFlash((f) => f + 1);
      speak("zero");
    } else if (fb.dead === length - 1 && length >= 4) speak("close");
    else if (fb.dead === 0) speak("wounded");
    finish(next);
  };

  const left = useCountdown(timer, active && timer > 0, match.moves[0].length + match.moves[1].length, () => {
    events.current.push({ p: turn, g: null });
    const next = skipTurn(match);
    setMatch(next);
    setReady(false);
    if (next.winner !== null) {
      setStage("result");
      finish(next);
    }
  });
  useEffect(() => {
    if (active && timer > 0 && left === 5) speak("hurry");
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const lock = (code: string) => {
    const s: [string, string] = [...secrets] as [string, string];
    s[secretTurn] = code;
    setSecrets(s);
    setReady(false);
    if (secretTurn === 0) return setSecretTurn(1);
    setStage("play");
    events.current = [];
    void startScored("pass", length).then((id) => (serverId.current = id));
  };

  const rematch = () => {
    setStage("secret");
    setSecretTurn(0);
    setSecrets(["", ""]);
    setMatch(newMatch(length));
    setLast(null);
    setReady(false);
    setScored(null);
    setTrackers([emptyTracker(), emptyTracker()]);
    setRound((r) => r + 1);
  };

  /* ---------- screens ---------- */
  if (stage === "secret") {
    return ready ? (
      <SecretEntry key={`${round}-${secretTurn}`} length={length} who={names[secretTurn]} onLock={lock} />
    ) : (
      <HandPhone to={names[secretTurn]} onReady={() => setReady(true)} note={secretTurn === 1 ? "Player 1 has locked a secret. Now Player 2 picks theirs." : undefined} />
    );
  }

  if (stage === "result") {
    const w = match.winner;
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        {w !== "draw" && <Confetti />}
        <KpaiStamp text={w === "draw" ? "DRAW!" : "KPAI!"} />
        <p className="font-display text-2xl">{w === "draw" ? "Both of una crack am!" : `${names[w as 0 | 1]} wins!`}</p>
        <SpeechBubble line={line} />
        <div className="card p-4 w-full grid grid-cols-2 gap-3">
          {[0, 1].map((p) => (
            <div key={p}>
              <div className="text-xs text-white/50 uppercase truncate">{names[p]}</div>
              <div className="font-num text-3xl font-black text-gold">{secrets[p]}</div>
              <div className="text-xs text-white/60">{match.moves[p].length} guesses</div>
            </div>
          ))}
        </div>
        {scored && <div className="card p-3 w-full" role="status">{scored.rejected ? "Game too short to count for points." : <>{names[0]} gets <b className="text-gold">+{scored.points} KPAI Points</b> 🏆</>}</div>}
        <div className="grid grid-cols-2 gap-3 w-full">
          <button className="btn btn-green" onClick={rematch}>Rematch</button>
          <Link href="/" className="btn btn-dark">Back home</Link>
        </div>
      </div>
    );
  }

  // Feedback screen right after a guess: only the guesser's own result is shown.
  if (last) {
    const over = match.winner !== null;
    return (
      <div className="flex flex-col items-center gap-4 text-center mt-4">
        <RedFlash k={flash} />
        <div className="text-white/60">{names[last.p]} guessed</div>
        <div className="font-num text-5xl font-black text-gold tracking-widest">{last.guess}</div>
        <div className="text-4xl"><FeedbackIcons dead={last.dead} wounded={last.wounded} /></div>
        <div className="font-display text-2xl">{feedbackText(last.dead, last.wounded)}</div>
        <SpeechBubble line={line} />
        {over ? (
          <button className="btn btn-gold w-full h-14 font-display text-xl" onClick={() => { setLast(null); setStage("result"); }}>See result</button>
        ) : (
          <button className="btn btn-green w-full h-14 font-display text-xl" onClick={() => { setLast(null); setReady(false); }}>
            Hand phone to {names[match.turn]}
          </button>
        )}
      </div>
    );
  }

  if (!ready) return <HandPhone to={names[turn]} onReady={() => setReady(true)} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-3 flex items-center">
        <div>
          <div className="font-display text-lg">{names[turn]}&apos;s turn</div>
          <div className="text-xs text-white/60">Guess {names[turn === 0 ? 1 : 0]}&apos;s code</div>
        </div>
        <div className="ml-auto text-right">
          {timer > 0 && <div className={`font-num text-2xl font-black ${left <= 5 ? "text-blood" : "text-gold"}`}>{left}s</div>}
          <div className="text-xs text-white/60">Guesses: {match.moves[turn].length}</div>
        </div>
      </div>
      {match.finalTurn && <div className="rounded-xl bg-gold text-ink font-bold text-center p-2">Fairness rule: last turn for {names[1]}!</div>}
      <HistoryPanel moves={match.moves[turn]} />
      <SpeechBubble line={line} />
      <CodeInput length={length} submitLabel="Shoot! 🔫" onSubmit={onGuess} shakeKey={flash} onInvalid={(w) => w === "repeat" && speak("invalid")} />
      <DigitTracker value={trackers[turn]} onChange={(t) => setTrackers((cur) => (turn === 0 ? [t, cur[1]] : [cur[0], t]))} />
    </div>
  );
}
