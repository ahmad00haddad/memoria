import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { staggerContainer, fadeUp } from "@/lib/animations";

export type Tool = {
  key: string;
  title: string;
  hint?: string;
  to?: string;
  external?: boolean;
  icon: React.ReactNode;
  badge?: string;
  attention?: boolean;
};

const VISITED_KEY = "memoria:visited-tools";

function readVisited(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(VISITED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function markVisited(key: string) {
  try {
    const s = readVisited();
    s.add(key);
    localStorage.setItem(VISITED_KEY, JSON.stringify([...s]));
  } catch {
    /* التخزين غير متاح — لا مشكلة */
  }
}

/**
 * فهرس أدوات مضغوط بدل ١٢ بطاقة كبيرة.
 * نقطة ذهبية "لم تجرّبيها" على الأداة التي لم تُفتح من قبل، تختفي بعد أول زيارة.
 */
export function ToolIndex({ tools }: { tools: Tool[] }) {
  const [visited, setVisited] = useState<Set<string> | null>(null);
  useEffect(() => setVisited(readVisited()), []);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
    >
      {tools.map((t) => {
        const isNew = visited !== null && !visited.has(t.key);
        const inner = (
          <>
            <div className="flex items-start justify-between gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-foreground/70 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:text-gold [&_svg]:h-[18px] [&_svg]:w-[18px]">
                {t.icon}
              </span>
              {t.badge ? (
                <span className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${t.attention ? "bg-gold/15 text-gold" : "bg-secondary text-muted-foreground"}`}>
                  {t.badge}
                </span>
              ) : isNew ? (
                <span className="flex items-center gap-1 text-[10px] text-gold" title="لم تفتحيها بعد">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                  جديد عليكِ
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{t.title}</span>
              <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-all duration-300 group-hover:-translate-x-0.5 group-hover:text-gold group-hover:opacity-100" />
            </div>
            {t.hint && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{t.hint}</p>}
          </>
        );
        const cls = "group block rounded-xl border border-border bg-card p-4 transition-colors duration-300 hover:border-gold/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";
        const onClick = () => markVisited(t.key);
        return (
          <motion.div key={t.key} variants={fadeUp}>
            {!t.to ? (
              <div className={`${cls} cursor-not-allowed opacity-50`}>{inner}</div>
            ) : t.external ? (
              <a href={t.to} className={cls} onClick={onClick}>{inner}</a>
            ) : (
              <Link to={t.to as any} className={cls} onClick={onClick}>{inner}</Link>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/** منحنى صغير يرسم نفسه مرة واحدة. */
export function Sparkline({ values, className = "" }: { values: number[]; className?: string }) {
  if (values.length < 2 || values.every((v) => v === 0)) return null;
  const w = 120, h = 32, pad = 2;
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (values.length - 1);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  // الأشهر من الأقدم للأحدث؛ نعكس أفقياً ليقرأ من اليمين في الواجهة العربية
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`h-8 w-[120px] -scale-x-100 text-gold ${className}`} aria-hidden>
      <path d={`${d} L${lx},${h} L${pts[0][0]},${h} Z`} fill="currentColor" opacity={0.08} />
      <motion.path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      <circle cx={lx} cy={ly} r={2.5} fill="currentColor" />
    </svg>
  );
}
