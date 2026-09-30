"use client";
import Link from "next/link";
import MuteToggle from "./MuteToggle";

export default function Header({ title, right }: { title?: string; right?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 py-3">
      <Link href="/" className="btn btn-dark !py-2 !px-3 text-sm" aria-label="Home">← Home</Link>
      <div className="font-display text-xl text-gold truncate">{title ?? "KPAI!"}</div>
      <div className="flex items-center gap-2">{right}<MuteToggle /></div>
    </header>
  );
}
