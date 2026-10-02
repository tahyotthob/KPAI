import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center flex flex-col items-center gap-5">
      <div className="text-7xl" aria-hidden>🤷🏾</div>
      <h1 className="font-display text-4xl text-gold">404 — E no dey here</h1>
      <p className="text-white/75">This page don japa. Even Oga Kpai no fit find am.</p>
      <Link href="/" className="btn btn-gold tilt-l">Carry me go Home</Link>
    </main>
  );
}
