"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AGENTS } from "@/lib/agents";
import { useAgent } from "@/lib/ai/useAgent";
import { applyGuess, newMatch, randomCode, scoreGuess, skipTurn } from "@/lib/game";
import type { MatchState, Move, TranscriptEvent } from "@/lib/game";
import { useGuardWhile } from "@/lib/leaveGuard";
import { recordGameEnd } from "@/lib/progress";
import { finishScored, startScored, type FinishResult } from "@/lib/scoring-client";
import { pickTaunt, type TauntTrigger } from "@/lib/taunts";
import { haptic } from "@/lib/toast";
import { readLS, writeLS } from "@/hooks/useLocalStorage";
import { useCountdown } from "@/hooks/useCountdown";
import { useSpeech } from "@/hooks/useSpeech";
import AnimatedNumber from "./AnimatedNumber";
import Avatar from "./Avatar";
import CodeInput from "./CodeInput";
import Confetti from "./Confetti";
import DigitTracker, { emptyTracker, type TrackerState } from "./DigitTracker";
import GuessBurst, { type Burst } from "./GuessBurst";
import HistoryPanel from "./HistoryPanel";
import KpaiStamp from "./KpaiStamp";
import LoseBanner from "./LoseBanner";
import MoveNotice, { type Notice } from "./MoveNotice";
import RedFlash from "./RedFlash";
import SpeechBubble from "./SpeechBubble";
import TauntBubble, { type Taunt } from "./TauntBubble";
import TimerRing from "./TimerRing";
import type { Settings } from "./GameSetup";

type Phase = "secret" | "play" | "result";

export interface LocalGameResult {
  won: boolean;
  moves: Move[];
}

interface Props {
  mode: "computer" | "practice";
  settings: Settings;
  nickname: string;
  /** Daily Kpai: everyone gets the same code. No rematch, no leaderboard points. */
  fixedSecret?: string;
  daily?: boolean;
  onDone?: (r: LocalGameResult) => void;
  /** extra content on the result screen (e.g. Share button) */
  resultExtra?: React.ReactNode;
}

export default function LocalGame({ mode, settings, nickname, fixedSecret, daily, onDone, resultExtra }: Props) {
  const { length, timer, level } = settings;
  const agent = AGENTS[level];
  const think = useAgent();
  const scoreable = !fixedSecret;

  const [gameId, setGameId] = useState(() => Math.random().toString(36).slice(2));
  const [phase, setPhase] = useState<Phase>(mode === "practice" ? "play" : "secret");
  const [mySecret, setMySecret] = useState("");
  const mySecretRef = useRef("");
  const cpuSecret = useRef(fixedSecret ?? randomCode(length));
  const [match, setMatch] = useState<MatchState>(() => newMatch(length));
  const [thinking, setThinking] = useState(false);
  const [view, setView] = useState<"me" | "them">("me");
  const [tracker, setTracker] = useState<TrackerState>(emptyTracker());
  const token = useRef(0);
  const { line, speak } = useSpeech();
  const startP = useRef<Promise<string | null> | null>(null);
  const events = useRef<TranscriptEvent[]>([]);
  const [scored, setScored] = useState<FinishResult | null>(null);
  const [flash, setFlash] = useState(0);
  const hurried = useRef(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [burst, setBurst] = useState<Burst | null>(null);
  const [taunt, setTaunt] = useState<Taunt | null>(null);
  const zeroRun = useRef(0);
  const ended = useRef(false);
  const startedAt = useRef(0);
  const [secs, setSecs] = useState(0);
  const closeBurst = useCallback(() => setBurst(null), []);
  const closeNotice = useCallback(() => setNotice(null), []);

  useGuardWhile(phase === "play" && match.winner === null);

  const say = useCallback(
    (trigger: TauntTrigger) => {
      if (mode !== "computer") return;
      setTaunt({ id: Date.now(), text: pickTaunt(level, trigger) });
    },
    [mode, level],
  );
  useEffect(() => {
    if (!taunt) return;
    const t = setTimeout(() => setTaunt(null), 5000);
    return () => clearTimeout(t);
  }, [taunt]);

  const react = useCallback(
    (dead: number, wounded: number) => {
      if (dead === 0 && wounded === 0) {
        setFlash((f) => f + 1);
        speak("zero");
        haptic([70, 40, 70]);
      } else if (dead === length - 1 && length >= 4) {
        speak("close");
        haptic(60);
      } else if (dead === 0) speak("wounded");
      else haptic(20);
    },
    [length, speak],
  );

  // Entering the play phase: register a scored game (best effort), reset per-game bookkeeping.
  useEffect(() => {
    if (phase !== "play") return;
    events.current = [];
    ended.current = false;
    zeroRun.current = 0;
    startedAt.current = Date.now();
    setScored(null);
    startP.current = scoreable ? startScored(mode, length, mode === "computer" ? level : undefined) : null;
    if (mode === "computer") setTaunt({ id: Date.now(), text: pickTaunt(level, "start") });
  }, [phase === "play", gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setTracker(readLS(`kpai:tracker:${gameId}`, emptyTracker())), [gameId]);
  const updateTracker = (t: TrackerState) => {
    setTracker(t);
    writeLS(`kpai:tracker:${gameId}`, t);
  };

  const myTurn = phase === "play" && match.turn === 0 && match.winner === null && !thinking;

  const finishIf = useCallback(
    (m: MatchState) => {
      if (m.winner === null || ended.current) return;
      ended.current = true;
      setPhase("result");
      setSecs(Math.round((Date.now() - startedAt.current) / 1000));
      const won = m.winner === 0;
      const draw = m.winner === "draw";
      const secrets = mode === "practice" ? [cpuSecret.current] : [mySecretRef.current, cpuSecret.current];
      if (scoreable) {
        const p = startP.current ?? Promise.resolve(null);
        void p.then((id) => finishScored(id, secrets, events.current)).then(setScored);
      }
      speak(m.winner === 1 ? "lose" : "win");
      if (mode === "computer") setTaunt({ id: Date.now(), text: pickTaunt(level, won ? "aiLoses" : draw ? "aiLoses" : "aiWins") });
      onDone?.({ won, moves: m.moves[0] }); // first: the Daily page saves its streak before badges are evaluated
      recordGameEnd({ mode: daily ? "daily" : mode, outcome: won ? "win" : draw ? "draw" : "lose", guesses: m.moves[0].length, length, level: mode === "computer" ? level : undefined });
    },
    [speak, mode, scoreable, level, length, daily, onDone],
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
        if (fb.dead === length - 1) say("aiClose");
      }
      finishIf(next);
    },
    [mode, think, level, length, mySecret, finishIf, agent.name, say],
  );

  const onGuess = (guess: string) => {
    if (!myTurn) return;
    const fb = scoreGuess(cpuSecret.current, guess);
    if (fb.dead !== length) {
      react(fb.dead, fb.wounded);
      setBurst({ id: Date.now(), dead: fb.dead, wounded: fb.wounded, close: fb.dead === length - 1 && length >= 4 });
      zeroRun.current = fb.dead === 0 && fb.wounded === 0 ? zeroRun.current + 1 : 0;
      if (zeroRun.current >= 3) {
        zeroRun.current = 0;
        say("playerMiss3");
      } else if (fb.dead >= length - 1 && fb.dead > 0) say("playerClose");
    }
    events.current.push({ p: 0, g: guess });
    if (mode === "practice") {
      // Practice / daily: solo. Only player 0 ever guesses.
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
    setNotice(null);
    setBurst(null);
    setTaunt(null);
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
        <p className="text-white/70 text-sm text-center">{length} different digits. Leading 0 is allowed.</p>
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
        <p className="text-white/85">
          {mode === "practice"
            ? `You crack am in ${myGuesses} guess${myGuesses === 1 ? "" : "es"}.`
            : draw ? "Both of una crack am. Na tie!" : won ? `You beat ${agent.name} in ${myGuesses} guesses.` : `${agent.name} crack your code in ${match.moves[1].length} guesses.`}
        </p>
        {mode === "computer" && <div className="w-full text-left"><TauntBubble agent={agent} taunt={taunt} /></div>}
        <div className="card p-4 w-full flex justify-around">
          <div><div className="text-xs text-white/60 uppercase">{mode === "practice" ? "The code" : "Your secret"}</div><div className="font-num text-3xl text-gold">{mode === "practice" ? cpuSecret.current : mySecret}</div></div>
          {mode === "computer" && (
            <div><div className="text-xs text-white/60 uppercase">{agent.name}</div><div className="font-num text-3xl text-gold">{cpuSecret.current}</div></div>
          )}
          <div><div className="text-xs text-white/60 uppercase">Time</div><div className="font-num text-3xl text-acid">{secs}s</div></div>
        </div>
        {scored && (
          <div className="card p-3 w-full" role="status">
            {scored.rejected ? "This one no count for points (too quick or too lucky)." : <>You get <b className="text-gold text-xl"><AnimatedNumber prefix="+" value={scored.points} /> KPAI Points</b> 🏆</>}
          </div>
        )}
        {resultExtra}
        <div className={`grid gap-3 w-full ${fixedSecret ? "grid-cols-1" : "grid-cols-2"}`}>
          {!fixedSecret && <button className="btn btn-hot tilt-l" onClick={rematch}>Run am back 🔁</button>}
          <Link href="/" className="btn btn-dark">Back home</Link>
        </div>
      </div>
    );
  }

  const shownMoves = view === "me" ? match.moves[0] : match.moves[1];
  return (
    <div className="flex flex-col gap-3">
      {/* Turn bar */}
      <div className="card p-3 flex items-center gap-3">
        {mode === "computer" ? (
          <>
            <Avatar emoji={agent.emoji} color={agent.color} thinking={thinking} active={thinking} />
            <div className="min-w-0">
              <div className="font-display truncate">{agent.name}</div>
              <div className="text-xs text-white/70"><span className="inline-block w-2 h-2 rounded-full bg-naija mr-1" />online · {thinking ? "thinking…" : myTurn ? "your turn" : "waiting"}</div>
            </div>
          </>
        ) : (
          <div>
            <div className="font-display">{daily ? "Daily Kpai" : "Practice"} · {nickname || "You"}</div>
            <div className="text-xs text-white/70">Guess the secret {length}-digit code</div>
          </div>
        )}
        <div className="ml-auto text-right">
          {timer > 0 && mode === "computer" && myTurn && <TimerRing left={left} total={timer} />}
          <div className="text-xs text-white/70">Guesses: {match.moves[0].length}</div>
        </div>
      </div>

      {mode === "computer" && <TauntBubble agent={agent} taunt={taunt} />}
      {match.finalTurn && <div className="rounded-xl bg-gold text-ink font-bold text-center p-2">Fairness rule: last turn for {agent.name}!</div>}

      {mode === "computer" && (
        <div className="grid grid-cols-2 gap-2">
          <button aria-pressed={view === "me"} className={`btn ${view === "me" ? "btn-gold" : "btn-dark"} !py-2`} onClick={() => setView("me")}>Your guesses</button>
          <button aria-pressed={view === "them"} className={`btn ${view === "them" ? "btn-gold" : "btn-dark"} !py-2`} onClick={() => setView("them")}>{agent.name}&apos;s</button>
        </div>
      )}
      <HistoryPanel moves={shownMoves} />

      <SpeechBubble line={line} />
      <MoveNotice notice={notice} onClose={closeNotice} />
      <GuessBurst burst={burst} onDone={closeBurst} />
      <RedFlash k={flash} />
      <CodeInput length={length} submitLabel="Shoot! 🔫" onSubmit={onGuess} disabled={!myTurn} shakeKey={flash} onInvalid={(w) => w === "repeat" && speak("invalid")} />
      <DigitTracker value={tracker} onChange={updateTracker} />
    </div>
  );
}
