"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, getSupabase } from "@/lib/supabase/client";
import { useOnlineGame } from "@/hooks/useOnlineGame";
import { usePlayer } from "@/hooks/usePlayer";
import { readLS, writeLS } from "@/hooks/useLocalStorage";
import { useSpeech } from "@/hooks/useSpeech";
import Avatar from "./Avatar";
import CodeInput from "./CodeInput";
import Confetti from "./Confetti";
import DigitTracker, { emptyTracker, type TrackerState } from "./DigitTracker";
import HistoryPanel from "./HistoryPanel";
import KpaiStamp from "./KpaiStamp";
import RedFlash from "./RedFlash";
import SecretEntry from "./SecretEntry";
import ShareRoom from "./ShareRoom";
import SpeechBubble from "./SpeechBubble";
import TitleBadge from "./TitleBadge";

const ERRORS: Record<string, string> = {
  not_your_turn: "E never reach your turn.",
  time_up: "Time don finish — turn don pass.",
  move_conflict: "Try again, network wahala.",
  not_playing: "Game no dey active.",
};

export default function OnlineGame({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { profile } = usePlayer();
  const myId = profile?.id;
  const { game, moves, slot, opponent, me, error, refresh } = useOnlineGame(gameId, myId);
  const { line, speak } = useSpeech();

  const [tracker, setTracker] = useState<TrackerState>(emptyTracker());
  const [view, setView] = useState<"me" | "them">("me");
  const [flash, setFlash] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [reveal, setReveal] = useState<[string | null, string | null] | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const spoke = useRef<string>("");

  useEffect(() => setTracker(readLS(`kpai:tracker:${gameId}`, emptyTracker())), [gameId]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const status = game?.status;
  const myTurn = status === "playing" && slot !== null && game?.current_turn === slot;

  /* ---- turn timer (server re-checks the clock, so this is only a display + trigger) ---- */
  const secondsLeft =
    game && status === "playing" && game.turn_seconds && game.turn_started_at
      ? Math.max(0, Math.ceil(game.turn_seconds - (now - new Date(game.turn_started_at).getTime()) / 1000))
      : null;
  const skipTries = useRef(0);
  useEffect(() => {
    if (secondsLeft !== 0) return void (skipTries.current = 0);
    if (skipTries.current > 6) return;
    const t = setTimeout(() => {
      skipTries.current++;
      api(`/api/games/${gameId}/skip`, {}).then(() => refresh()).catch(() => {});
    }, 500 + skipTries.current * 1200);
    return () => clearTimeout(t);
  }, [secondsLeft, gameId, refresh, now]);
  const hurried = useRef(false);
  useEffect(() => {
    if (myTurn && secondsLeft !== null && secondsLeft <= 5 && secondsLeft > 0 && !hurried.current) {
      hurried.current = true;
      speak("hurry");
    }
    if (!myTurn || (secondsLeft ?? 99) > 5) hurried.current = false;
  }, [myTurn, secondsLeft, speak]);

  /* ---- finished: reveal secrets + points, speak once ---- */
  useEffect(() => {
    if (status !== "finished" || !myId) return;
    const outcome = game!.winner_id === myId ? "win" : game!.winner_id ? "lose" : "draw";
    if (spoke.current !== gameId) {
      spoke.current = gameId;
      speak(outcome === "lose" ? "lose" : "win");
    }
    api<{ secrets: [string | null, string | null] }>(`/api/games/${gameId}/reveal`).then((r) => setReveal(r.secrets)).catch(() => {});
    getSupabase()
      ?.from("score_events").select("points").eq("game_id", gameId).eq("player_id", myId).maybeSingle()
      .then(({ data }) => setPoints(data ? (data.points as number) : 0));
  }, [status, gameId, myId]); // eslint-disable-line react-hooks/exhaustive-deps

  const say = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };
  const call = useCallback(
    async <T,>(path: string, body: unknown = {}): Promise<T | null> => {
      try {
        return await api<T>(path, body);
      } catch (e) {
        say(e instanceof ApiError ? (ERRORS[e.code] ?? "Something no work. Try again.") : "Network wahala. Try again.");
        void refresh();
        return null;
      }
    },
    [refresh],
  );

  if (error === "not_found") return <p className="card p-5 text-center">This room no dey exist (or you no dey inside).</p>;
  if (!game || slot === null) return <p className="text-center text-white/60 py-10">Loading room…</p>;
  const len = game.digit_length;
  const oppName = opponent?.nickname ?? "Friend";

  /* ---------------- waiting for player 2 ---------------- */
  if (game.status === "waiting") {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <h2 className="font-display text-2xl text-gold">Waiting for your friend…</h2>
        <ShareRoom code={game.room_code ?? ""} />
        <p className="text-white/60 text-sm">{len} digits · timer {game.turn_seconds ? `${game.turn_seconds}s` : "off"}. Rooms expire after 24 hours.</p>
      </div>
    );
  }

  /* ---------------- both set secrets ---------------- */
  if (game.status === "setting_secrets") {
    const mine = slot === 0 ? game.p1_ready : game.p2_ready;
    const theirs = slot === 0 ? game.p2_ready : game.p1_ready;
    if (!mine)
      return (
        <div className="flex flex-col gap-3">
          <p className="text-center text-white/70">Playing against <b>{oppName}</b> {theirs && "· dem don lock dem own ✅"}</p>
          <SecretEntry length={len} busy={busy} onLock={async (s) => {
            setBusy(true);
            await call(`/api/games/${gameId}/secret`, { secret: s });
            setBusy(false);
            void refresh();
          }} />
          {toast && <p className="text-center text-blood">{toast}</p>}
        </div>
      );
    return (
      <div className="card p-6 text-center flex flex-col gap-3 items-center">
        <div className="text-5xl">🔒</div>
        <p className="font-display text-xl text-gold">Your secret don lock.</p>
        <p className="text-white/70">Waiting for {oppName} to lock theirs…</p>
        <Claim game={game} slot={slot} now={now} onClaim={async () => { await call(`/api/games/${gameId}/claim`); void refresh(); }} />
      </div>
    );
  }

  /* ---------------- finished ---------------- */
  if (game.status === "finished") {
    const won = game.winner_id === myId;
    const draw = !game.winner_id;
    const oppSlot = slot === 0 ? 1 : 0;
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        {won && <Confetti />}
        {won || draw ? <KpaiStamp text={draw ? "DRAW!" : "KPAI!"} /> : <div className="font-display text-5xl text-gold">DEM DON KPAI YOU</div>}
        <SpeechBubble line={line} />
        <p className="text-white/80">
          {game.result === "forfeit" ? (won ? `${oppName} left the game. You win by walkover.` : "You left the game.")
            : draw ? "Both of una crack am. Na tie!" : won ? `You beat ${oppName} in ${moves[slot].length} guesses.` : `${oppName} crack your code in ${moves[oppSlot].length} guesses.`}
        </p>
        <div className="card p-4 w-full grid grid-cols-2 gap-3">
          <div><div className="text-xs text-white/50 uppercase">Your secret</div><div className="font-num text-3xl font-black text-gold">{reveal?.[slot] ?? "…"}</div></div>
          <div><div className="text-xs text-white/50 uppercase truncate">{oppName}</div><div className="font-num text-3xl font-black text-gold">{reveal?.[oppSlot] ?? "…"}</div></div>
        </div>
        {points !== null && <div className="card p-3 w-full" role="status">You get <b className="text-gold">+{points} KPAI Points</b> 🏆</div>}
        <div className="grid grid-cols-2 gap-3 w-full">
          {game.rematch_game_id ? (
            <button className="btn btn-gold" onClick={() => router.push(`/online/game/${game.rematch_game_id}`)}>Join rematch ▶</button>
          ) : (
            <button className="btn btn-green" disabled={busy} onClick={async () => {
              setBusy(true);
              const r = await call<{ id: string }>(`/api/games/${gameId}/rematch`);
              setBusy(false);
              if (r?.id) router.push(`/online/game/${r.id}`);
            }}>Rematch</button>
          )}
          <Link href="/" className="btn btn-dark">Back home</Link>
        </div>
        {toast && <p className="text-blood">{toast}</p>}
      </div>
    );
  }

  /* ---------------- playing ---------------- */
  const onGuess = async (guess: string) => {
    if (!myTurn || busy) return;
    setBusy(true);
    const r = await call<{ dead: number; wounded: number; winner: unknown }>(`/api/games/${gameId}/guess`, { guess });
    setBusy(false);
    if (r) {
      if (r.dead !== len) {
        if (r.dead === 0 && r.wounded === 0) { setFlash((f) => f + 1); speak("zero"); }
        else if (r.dead === len - 1 && len >= 4) speak("close");
        else if (r.dead === 0) speak("wounded");
      }
    }
    void refresh();
  };
  const updateTracker = (t: TrackerState) => {
    setTracker(t);
    writeLS(`kpai:tracker:${gameId}`, t);
  };
  const shown = view === "me" ? moves[slot] : moves[slot === 0 ? 1 : 0];

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-3 flex items-center gap-3">
        <Avatar emoji="🧑🏾" color={opponent?.online ? "#1faa59" : "#6b7280"} />
        <div className="min-w-0">
          <div className="font-display truncate">{oppName} <TitleBadge title={opponent?.title} /></div>
          <div className="text-xs text-white/60">
            <span className={`inline-block w-2 h-2 rounded-full mr-1 ${opponent?.online ? "bg-naija" : "bg-gray-500"}`} />
            {opponent?.online ? "online" : "offline"} · {myTurn ? "your turn" : "their turn"}
          </div>
        </div>
        <div className="ml-auto text-right">
          {secondsLeft !== null && <div className={`font-num text-2xl font-black ${secondsLeft <= 5 ? "text-blood" : "text-gold"}`}>{secondsLeft}s</div>}
          <div className="text-xs text-white/60">Guesses: {moves[slot].length}</div>
        </div>
      </div>

      {game.final_turn && <div className="rounded-xl bg-gold text-ink font-bold text-center p-2">Fairness rule: {game.current_turn === slot ? "your" : `${oppName}'s`} last turn!</div>}
      <Claim game={game} slot={slot} now={now} onClaim={async () => { await call(`/api/games/${gameId}/claim`); void refresh(); }} />

      <div className="grid grid-cols-2 gap-2">
        <button className={`btn ${view === "me" ? "btn-gold" : "btn-dark"} !py-2`} onClick={() => setView("me")}>{me}</button>
        <button className={`btn ${view === "them" ? "btn-gold" : "btn-dark"} !py-2`} onClick={() => setView("them")}>{oppName}</button>
      </div>
      <HistoryPanel moves={shown} />
      <SpeechBubble line={line} />
      {toast && <p className="text-center text-blood text-sm" role="alert">{toast}</p>}
      <RedFlash k={flash} />
      <CodeInput length={len} submitLabel={myTurn ? "Shoot! 🔫" : "Wait for am…"} onSubmit={onGuess} disabled={!myTurn || busy} shakeKey={flash} onInvalid={(w) => w === "repeat" && speak("invalid")} />
      <DigitTracker value={tracker} onChange={updateTracker} />
    </div>
  );
}

/** Shows a "claim the win" button once the opponent has been silent for 2+ minutes. */
function Claim({ game, slot, now, onClaim }: { game: NonNullable<ReturnType<typeof useOnlineGame>["game"]>; slot: 0 | 1; now: number; onClaim: () => void }) {
  const seen = slot === 0 ? game.last_seen_p2 : game.last_seen_p1;
  if (!seen) return null;
  const gone = (now - new Date(seen).getTime()) / 1000;
  if (gone < 120) return null;
  return (
    <button className="btn btn-red w-full" onClick={onClaim}>
      Opponent don disappear ({Math.floor(gone / 60)}m) — claim the win
    </button>
  );
}
