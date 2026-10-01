"use client";
import { LazyMotion, MotionConfig } from "framer-motion";

const loadFeatures = () => import("./motionFeatures").then((mod) => mod.default);

/** Lazy-loaded animation features (smaller bundle) + automatic reduced-motion support. */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
