import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

// عدّ تنازلي حيّ ليوم العرس + قائمة تجهيز قصيرة تكتمل تلقائياً من حالة الحجز.
// يظهر فقط قبل الموعد (وفي يومه) ولحجز غير ملغى.

type Props = {
  eventDate: string; // YYYY-MM-DD
  startTime?: string | null; // HH:MM[:SS]
  photographerName: string;
  steps: { label: string; done: boolean; target?: string }[];
};

/** لحظة بدء التصوير بتوقيت عمّان (UTC+3 طوال السنة منذ 2022). */
function eventMoment(date: string, time?: string | null) {
  const t = (time || "18:00").slice(0, 5);
  return new Date(`${date}T${t}:00+03:00`).getTime();
}

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function WeddingCountdown({ eventDate, startTime, photographerName, steps }: Props) {
  const target = eventMoment(eventDate, startTime);
  // يبدأ null كي يطابق رسم الخادم، ثم يعمل الوقت الحيّ في المتصفح
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return null;
  const left = target - now;
  const endOfDay = new Date(`${eventDate}T23:59:59+03:00`).getTime();
  if (now > endOfDay) return null;

  const p = parts(left);
  const isToday = left <= 0 || p.d === 0;
  const done = steps.filter((x) => x.done).length;

  return (
    <section aria-label="العدّ التنازلي ليوم العرس" className="mb-8 overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-b from-gold/10 to-transparent p-6 text-center sm:p-8">
      <div className="text-xs tracking-[0.3em] text-gold">{isToday ? "اليوم يومكِ" : "العدّ التنازلي ليومكِ"}</div>

      {isToday ? (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 font-serif text-4xl"
        >
          مبروك 🤍
        </motion.p>
      ) : (
        <div className="mt-4 flex justify-center gap-2 sm:gap-4" dir="rtl">
          {[
            { v: p.d, l: "يوم" },
            { v: p.h, l: "ساعة" },
            { v: p.m, l: "دقيقة" },
            { v: p.s, l: "ثانية" },
          ].map((u) => (
            <div key={u.l} className="w-[4.5rem] rounded-xl bg-background/70 py-3 ring-1 ring-border sm:w-24">
              <div className="font-serif text-3xl tabular-nums sm:text-4xl" aria-live={u.l === "يوم" ? "polite" : "off"}>
                {u.v.toLocaleString("ar-JO")}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{u.l}</div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-sm text-muted-foreground">
        مع {photographerName} ·{" "}
        {new Date(`${eventDate}T12:00:00+03:00`).toLocaleDateString("ar-JO", { weekday: "long", day: "numeric", month: "long" })}
      </p>

      {/* قائمة التجهيز */}
      <div className="mx-auto mt-6 max-w-sm text-start">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>جاهزية يومكِ</span>
          <span className="tabular-nums">{done}/{steps.length}</span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-gold"
            initial={{ width: 0 }}
            animate={{ width: `${(done / steps.length) * 100}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <ul className="space-y-1.5">
          {steps.map((st) => (
            <li key={st.label}>
              <button
                type="button"
                disabled={st.done || !st.target}
                onClick={() => st.target && document.getElementById(st.target)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-sm disabled:cursor-default enabled:hover:bg-secondary/60"
              >
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${st.done ? "bg-gold text-charcoal" : "ring-1 ring-border"}`}>
                  {st.done && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className={st.done ? "text-muted-foreground line-through decoration-gold/50" : "text-foreground"}>{st.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
