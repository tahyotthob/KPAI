"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AGENTS } from "@/lib/agents";
import { useAgent } from "@/lib/ai/useAgent";
import { applyGuess, newMatch, randomCode, scoreGuess, skipTurn } from "@/lib/game";
import type { MatchState, Move, TranscriptEvent } from "@/lib/game";
import { finishScored, startScored, type FinishResult } from "@/lib/scoring-client";
import { readLS, writeLS } from "@/hooks/useLocalStorage";
import { useCountdown } from "@/hooks/useCountdown";
import Avatar from "./Avatar";
import CodeInput from "./CodeInput";
import DigitTracker, { emptyTracker, type TrackerState } from "./DigitTracker";
import HistoryPanel from "./HistoryPanel";
import SpeechBubble from "./SpeechBubble";
import MoveNotice, { type Notice } from "./MoveNotice";
import Confetti from "./Confetti";
import KpaiStamp from "./KpaiStamp";
import GuessBurst, { type Burst } from "./GuessBurst";
import TimerRing from "./TimerRing";
import AnimatedNumber from "./AnimatedNumber";
import LoseBanner from "./LoseBanner";
import RedFlash from "./RedFlash";
import { useSpeech } from "@/hooks/useSpeech";
import type { Settings } from "./GameSetup";

type Phase = "secret" | "play" | "result";

export default function LocalGame({ mode, settings, nickname }: { mode: "computer" | "practice"; settings: Settings; nickname: string }) {
  const { length, timer, level } = settings;
  const agent = AGENTS[level];
  const think = useAgent();

  const [gameId, setGameId] = useState(() => Math.random().toString(36).slice(2));
  const [phase, setPhase] = useState<Phase>(mode === "practice" ? "play" : "secret");
  const [mySecret, setMySecret] = useState("");
  const mySecretRef = useRef("");
  const cpuSecret = useRef(randomCode(length));
  const [match, setMatch] = useState<MatchState>(() => newMatch(length));
  const [thinking, setThinking] = useState(false);
  const [view, setView] = useState<"me" | "them">("me");
  const [tracker, setTracker] = useState<TrackerState>(emptyTracker());
  const token = useRef(0);
  const { line, speak } = useSpeech();
  const serverId = useRef<string | null>(null);
  const events = useRef<TranscriptEvent[]>([]);
  const [scored, setScored] = useState<FinishResult | null>(null);
  const [flash, setFlash] = useState(0);
  const hurried = useRef(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [burst, setBurst] = useState<Burst | null>(null);
  const closeBurst = useCallback(() => setBurst(null), []);
  const closeNotice = useCallback(() => setNotice(null), []);

  const react = useCallback(
    (dead: number, wounded: number) => {
      if (dead === 0 && wounded === 0) {
        setFlash((f) => f + 1);
        speak("zero");
      } else if (dead === length - 1 && length >= 4) speak("close");
      else if (dead === 0) speak("wounded");
    },
    [length, speak],
  );

  // Register the start of a scored game (best effort; the game works fully offline).
  useEffect(() => {
    if (phase !== "play") return;
    let live = true;
    serverId.current = null;
    events.current = [];
    setScored(null);
    void startScored(mode, length, mode === "computer" ? level : undefined).then((id) => {
      if (live) serverId.current = id;
    });
    return () => void (live = false);
  }, [phase === "play", gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setTracker(readLS(`kpai:tracker:${gameId}`, emptyTracker())), [gameId]);
  const updateTracker = (t: TrackerState) => {
    setTracker(t);
    writeLS(`kpai:tracker:${gameId}`, t);
  };

  const myTurn = phase === "play" && match.turn === 0 && match.winner === null && !thinking;

  const finishIf = useCallback(
    (m: MatchState) => {
      if (m.winner === null) return;
      setPhase("result");
      const secrets = mode === "practice" ? [cpuSecret.current] : [mySecretRef.current, cpuSecret.current];
      void finishScored(serverId.current, secrets, events.current).then(setScored);
      speak(m.winner === 1 ? "lose" : "win");
    },
    [speak, mode],
  );

  const runCpuTurn = useCallback(
    async (m: MatchState) => {
      if (mode !== "computer" || m.winner !== null || m.turn !== 1) return;
      const my = ++token.current;
      setThinking(true);
      const guess = await think(level, length, m.moves[1]);
      if (my !== token.current) return;
      setThinking(false);
      events.current.push({ p: 1, g: guess });
      const fb = scoreGuess(mySecret, guess);
      const next = applyGuess(m, 1, guess, fb);
      setMatch(next);
      if (fb.dead !== length) {
        const round = next.moves[1].length;
        const mine = next.moves[0][round - 1];
        setNotice({ id: Date.now(), who: agent.name, guess, ...fb, round, mine: mine ?? null, yourTurn: next.winner === null });
      }
      finishIf(next);
    },
    [mode, think, level, length, mySecret, finishIf, agent.name],
  );

  const onGuess = (guess: string) => {
    if (!myTurn) return;
    const fb = scoreGuess(cpuSecret.current, guess);
    if (fb.dead !== length) {
      react(fb.dead, fb.wounded);
      setBurst({ id: Date.now(), dead: fb.dead, wounded: fb.wounded, close: fb.dead === length - 1 && length >= 4 });
    }
    events.current.push({ p: 0, g: guess });
    if (mode === "practice") {
      // Practice: solo. Only player 0 ever guesses.
      const moves: [Move[], Move[]] = [[...match.moves[0], { guess, ...fb }], []];
      const done = fb.dead === length;
      const m: MatchState = { ...match, moves, winner: done ? 0 : null };
      setMatch(m);
      finishIf(m);
      return;
    }
    const next = applyGuess(match, 0, guess, fb);
    setMatch(next);
    finishIf(next);
    void runCpuTurn(next);
  };

  const left = useCountdown(timer, myTurn && timer > 0 && mode === "computer", match.moves[0].length, () => {
    events.current.push({ p: 0, g: null });
    const next = skipTurn(match);
    setMatch(next);
    finishIf(next);
    void runCpuTurn(next);
  });

  useEffect(() => {
    if (myTurn && timer > 0 && left <= 5 && left > 0 && !hurried.current) {
      hurried.current = true;
      speak("hurry");
    }
    if (left > 5 || !myTurn) hurried.current = false;
  }, [left, myTurn, timer, speak]);

  const lockSecret = (code: string) => {
    mySecretRef.current = code;
    setMySecret(code);
    setPhase("play");
  };

  const rematch = () => {
    token.current++;
    cpuSecret.current = randomCode(length);
    setMatch(newMatch(length));
    setMySecret("");
    setThinking(false);
    setGameId(Math.random().toString(36).slice(2));
    setTracker(emptyTracker());
    setPhase(mode === "practice" ? "play" : "secret");
  };

  useEffect(() => () => void token.current++, []);

  /* ---------- screens ---------- */
  if (phase === "secret") {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <Avatar emoji={agent.emoji} color={agent.color} />
          <div className="text-sm text-white/80"><b>{agent.name}</b> don pick im own. Now pick yours.</div>
        </div>
        <h2 className="font-display text-2xl text-gold text-center">Set your secret</h2>
        <p className="text-white/60 text-sm text-center">{length} different digits. Leading 0 is allowed.</p>
        <CodeInput length={length} masked submitLabel="Lock am 🔒" onSubmit={lockSecret} />
      </div>
    );
  }

  if (phase === "result") {
    const won = match.winner === 0;
    const draw = match.winner === "draw";
    const myGuesses = match.moves[0].length;
    return (
      <div className={`flex flex-col items-center gap-4 text-center ${won ? "bigshake" : ""}`}>
        {won && <Confetti />}
        {won || draw ? <KpaiStamp text={draw ? "DRAW!" : "KPAI!"} /> : <LoseBanner />}
        <SpeechBubble line={line} />
        <p className="text-white/80">
          {mode === "practice"
            ? `You crack am in ${myGuesses} guess${myGuesses === 1 ? "" : "es"}.`
            : draw ? "Both of una crack am. Na tie!" : won ? `You beat ${agent.name} in ${myGuesses} guesses.` : `${agent.name} crack your code in ${match.moves[1].length} guesses.`}
        </p>
        <div className="card p-4 w-full flex justify-around">
          <div><div className="text-xs text-white/50 uppercase">{mode === "practice" ? "The code" : "Your secret"}</div><div className="font-num text-3xl font-black text-gold">{mode === "practice" ? cpuSecret.current : mySecret}</div></div>
          {mode === "computer" && (
            <div><div className="text-xs text-white/50 uppercase">{agent.name}</div><div className="font-num text-3xl font-black text-gold">{cpuSecret.current}</div></div>
          )}
        </div>
        {scored && (
          <div className="card p-3 w-full" role="status">
            {scored.rejected ? "Game too short to count for points." : <>You get <b className="text-gold text-xl"><AnimatedNumber prefix="+" value={scored.points} /> KPAI Points</b> 🏆</>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 w-full">
          <button className="btn btn-green" onClick={rematch}>Rematch</button>
          <Link href="/" className="btn btn-dark">Back home</Link>
        </div>
      </div>
    );
  }

  const shownMoves = view === "me" ? match.moves[0] : match.moves[1];
  const last = match.moves[0][match.moves[0].length - 1];
  return (
    <div className="flex flex-col gap-4">
      {/* Turn bar */}
      <div className="card p-3 flex items-center gap-3">
        {mode === "computer" ? (
          <>
            <Avatar emoji={agent.emoji} color={agent.color} thinking={thinking} active={thinking} />
            <div className="min-w-0">
              <div className="font-display truncate">{agent.name}</div>
              <div className="text-xs text-white/60"><span className="inline-block w-2 h-2 rounded-full bg-naija mr-1" />online · {thinking ? "thinking…" : myTurn ? "your turn" : "waiting"}</div>
            </div>
          </>
        ) : (
          <div>
            <div className="font-display">Practice · {nickname || "You"}</div>
            <div className="text-xs text-white/60">Guess the secret {length}-digit code</div>
          </div>
        )}
        <div className="ml-auto text-right">
          {timer > 0 && mode === "computer" && myTurn && <TimerRing left={left} total={timer} />}
          <div className="text-xs text-white/60">Guesses: {match.moves[0].length}</div>
        </div>
      </div>

      {match.finalTurn && <div className="rounded-xl bg-gold text-ink font-bold text-center p-2">Fairness rule: last turn for {agent.name}!</div>}

      {mode === "computer" && (
        <div className="grid grid-cols-2 gap-2">
          <button className={`btn ${view === "me" ? "btn-gold" : "btn-dark"} !py-2`} onClick={() => setView("me")}>Your guesses</button>
          <button className={`btn ${view === "them" ? "btn-gold" : "btn-dark"} !py-2`} onClick={() => setView("them")}>{agent.name}&apos;s</button>
        </div>
      )}
      <HistoryPanel moves={shownMoves} />
      {last && view === "me" && last.dead === 0 && last.wounded === 0 && <div className="text-center text-white/60 text-sm">Nothing. Try different digits.</div>}

      <SpeechBubble line={line} />
      <MoveNotice notice={notice} onClose={closeNotice} />
      <GuessBurst burst={burst} onDone={closeBurst} />
      <RedFlash k={flash} />
      <CodeInput length={length} submitLabel="Shoot! 🔫" onSubmit={onGuess} disabled={!myTurn} shakeKey={flash} onInvalid={(w) => w === "repeat" && speak("invalid")} />
      <DigitTracker value={tracker} onChange={updateTracker} />
    </div>
  );
}
