/** A few slow-drifting emojis behind the UI. Pure CSS (no JS), hidden for reduced-motion users. */
const ITEMS = [
  { e: "💀", l: 6, d: 0, t: 22, s: 28 },
  { e: "🩸", l: 22, d: 6, t: 26, s: 24 },
  { e: "🔢", l: 38, d: 12, t: 30, s: 26 },
  { e: "💀", l: 54, d: 3, t: 24, s: 22 },
  { e: "🩸", l: 70, d: 9, t: 28, s: 30 },
  { e: "🎯", l: 86, d: 15, t: 25, s: 24 },
  { e: "🔢", l: 94, d: 4, t: 32, s: 20 },
];

export default function AmbientBackground() {
  return (
    <div className="ambient" aria-hidden>
      {ITEMS.map((i, k) => (
        <span key={k} style={{ left: `${i.l}%`, animationDelay: `-${i.d}s`, animationDuration: `${i.t}s`, fontSize: i.s }}>
          {i.e}
        </span>
      ))}
    </div>
  );
}
