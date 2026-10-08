import { friendlyError } from "@/lib/friendlyErrors";
import { Lightbulb } from "lucide-react";
import { createFileRoute, Link, useNavigate, ErrorComponentProps } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Camera, Image as ImageIcon, Edit3, CheckCircle2, Send, Clock, Inbox, Loader2, AlertTriangle, RefreshCcw, Info } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useServerFn } from "@tanstack/react-start";
import { logMove } from "@/lib/log-move";
import { updateProductionStage } from "@/lib/production.functions";
import { hapticVibrate } from "@/lib/utils";
import { daysFromToday, relativeDay } from "@/components/dashboard/focus";

function ProductionError({ error, reset }: ErrorComponentProps) {
  // A stale deploy chunk failed to load: reload into the new build instead of showing an error
  if (typeof window !== "undefined") (window as any).__memoriaChunkReload?.(error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="h-24 w-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="font-serif text-3xl">عذراً! يبدو أن هناك سلكاً قد انقطع 🔌</h1>
          <p className="text-muted-foreground">حدث خطأ غير متوقع أثناء تحميل لوحة الإنتاج. لا تقلقي، بياناتك بأمان.</p>
          <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-sm mt-4 text-left font-mono" dir="ltr">{errorMessage}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={reset} className="inline-flex items-center gap-2 bg-charcoal text-ivory px-6 py-3 rounded-sm hover:opacity-90 transition active:scale-95 transition-transform duration-200">
            <RefreshCcw className="h-4 w-4" /> تحديث الصفحة
          </button>
          <Link to="/dashboard" className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-sm hover:bg-secondary transition active:scale-95 transition-transform duration-200">
            العودة للرئيسية
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/dashboard/production")({ 
  component: ProductionBoard,
  errorComponent: ProductionError
});

const STAGES: { key: string; label: string; icon: any; color: string }[] = [
  { key: "awaiting", label: "بانتظار الجلسة", icon: <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400" />, color: "bg-secondary/40 border-t-4 border-t-slate-400 border-x-border border-b-border text-foreground" },
  { key: "shooting", label: "يوم التصوير", icon: <Camera className="h-4 w-4 text-amber-500 dark:text-amber-400" />, color: "bg-secondary/40 border-t-4 border-t-amber-400 border-x-border border-b-border text-foreground" },
  { key: "selecting", label: "اختيار الصور", icon: <ImageIcon className="h-4 w-4 text-blue-500 dark:text-blue-400" />, color: "bg-secondary/40 border-t-4 border-t-blue-400 border-x-border border-b-border text-foreground" },
  { key: "editing", label: "قيد التحرير", icon: <Edit3 className="h-4 w-4 text-violet-500 dark:text-violet-400" />, color: "bg-secondary/40 border-t-4 border-t-violet-400 border-x-border border-b-border text-foreground" },
  { key: "ready", label: "جاهز للتسليم", icon: <Send className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />, color: "bg-secondary/40 border-t-4 border-t-emerald-400 border-x-border border-b-border text-foreground" },
  { key: "delivered", label: "تم التسليم", icon: <CheckCircle2 className="h-4 w-4 text-muted-foreground" />, color: "bg-card border border-border text-muted-foreground opacity-80" },
];


// وصف كل عمود عندما يكون فارغاً — يشرح معنى المرحلة بدل "لا حجوزات"
const STAGE_EMPTY: Record<string, string> = {
  awaiting: "الحجوزات المؤكّدة التي لم يحن موعد تصويرها بعد.",
  shooting: "حجوزات يوم تصويرها اليوم أو انتهى للتو.",
  selecting: "صُوّرت وتنتظر أن تختار العميلة صورها من الرابط.",
  editing: "صور مختارة قيد التحرير.",
  ready: "انتهى التحرير وتنتظر الإرسال للعميلة.",
  delivered: "حجوزات سُلّمت صورها.",
};

const UNDO_MS = 5000;

function ProductionBoard() {
  const nav = useNavigate();
  const logMoveFn = useServerFn(logMove);
  const updateStageFn = useServerFn(updateProductionStage);
  const [uid, setUid] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string>("awaiting");
  const [err, setErr] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  // منع تحريك نفس البطاقة مجدداً خلال نافذة التراجع — يظهر كعدّاد دائري على البطاقة
  const [undoLockUntil, setUndoLockUntil] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());
  const [deliverDialog, setDeliverDialog] = useState<{ open: boolean; b?: any; next?: any; idx?: number }>({ open: false });
  const [wiggleId, setWiggleId] = useState<string | null>(null);
  const [tipSeen, setTipSeen] = useState<boolean>(() => {
    try { return !!localStorage.getItem("memoria-production-tour-seen"); } catch { return true; }
  });

  useEffect(() => {
    const active = Object.values(undoLockUntil).some((t) => t > Date.now());
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (!Object.values(undoLockUntil).some((u) => u > n)) clearInterval(t);
    }, 200);
    return () => clearInterval(t);
  }, [undoLockUntil]);

  const load = async (id: string, isRetry = false) => {
    try {
      if (isRetry) toast.loading("نعيد المحاولة…", { id: "load-retry" });
      const { data, error } = await supabase.from("bookings")
        .select("id,client_name,event_date,start_time,end_time,total_price,production_stage,delivery_due_at,selection_link,status,editing_started_at,editing_completed_at,delivered_at,final_paid_at")
        .eq("photographer_id", id).is("deleted_at", null).in("status", ["confirmed", "completed"]).order("event_date", { ascending: true });

      if (error) throw new Error(error.message);

      setBookings(data ?? []);
      if (isRetry) toast.success("تم التحديث", { id: "load-retry" });
      setErr(null);
    } catch (e: any) {
      toast.error("تعذّر تحميل البيانات — تحقّقي من الاتصال.", {
        id: "load-retry",
        action: { label: "أعيدي المحاولة", onClick: () => load(id, true) }
      });
      setErr("تعذّر تحميل لوحة الإنتاج. تحقّقي من اتصالك بالإنترنت.");
      console.error("[production] fetch error:", e?.message);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session) {
          toast.info("انتهت جلستك. سجّلي الدخول للعودة إلى لوحة الإنتاج.");
          return nav({ to: "/login", search: { redirect: window.location.pathname } });
        }
        setUid(session.user.id);
        await load(session.user.id);
      } catch (e: any) {
        toast.error("تعذّر التحقق من هويتك. حدّثي الصفحة.");
        setErr("مشكلة في التحقق من الجلسة.");
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  const executeMove = async (b: any, dir: 1 | -1, next: typeof STAGES[0], idx: number) => {
    const patch: any = { production_stage: next.key };
    const prevStage = b.production_stage || "awaiting";

    // Save previous state for undo
    const previousState = {
      production_stage: b.production_stage,
      editing_started_at: b.editing_started_at,
      editing_completed_at: b.editing_completed_at,
      status: b.status,
      delivered_at: b.delivered_at
    };
    
    if (dir === -1 && b.production_stage === "editing" && next.key === "selecting") {
      toast.message("تنبيه: تم تصفير عدّاد أيام التحرير لهذا الحجز.");
    }
    
    setMovingId(b.id);
    try {
      await updateStageFn({ data: { booking_id: b.id, stage: next.key } });

      // Audit trail
      logMoveFn({ data: { bookingId: b.id, fromStage: prevStage, toStage: next.key } }).catch(() => {});

      // قفل نافذة الـ Undo لمدة 5 ثوانٍ
      const lockUntil = Date.now() + 5000;
      setUndoLockUntil((prev) => ({ ...prev, [b.id]: lockUntil }));

      toast.success(`نُقل إلى: ${next.label}`, {
        duration: 5000,
        action: {
          label: "تراجع",
          onClick: async () => {
            setMovingId(b.id);
            try {
              await updateStageFn({ data: { booking_id: b.id, stage: prevStage } });
              toast.success("تم التراجع بنجاح");
              logMoveFn({ data: { bookingId: b.id, fromStage: next.key, toStage: prevStage } }).catch(() => {});
              try { await load(uid); } catch {}
            } catch (undoErr: any) {
              // fallback
              const { error } = await supabase.from("bookings").update(previousState).eq("id", b.id).eq("photographer_id", uid);
              if (!error) {
                toast.success("تم التراجع بنجاح");
                try { await load(uid); } catch {}
              } else {
                toast.error("تعذّر التراجع، حاولي يدوياً.");
              }
            } finally {
              setUndoLockUntil((prev) => { const n = { ...prev }; delete n[b.id]; return n; });
              setMovingId(null);
            }
          }
        }
      });
      // Mobile: انقلي التبويب تلقائياً حتى لا يختفي الحجز من أمام المصوّرة
      setActiveStage(next.key);
      try { await load(uid); } catch (e) { console.error(e); }
    } finally {
      setMovingId(null);
    }
  };


  const move = async (id: string, dir: 1 | -1) => {
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    const wiggle = () => { setWiggleId(id); hapticVibrate("error"); setTimeout(() => setWiggleId(null), 350); };
    if (movingId) return wiggle();

    // خلال نافذة التراجع: العدّاد الدائري على البطاقة يكفي كتنبيه
    if ((undoLockUntil[id] ?? 0) > Date.now()) return wiggle();

    if (b.status === "completed") {
      toast.error("هذا الحجز مكتمل ولا يمكن تعديل مرحلته.");
      return;
    }

    const idx = STAGES.findIndex((s) => s.key === (b.production_stage || "awaiting"));
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx > STAGES.length - 1) return;
    const next = STAGES[targetIdx];

    if (next.key === "selecting" && dir === 1 && !b.selection_link) {
      wiggle();
      toast.error("أضيفي رابط اختيار الصور أولاً حتى تعرف العميلة من أين تختار.", {
        action: { label: "فتح الحجز", onClick: () => nav({ to: "/dashboard/bookings/$id", params: { id: b.id } }) }
      });
      return;
    }

    if (b.production_stage === "editing" && next.key === "selecting" && dir === -1) {
      toast.warning("إرجاع الحجز لاختيار الصور يصفّر عدّاد أيام التحرير.", { duration: 6000 });
    }

    // التسليم وحده يحتاج تأكيداً لأنه يُرسل للعميلة ويغلق البطاقة؛ باقي النقلات لها زر تراجع
    if (next.key === "delivered") {
      setDeliverDialog({ open: true, b, next, idx });
      return;
    }
    hapticVibrate("light");
    executeMove(b, dir, next, idx);
  };

  const byStage = (key: string) =>
    bookings
      .filter((b) => (b.production_stage || "awaiting") === key)
      // الأقرب موعد تسليم أولاً، ثم الأقرب تاريخ تصوير
      .sort((a, b) => {
        const da = a.delivery_due_at ? +new Date(a.delivery_due_at) : Infinity;
        const db = b.delivery_due_at ? +new Date(b.delivery_due_at) : Infinity;
        return da - db || +new Date(a.event_date) - +new Date(b.event_date);
      });

  const editingCount = byStage("editing").length;
  const overdueCount = bookings.filter((b) => b.production_stage !== "delivered" && b.delivery_due_at && daysFromToday(b.delivery_due_at) < 0).length;

  const renderCard = (b: any, sIdx: number, compact: boolean) => (
    <StageCard
      key={b.id}
      b={b}
      sIdx={sIdx}
      compact={compact}
      moving={movingId === b.id}
      wiggle={wiggleId === b.id}
      lockLeft={Math.min(UNDO_MS, Math.max(0, (undoLockUntil[b.id] ?? 0) - now))}
      onMove={(dir) => move(b.id, dir)}
    />
  );

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12">
        <BackToDashboard />
        <h1 className="font-serif text-4xl mt-2 mb-6">متابعة الإنتاج</h1>
        <div className="hidden lg:grid gap-4 lg:grid-cols-3 xl:grid-cols-6 mb-8">
          {STAGES.map((s) => (
            <div key={s.key} className={`rounded-2xl border ${s.color} p-3 min-h-[200px]`}>
              <div className="flex items-center gap-2 text-sm font-semibold mb-3">{s.icon}<span>{s.label}</span></div>
              <div className="space-y-2">
                <SkeletonCard lines={2} className="border-border/50" />
                <SkeletonCard lines={2} className="border-border/50 opacity-70" />
              </div>
            </div>
          ))}
        </div>
        <div className="lg:hidden space-y-4 mb-8">
          <SkeletonCard aspectRatio="16/9" lines={3} className="border-border/50" />
          <SkeletonCard aspectRatio="16/9" lines={3} className="border-border/50 opacity-70" />
        </div>
      </section>
      <Footer />
    </div>
  );
  if (err) return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-24 text-center">
        <BackToDashboard />
        <p className="text-destructive mt-8">{friendlyError(err)}</p>
        {uid && <button onClick={() => load(uid, true)} className="mt-4 rounded-full border border-border px-5 py-2 text-sm hover:bg-secondary">أعيدي المحاولة</button>}
      </section>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12">
        <BackToDashboard />
        <div className="mt-2 mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-4xl mb-1">متابعة الإنتاج</h1>
            <p className="text-sm text-muted-foreground">مرتّبة حسب أقرب موعد تسليم. كل نقلة لها زر تراجع لمدة ٥ ثوانٍ.</p>
          </div>
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> {overdueCount} {overdueCount === 1 ? "تسليم متأخر" : "تسليمات متأخرة"}
            </span>
          )}
        </div>

        {bookings.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="لا أعمال قيد الإنتاج"
            description="عند تأكيد عربون أي حجز يظهر هنا تلقائياً لتتابعي مراحله حتى التسليم."
          />
        ) : (
          <>
            <AnimatePresence>
              {!tipSeen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 flex items-start gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-4 text-sm"
                >
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <div className="flex-1 space-y-1">
                    <p>حرّكي كل حجز بزر <strong>التالي</strong> عند انتهاء مرحلته. العميلة ترى المرحلة في صفحة التتبّع وتصلها رسالة عند التحرير والتسليم.</p>
                    <p className="text-xs text-muted-foreground">عند الانتقال إلى «قيد التحرير» يبدأ عدّاد أيام التحرير تلقائياً.</p>
                  </div>
                  <button
                    onClick={() => { setTipSeen(true); try { localStorage.setItem("memoria-production-tour-seen", "true"); } catch { /* ignore */ } }}
                    className="shrink-0 rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary"
                  >
                    فهمت
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {editingCount > 3 && (
              <div className="mb-4 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                <Info className="h-3.5 w-3.5" /> لديكِ {editingCount} حجوزات قيد التحرير في وقت واحد — قد يؤخّر ذلك مواعيد التسليم.
              </div>
            )}

            {/* Mobile stage selector */}
            <div className="lg:hidden mb-4 -mx-4 px-4 overflow-x-auto scrollbar-none">
              <div className="flex gap-2 min-w-max pb-2">
                {STAGES.map((s) => {
                  const count = byStage(s.key).length;
                  const isActive = activeStage === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setActiveStage(s.key)}
                      className={`relative shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs whitespace-nowrap transition-colors ${isActive ? "border-transparent text-ivory dark:text-charcoal" : "border-border bg-card hover:bg-secondary"}`}
                    >
                      {isActive && <motion.span layoutId="prod-stage-pill" className="absolute inset-0 rounded-full bg-charcoal dark:bg-gold" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                      <span className="relative inline-flex items-center gap-2">
                        {s.label}
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span key={count} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 6, opacity: 0 }} className="tabular-nums opacity-70">{count}</motion.span>
                        </AnimatePresence>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <LayoutGroup>
              <div className="hidden lg:grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
                {STAGES.map((s, sIdx) => {
                  const items = byStage(s.key);
                  return (
                    <div key={s.key} className={`rounded-2xl border ${s.color} p-3 min-h-[220px]`}>
                      <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                        {s.icon}<span>{s.label}</span>
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span key={items.length} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} className="ms-auto text-xs bg-background/70 px-2 py-0.5 rounded-full tabular-nums">{items.length}</motion.span>
                        </AnimatePresence>
                      </div>
                      <div className="space-y-2">
                        <AnimatePresence mode="popLayout">
                          {items.map((b) => renderCard(b, sIdx, true))}
                        </AnimatePresence>
                        {items.length === 0 && (
                          <p className="px-1 py-6 text-center text-[11px] leading-relaxed text-muted-foreground">{STAGE_EMPTY[s.key]}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </LayoutGroup>

            {/* Mobile single-column view */}
            <div className="lg:hidden">
              {(() => {
                const sIdx = Math.max(0, STAGES.findIndex((x) => x.key === activeStage));
                const s = STAGES[sIdx];
                const items = byStage(s.key);
                return (
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {items.map((b) => renderCard(b, sIdx, false))}
                    </AnimatePresence>
                    {items.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-border py-12 text-center">
                        <Inbox className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                        <p className="font-medium">لا حجوزات في «{s.label}»</p>
                        <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">{STAGE_EMPTY[s.key]}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </section>

      {/* التسليم فقط يحتاج تأكيداً — مع شرح ما سيحدث */}
      <AlertDialog open={deliverDialog.open} onOpenChange={(open) => !open && setDeliverDialog({ open: false })}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تسليم صور {deliverDialog.b?.client_name}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>عند التأكيد:</p>
                <ul className="list-disc space-y-1 ps-5">
                  <li>تصل للعميلة رسالة بأن صورها جاهزة مع رابط التحميل.</li>
                  <li>يُطلب منها تقييم تجربتها معكِ.</li>
                  {!deliverDialog.b?.final_paid_at && <li>تبقى صور المعرض بعلامة مائية حتى تسجّلي الدفعة النهائية.</li>}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ليس الآن</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const { b, next, idx } = deliverDialog;
                if (b && next && idx !== undefined) { hapticVibrate("success"); executeMove(b, 1, next, idx); }
                setDeliverDialog({ open: false });
              }}
            >
              سلّمي الصور
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}

function StageCard({ b, sIdx, compact, moving, wiggle, lockLeft, onMove }: {
  b: any; sIdx: number; compact: boolean; moving: boolean; wiggle: boolean; lockLeft: number; onMove: (dir: 1 | -1) => void;
}) {
  const s = STAGES[sIdx];
  const due = b.delivery_due_at ? daysFromToday(b.delivery_due_at) : null;
  const overdue = due !== null && due < 0 && s.key !== "delivered";
  const editingDays = s.key === "editing" && b.editing_started_at ? Math.max(0, -daysFromToday(b.editing_started_at)) : null;
  const next = STAGES[sIdx + 1];
  const canMove = b.status !== "completed" && s.key !== "delivered";
  const locked = lockLeft > 0;
  const R = 7, C = 2 * Math.PI * R;

  return (
    <motion.div
      layout
      layoutId={`prod-${b.id}`}
      aria-busy={moving}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={wiggle ? { opacity: 1, scale: 1, x: [-5, 5, -4, 4, 0] } : { opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={`relative rounded-xl border bg-card text-foreground ${overdue ? "border-amber-500/60" : "border-border"} ${compact ? "p-3 text-xs" : "p-4 text-sm"} space-y-2`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link to="/dashboard/bookings/$id" params={{ id: b.id }} className={`font-medium hover:text-gold ${compact ? "text-sm" : "text-base"}`}>
          {b.client_name}
        </Link>
        {locked && (
          <span className="relative grid h-5 w-5 shrink-0 place-items-center" title="يمكنك التراجع عن آخر نقلة">
            <svg viewBox="0 0 20 20" className="h-5 w-5 -rotate-90">
              <circle cx="10" cy="10" r={R} fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary" />
              <circle cx="10" cy="10" r={R} fill="none" stroke="currentColor" strokeWidth="2" className="text-gold" strokeDasharray={C} strokeDashoffset={C * (1 - lockLeft / UNDO_MS)} />
            </svg>
          </span>
        )}
      </div>
      <div className="text-muted-foreground">
        {new Date(b.event_date).toLocaleDateString("ar-JO", { day: "numeric", month: "short" })}
        {b.start_time && ` · ${b.start_time.slice(0, 5)}`}
      </div>

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {due !== null && s.key !== "delivered" && (
          <span className={`rounded-full px-2 py-0.5 ${overdue ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : due <= 7 ? "bg-secondary text-foreground" : "bg-secondary text-muted-foreground"}`}>
            {overdue ? `متأخر ${Math.abs(due)} ${Math.abs(due) === 1 ? "يوماً" : "أيام"}` : `التسليم ${relativeDay(due)}`}
          </span>
        )}
        {editingDays !== null && <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">{editingDays} يوم تحرير</span>}
        {s.key === "ready" && !b.final_paid_at && <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">الدفعة الأخيرة لم تصل</span>}
      </div>

      {canMove && (
        <div className="flex gap-1.5 border-t border-border pt-2">
          {sIdx > 0 && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => onMove(-1)}
              disabled={moving}
              aria-label="المرحلة السابقة"
              title={`أرجعي إلى ${STAGES[sIdx - 1].label}`}
              className="grid place-items-center rounded-lg border border-border px-2.5 py-1.5 hover:bg-secondary disabled:opacity-50"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </motion.button>
          )}
          {next && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onMove(1)}
              disabled={moving}
              className={`flex-1 inline-flex items-center justify-center gap-1 rounded-lg py-1.5 disabled:opacity-60 ${next.key === "delivered" ? "bg-gold text-charcoal" : "bg-charcoal text-ivory dark:bg-secondary dark:text-foreground"} ${compact ? "text-[11px]" : "text-xs"}`}
            >
              {moving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>{next.label} <ChevronLeft className="h-3.5 w-3.5" /></>}
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
}
