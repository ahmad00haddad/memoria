import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Booking = { id?: string; event_date: string; status: string; client_name: string; start_time?: string };
type Blocked = { id: string; date: string; reason: string | null };

const WEEKDAYS = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * تقويم شهري مرئي: الحجوزات نقاط ذهبية، الأيام المحجوبة مشطوبة.
 * نقرة على يوم فارغ تحجبه، ونقرة على يوم محجوب تفتحه.
 */
export function MonthGrid({ bookings, blocked, onToggle, onOpenBooking }: {
  bookings: Booking[];
  blocked: Blocked[];
  onToggle: (date: string, blockedId?: string) => void;
  onOpenBooking: (b: Booking) => void;
}) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const [dir, setDir] = useState(0);
  const todayKey = ymd(new Date());

  const byDate = useMemo(() => {
    const m: Record<string, Booking[]> = {};
    for (const b of bookings) if (b.status !== "cancelled") (m[b.event_date] ??= []).push(b);
    return m;
  }, [bookings]);
  const blockedByDate = useMemo(() => Object.fromEntries(blocked.map((u) => [u.date, u])), [blocked]);

  const days = useMemo(() => {
    const first = new Date(cursor);
    const startPad = first.getDay();
    const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: startPad }, () => null);
    for (let i = 1; i <= count; i++) cells.push(new Date(first.getFullYear(), first.getMonth(), i));
    return cells;
  }, [cursor]);

  const monthDays = days.filter(Boolean) as Date[];
  const booked = monthDays.filter((d) => byDate[ymd(d)]).length;
  const blockedCount = monthDays.filter((d) => blockedByDate[ymd(d)]).length;
  const isCurrentMonth = cursor.getMonth() === new Date().getMonth() && cursor.getFullYear() === new Date().getFullYear();

  const shift = (n: number) => {
    setDir(n);
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">{cursor.toLocaleDateString("ar-JO", { month: "long", year: "numeric" })}</h2>
          <p className="text-xs text-muted-foreground tabular-nums">{booked} محجوزة · {blockedCount} محجوبة · {monthDays.length - booked - blockedCount} متاحة</p>
        </div>
        <div className="flex items-center gap-1">
          {!isCurrentMonth && (
            <button onClick={() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); setDir(d < cursor ? -1 : 1); setCursor(d); }} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary">اليوم</button>
          )}
          <button onClick={() => shift(-1)} aria-label="الشهر السابق" className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => shift(1)} aria-label="الشهر التالي" className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"><ChevronLeft className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground mb-1">
        {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={cursor.toISOString()}
            custom={dir}
            initial={{ x: dir > 0 ? "-30%" : "30%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir > 0 ? "30%" : "-30%", opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, { offset }) => { if (offset.x > 60) shift(1); else if (offset.x < -60) shift(-1); }}
            className="grid grid-cols-7 gap-1"
          >
            {days.map((d, i) => {
              if (!d) return <div key={`p${i}`} />;
              const key = ymd(d);
              const bks = byDate[key] ?? [];
              const blk = blockedByDate[key];
              const past = key < todayKey;
              const isToday = key === todayKey;
              return (
                <button
                  key={key}
                  disabled={past && !bks.length}
                  onClick={() => (bks.length ? onOpenBooking(bks[0]) : onToggle(key, blk?.id))}
                  title={bks.length ? bks.map((b) => b.client_name).join("، ") : blk ? `محجوب${blk.reason ? ` — ${blk.reason}` : ""} · انقري لفتحه` : "انقري لحجب هذا اليوم"}
                  className={`group relative flex aspect-square sm:aspect-auto sm:h-14 flex-col items-center justify-center rounded-xl text-sm tabular-nums transition-colors
                    ${bks.length ? "bg-gold/15 text-foreground hover:bg-gold/25" : blk ? "bg-secondary text-muted-foreground" : past ? "text-muted-foreground/40" : "hover:bg-secondary"}
                    ${isToday ? "ring-2 ring-gold/60" : ""}`}
                >
                  <span className={blk && !bks.length ? "line-through decoration-muted-foreground/60" : ""}>{d.getDate()}</span>
                  {bks.length > 0 && (
                    <span className="absolute bottom-1.5 flex gap-0.5">
                      {bks.slice(0, 3).map((_, j) => (
                        <motion.span key={j} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15 + j * 0.05 }} className="h-1 w-1 rounded-full bg-gold" />
                      ))}
                    </span>
                  )}
                  {bks.length > 1 && <span className="absolute top-1 end-1 text-[9px] text-gold">{bks.length}</span>}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-gold/30" /> حجز</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-secondary" /> محجوب (لا يظهر للعرائس)</span>
        <span className="ms-auto">انقري على يوم لحجبه أو فتحه</span>
      </div>
    </div>
  );
}
