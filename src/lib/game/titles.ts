export interface Title {
  name: string;
  min: number;
  emoji: string;
}

export const TITLES: Title[] = [
  { name: "Learner", min: 0, emoji: "🌱" },
  { name: "Street Sharp", min: 100, emoji: "🔪" },
  { name: "Area Champion", min: 500, emoji: "🏆" },
  { name: "Oga", min: 1500, emoji: "👑" },
  { name: "Kpai Master", min: 5000, emoji: "💀" },
];

export function titleFor(points: number): Title {
  let t = TITLES[0];
  for (const x of TITLES) if (points >= x.min) t = x;
  return t;
}
