import { TITLES } from "@/lib/game";

const COLORS: Record<string, string> = {
  Learner: "bg-white/10 text-white/70",
  "Street Sharp": "bg-sky-500/20 text-sky-300",
  "Area Champion": "bg-naija/25 text-naija",
  Oga: "bg-gold/25 text-gold",
  "Kpai Master": "bg-blood/25 text-red-300",
};

export default function TitleBadge({ title }: { title?: string | null }) {
  const t = TITLES.find((x) => x.name === title) ?? TITLES[0];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${COLORS[t.name]}`} title={`${t.name} (${t.min}+ points)`}>
      <span aria-hidden>{t.emoji}</span>
      {t.name}
    </span>
  );
}
