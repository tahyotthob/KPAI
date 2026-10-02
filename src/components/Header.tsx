"use client";
import Link from "next/link";
import { useLeaveGuard } from "@/lib/leaveGuard";
import MuteToggle from "./MuteToggle";
import StreakPill from "./StreakPill";

export default function Header({ title, right }: { title?: string; right?: React.ReactNode }) {
  const guard = useLeaveGuard();
  return (
    <header className="flex items-center justify-between gap-2 py-3">
      <Link
        href="/"
        className="btn btn-dark !py-2 !px-3 text-sm"
        aria-label="Home"
        onClick={(e) => {
          if (guard && !window.confirm("Leave this game? Your progress go dey lost.")) e.preventDefault();
        }}
      >
        ← Home
      </Link>
      <div className="font-display text-lg text-gold truncate">{title ?? "KPAI!"}</div>
      <div className="flex items-center gap-2">
        {right}
        <StreakPill />
        <MuteToggle />
      </div>
    </header>
  );
}
