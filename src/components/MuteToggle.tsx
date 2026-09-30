"use client";
import { useEffect, useState } from "react";
import { isMuted, setMuted, subscribeMute } from "@/lib/audio/manager";

export default function MuteToggle() {
  const [muted, setM] = useState(false);
  useEffect(() => {
    setM(isMuted());
    return subscribeMute(() => setM(isMuted()));
  }, []);
  return (
    <button className="btn btn-dark !py-2 !px-3 text-lg" onClick={() => setMuted(!muted)} aria-label={muted ? "Unmute" : "Mute"} aria-pressed={muted}>
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
