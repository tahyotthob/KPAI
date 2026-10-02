/** Re-mounts on every navigation, giving each screen a quick CSS slide-in (visible even before JS loads). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="enter-up">{children}</div>;
}
