"use client";
import { m } from "framer-motion";

/** Re-mounts on every navigation, giving each screen a quick slide-in. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <m.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>
      {children}
    </m.div>
  );
}
