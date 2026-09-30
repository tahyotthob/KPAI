"use client";

/** Full-screen red flash; remount with a new `k` to replay. */
export default function RedFlash({ k }: { k: number }) {
  if (!k) return null;
  return <div key={k} className="redflash pointer-events-none fixed inset-0 z-30" aria-hidden />;
}
