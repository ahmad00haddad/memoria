import { friendlyError } from "@/lib/friendlyErrors";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { confirmBookingAfterDeposit } from "@/lib/booking.functions";
import { ListSkeleton } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { hapticVibrate } from "@/lib/utils";
import { daysFromToday, relativeDay, ageLabel } from "@/components/dashboard/focus";
import { Inbox, Search, CheckCircle2, MessageCircle, ChevronLeft, Paperclip, AlertTriangle, History, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/bookings/")({ component: BookingsList });

const STATUS_LABELS: Record<string, string> = {
  pending_deposit: "بانتظار العربون",
  quote: "عرض سعر",
  confirmed: "مؤكّد",
  cancelled: "ملغى",
  completed: "مكتمل",
};

const STATUS_COLORS: Record<string, string> = {
  pending_deposit: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  quote: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  confirmed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-red-500/10 text-red-600 dark:text-red-400",
  completed: "bg-gold/10 text-gold",
};

const SWIPE_HINT_KEY = "memoria:swipe-hint-seen";
const LAST_BOOKING_KEY = "memoria:last-booking";

let cachedBookingsList: any[] | null = null;

type FilterKey = "all" | "action" | "upcoming" | "pending_deposit" | "confirmed" | "completed" | "cancelled";

const hasProof = (b: any) => b.status === "pending_deposit" && (b.deposit_proof_url || b.deposit_sent_at);
const isOverdue = (b: any) => b.delivery_due_at && b.production_stage !== "delivered" && b.status !== "cancelled" && daysFromToday(b.delivery_due_at) < 0;
const needsAction = (b: any) => hasProof(b) || isOverdue(b);

function BookingsList() {
  const nav = useNavigate();
  const confirmFn = useServerFn(confirmBookingAfterDeposit);
  const [list, setList] = useState<any[]>(cachedBookingsList ?? []);
  const [loading, setLoading] = useState(!cachedBookingsList);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [q, setQ] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  const [lastOpened, setLastOpened] = useState<{ id: string; name: string } | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_BOOKING_KEY);
      if (raw) setLastOpened(JSON.parse(raw));
      setShowSwipeHint(!localStorage.getItem(SWIPE_HINT_KEY));
    } catch { /* ignore */ }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return nav({ to: "/login" });
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("photographer_id", session.user.id)
          .is("deleted_at", null)
          .not("phone_verified_at" as any, "is", null) // طلبات غير مؤكدة (سبام محتمل) لا تظهر
          .order("event_date", { ascending: false });
        if (error) throw error;
        cachedBookingsList = data ?? [];
        setList(data ?? []);
        // طلب جديد يدخل القائمة لحظياً مع وهج ذهبي
        channel = supabase.channel(`bookings-list-${session.user.id}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings", filter: `photographer_id=eq.${session.user.id}` }, (payload) => {
            const nb = payload.new as any;
            setList((prev) => (prev.some((x) => x.id === nb.id) ? prev : [nb, ...prev]));
            setFresh((f) => [...f, nb.id]);
            hapticVibrate("medium");
            setTimeout(() => setFresh((f) => f.filter((x) => x !== nb.id)), 2500);
          })
          .subscribe();
      } catch (error: any) {
        setLoadError(error?.message || "تعذّر تحميل الحجوزات");
      } finally {
        setLoading(false);
      }
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [nav]);

  const handleConfirm = async (id: string) => {
    const prev = list;
    setList((l) => l.map((b) => (b.id === id ? { ...b, status: "confirmed" } : b))); // تحديث متفائل
    try {
      await confirmFn({ data: { booking_id: id } });
      hapticVibrate("success");
      toast.success("تأكّد الحجز ووصل إشعار للعميلة");
    } catch (e: any) {
      setList(prev);
      hapticVibrate("error");
      toast.error(e?.message || "تعذّر تأكيد الحجز");
    }
  };

  const dismissSwipeHint = () => {
    setShowSwipeHint(false);
    try { localStorage.setItem(SWIPE_HINT_KEY, "1"); } catch { /* ignore */ }
  };

  // تعارض: حجزان غير ملغيين في نفس اليوم
  const conflictDates = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of list) if (b.status !== "cancelled" && b.event_date) counts[b.event_date] = (counts[b.event_date] ?? 0) + 1;
    return new Set(Object.keys(counts).filter((d) => counts[d] > 1));
  }, [list]);

  const counts = useMemo(() => ({
    all: list.length,
    action: list.filter(needsAction).length,
    upcoming: list.filter((b) => b.status !== "cancelled" && b.event_date && daysFromToday(b.event_date) >= 0).length,
    pending_deposit: list.filter((b) => b.status === "pending_deposit" || b.status === "quote").length,
    confirmed: list.filter((b) => b.status === "confirmed").length,
    completed: list.filter((b) => b.status === "completed").length,
    cancelled: list.filter((b) => b.status === "cancelled").length,
  }), [list]);

  const FILTERS: { value: FilterKey; label: string }[] = [
    { value: "all", label: "الكل" },
    ...(counts.action > 0 ? [{ value: "action" as const, label: "تحتاج إجراء" }] : []),
    { value: "upcoming", label: "القادمة" },
    { value: "pending_deposit", label: "بانتظار العربون" },
    { value: "confirmed", label: "مؤكّدة" },
    { value: "completed", label: "مكتملة" },
    { value: "cancelled", label: "ملغاة" },
  ];

  const query = q.trim().toLowerCase();
  const displayed = list
    .filter((b) => {
      if (filter === "all") return true;
      if (filter === "action") return needsAction(b);
      if (filter === "upcoming") return b.status !== "cancelled" && b.event_date && daysFromToday(b.event_date) >= 0;
      if (filter === "pending_deposit") return b.status === "pending_deposit" || b.status === "quote";
      return b.status === filter;
    })
    .filter((b) => {
      if (!query) return true;
      return [b.client_name, b.client_phone, b.client_email, b.venue_name].some((v) => String(v ?? "").toLowerCase().includes(query));
    });

  // تجميع زمني: القادمة الأقرب أولاً، ثم السابقة الأحدث أولاً
  const groups = useMemo(() => {
    const week: any[] = [], later: any[] = [], past: any[] = [];
    for (const b of displayed) {
      const d = b.event_date ? daysFromToday(b.event_date) : -1;
      if (d >= 0 && d <= 7) week.push(b);
      else if (d > 7) later.push(b);
      else past.push(b);
    }
    const asc = (a: any, b: any) => +new Date(a.event_date) - +new Date(b.event_date);
    return [
      { key: "week", title: "خلال ٧ أيام", items: week.sort(asc) },
      { key: "later", title: "لاحقاً", items: later.sort(asc) },
      { key: "past", title: "سابقة", items: past.sort((a, b) => -asc(a, b)) },
    ].filter((g) => g.items.length > 0);
  }, [displayed]);

  const firstSwipeable = displayed.find(hasProof)?.id;

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5 pb-24">
        <BackToDashboard />

        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-3xl">الحجوزات</h1>
          <span className="text-xs text-muted-foreground tabular-nums">{list.length} حجزاً</span>
        </div>

        {lastOpened && list.some((b) => b.id === lastOpened.id) && !query && filter === "all" && (
          <Link to="/dashboard/bookings/$id" params={{ id: lastOpened.id }} className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground hover:border-gold/40 hover:text-foreground transition-colors">
            <History className="h-4 w-4" />
            <span>آخر ما فتحتِه: <span className="text-foreground">{lastOpened.name}</span></span>
            <ChevronLeft className="ms-auto h-4 w-4" />
          </Link>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحثي بالاسم أو الهاتف أو المكان…"
            className="w-full bg-card border border-border rounded-full py-2.5 ps-9 pe-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-gold/60 transition-colors"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="مسح البحث" className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters with counts */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none text-xs -mx-4 px-4">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            const n = counts[f.value];
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`relative flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border transition-colors ${active ? "border-transparent text-ivory dark:text-charcoal" : f.value === "action" ? "border-gold/50 text-gold" : "border-border text-muted-foreground hover:border-foreground/30"}`}
              >
                {active && <motion.span layoutId="bookings-filter" className="absolute inset-0 rounded-full bg-charcoal dark:bg-gold" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <span className="relative">{f.label}</span>
                <span className={`relative tabular-nums ${active ? "opacity-70" : "opacity-60"}`}>{n}</span>
              </button>
            );
          })}
        </div>

        {loading && <ListSkeleton />}
        {loadError && <p className="text-center text-sm text-red-500 py-8">{friendlyError(loadError)}</p>}

        {!loading && !loadError && displayed.length === 0 && (
          list.length === 0 ? (
            <EmptyState icon={Inbox} title="لا حجوزات بعد" description="عندما تطلب عروس موعداً من ملفك العام سيظهر الطلب هنا فوراً." />
          ) : (
            <div className="rounded-2xl border border-dashed border-border py-12 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-600" />
              <div className="font-serif text-xl">{filter === "action" ? "لا شيء يحتاج إجراء" : "لا نتائج هنا"}</div>
              <p className="mt-1 text-sm text-muted-foreground">{query ? `لا حجز يطابق «${q}»` : "كل شيء مرتّب في هذا القسم."}</p>
              <button onClick={() => { setFilter("all"); setQ(""); }} className="mt-4 rounded-full border border-border px-4 py-1.5 text-xs hover:bg-secondary">عرض كل الحجوزات</button>
            </div>
          )
        )}

        {!loading && !loadError && groups.map((g) => (
          <section key={g.key} className="space-y-3">
            <h2 className="sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-10 -mx-4 bg-background/90 px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur">
              {g.title} <span className="tabular-nums opacity-60">· {g.items.length}</span>
            </h2>
            <motion.div layout className="space-y-3">
              <AnimatePresence initial={false}>
                {g.items.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    query={query}
                    conflict={booking.status !== "cancelled" && conflictDates.has(booking.event_date)}
                    fresh={fresh.includes(booking.id)}
                    showHint={showSwipeHint && booking.id === firstSwipeable}
                    onHintSeen={dismissSwipeHint}
                    onConfirm={() => handleConfirm(booking.id)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}

/** يبرز الجزء المطابق من البحث بالذهبي. */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const i = text.toLowerCase().indexOf(query);
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded-sm bg-gold/25 text-inherit">{text.slice(i, i + query.length)}</mark>{text.slice(i + query.length)}</>;
}

function normalizeWa(phone?: string | null) {
  if (!phone) return "";
  let p = phone.replace(/[^\d]/g, "");
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = "962" + p.slice(1);
  return p;
}

function BookingRow({ booking, query, conflict, fresh, showHint, onHintSeen, onConfirm }: {
  booking: any; query: string; conflict: boolean; fresh: boolean; showHint: boolean; onHintSeen: () => void; onConfirm: () => void;
}) {
  const x = useMotionValue(0);
  // اللون يقوى كلما زادت مسافة السحب
  const confirmOpacity = useTransform(x, [0, 90], [0, 1]);
  const waOpacity = useTransform(x, [-90, 0], [1, 0]);
  const canConfirm = !!hasProof(booking);
  const canWa = !!booking.client_phone;
  const name = booking.client_name || "عميلة";
  const d = booking.event_date ? daysFromToday(booking.event_date) : null;
  const pendingAge = (booking.status === "pending_deposit" || booking.status === "quote") && !canConfirm
    ? (Date.now() - new Date(booking.created_at).getTime()) / 86400000
    : null;
  const nav = useNavigate();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* خلفيات السحب */}
      {canConfirm && (
        <motion.div style={{ opacity: confirmOpacity }} className="absolute inset-0 flex items-center justify-end gap-2 bg-emerald-600 px-5 text-sm font-medium text-white">
          <CheckCircle2 className="h-5 w-5" /> تأكيد العربون
        </motion.div>
      )}
      {canWa && (
        <motion.div style={{ opacity: waOpacity }} className="absolute inset-0 flex items-center justify-start gap-2 bg-[#25D366] px-5 text-sm font-medium text-white">
          واتساب <MessageCircle className="h-5 w-5" />
        </motion.div>
      )}

      <motion.div
        drag={canConfirm || canWa ? "x" : false}
        style={{ x }}
        dragConstraints={{ left: canWa ? -110 : 0, right: canConfirm ? 110 : 0 }}
        dragElastic={0.15}
        dragSnapToOrigin
        onDragEnd={(_, { offset }) => {
          if (showHint) onHintSeen();
          if (canConfirm && offset.x > 80) { hapticVibrate("medium"); onConfirm(); }
          else if (canWa && offset.x < -80) { hapticVibrate("light"); window.open(`https://wa.me/${normalizeWa(booking.client_phone)}`, "_blank"); }
        }}
        onClick={() => { if (Math.abs(x.get()) < 4) nav({ to: "/dashboard/bookings/$id", params: { id: booking.id } }); }}
        className={`relative cursor-pointer rounded-2xl border bg-card p-4 transition-[border-color,box-shadow] duration-500 hover:border-gold/40 ${fresh ? "border-gold shadow-[0_0_0_4px_color-mix(in_oklab,var(--gold)_25%,transparent)]" : "border-border"} ${booking.status === "cancelled" ? "opacity-70" : ""}`}
        whileDrag={{ boxShadow: "0 12px 28px rgba(0,0,0,0.15)" }}
        animate={showHint ? { x: [0, 36, 0] } : undefined}
        transition={showHint ? { delay: 0.8, duration: 1.1, ease: "easeInOut" } : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium truncate"><Highlight text={name} query={query} /></div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {booking.event_date ? new Date(booking.event_date).toLocaleDateString("ar-JO", { weekday: "short", day: "numeric", month: "long" }) : "—"}
              {d !== null && d >= 0 && d <= 30 && booking.status !== "cancelled" && <span className={d <= 3 ? "text-gold" : ""}> · {relativeDay(d)}</span>}
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_COLORS[booking.status] ?? "bg-muted text-muted-foreground"}`}>
            {STATUS_LABELS[booking.status] ?? booking.status}
          </span>
        </div>

        {(canConfirm || conflict || isOverdue(booking) || pendingAge !== null || (booking.status === "cancelled" && booking.cancellation_reason)) && (
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
            {canConfirm && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-gold"><Paperclip className="h-3 w-3" /> العربون وصل — راجعيه</span>
            )}
            {isOverdue(booking) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive"><AlertTriangle className="h-3 w-3" /> التسليم متأخر</span>
            )}
            {conflict && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400"><AlertTriangle className="h-3 w-3" /> حجز آخر في نفس اليوم</span>
            )}
            {pendingAge !== null && (
              <span className={`rounded-full px-2 py-0.5 ${pendingAge > 3 ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-secondary text-muted-foreground"}`}>
                الطلب {ageLabel(booking.created_at)}
              </span>
            )}
            {booking.status === "cancelled" && booking.cancellation_reason && (
              <span className="truncate rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">السبب: {booking.cancellation_reason}</span>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold tabular-nums" title={`الأساسي ${booking.base_price ?? 0} + التنقّل ${booking.travel_fee ?? 0}`}>
            {booking.total_price ? `${Number(booking.total_price).toLocaleString("ar-JO")} د.أ` : "—"}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            التفاصيل <ChevronLeft className="h-3.5 w-3.5" />
          </span>
        </div>

        {showHint && (
          <div className="mt-3 rounded-lg bg-secondary/70 px-3 py-2 text-center text-[11px] text-muted-foreground">
            اسحبي البطاقة يميناً لتأكيد العربون، ويساراً لفتح واتساب
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
