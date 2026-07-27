import { createFileRoute, Link, useNavigate, ErrorComponentProps } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

function ProductionError({ error, reset }: ErrorComponentProps) {
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
          <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-sm mt-4 text-left font-mono" dir="ltr">{error.message}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={reset} className="inline-flex items-center gap-2 bg-charcoal text-ivory px-6 py-3 rounded-sm hover:opacity-90 transition">
            <RefreshCcw className="h-4 w-4" /> تحديث الصفحة
          </button>
          <Link to="/dashboard" className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-sm hover:bg-secondary transition">
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

function ProductionBoard() {
  const nav = useNavigate();
  const logMoveFn = useServerFn(logMove);
  const [uid, setUid] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string>("awaiting");
  const [err, setErr] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  // منع النقر السريع لنقل نفس البطاقة مجدداً خلال نافذة الـ Undo
  const [undoLockUntil, setUndoLockUntil] = useState<Record<string, number>>({});
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; b?: any; dir?: 1|-1; next?: any; idx?: number }>({ open: false });

  const [wiggleId, setWiggleId] = useState<string | null>(null);
  const [tourStep, setTourStep] = useState<number>(() => {
    return localStorage.getItem('memoria-production-tour-seen') ? -1 : 0;
  });

  const load = async (id: string, isRetry = false) => {
    try {
      if (isRetry) toast.loading("جاري إعادة المحاولة...", { id: "load-retry" });
      const { data, error } = await supabase.from("bookings")
        .select("id,client_name,event_date,start_time,end_time,total_price,production_stage,delivery_due_at,selection_link,status,editing_started_at,editing_completed_at,delivered_at")
        .eq("photographer_id", id).is("deleted_at", null).neq("status", "cancelled").order("event_date", { ascending: true });
      
      if (error) throw new Error(error.message);
      
      setBookings(data ?? []);
      if (isRetry) toast.success("تم التحديث بنجاح!", { id: "load-retry" });
      setErr(null);
    } catch (e: any) {
      toast.error("فشل تحميل البيانات. قد يكون الإنترنت ضعيفاً.", {
        id: "load-retry",
        action: { label: "حاول مرة أخرى", onClick: () => load(id, true) }
      });
      setErr("تعذّر تحميل لوحة الإنتاج. يرجى التحقق من اتصالك بالإنترنت.");
      console.error("[production] fetch error:", e?.message);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        if (!session) {
          toast.info("انتهت جلستك لأسباب أمنية. سجّلي الدخول للعودة إلى لوحة الإنتاج.");
          return nav({ to: "/login", search: { redirect: window.location.pathname } });
        }
        setUid(session.user.id);
        await load(session.user.id);
      } catch (e: any) {
        toast.error("تعذّر التحقق من هويتك. الرجاء تحديث الصفحة.");
        setErr("مشكلة في التحقق من الجلسة (Session).");
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
      patch.editing_started_at = null;
      patch.editing_completed_at = null;
      toast.message("تنبيه: تم تصفير عدّاد أيام التحرير لهذا الحجز.");
    }
    
    if (next.key === "editing" && !b.editing_started_at) patch.editing_started_at = new Date().toISOString();
    if (next.key === "delivered") { patch.editing_completed_at = new Date().toISOString(); patch.delivered_at = new Date().toISOString(); patch.status = "completed"; }
    
    setMovingId(b.id);
    try {
      const { error } = await supabase.from("bookings").update(patch).eq("id", b.id).eq("photographer_id", uid);
      if (error) {
        toast.error(`تعذّر نقل «${b.client_name}» — تحقّق من الاتصال وحاول مجدداً.`, {
          action: { label: "إعادة المحاولة", onClick: () => move(b.id, dir) }
        });
        console.error("[production] move error:", error.message);
        return;
      }

      // Audit trail — fire-and-forget، لا يوقف الـ UX إن فشل
      logMoveFn({ data: { bookingId: b.id, fromStage: prevStage, toStage: next.key } }).catch(() => {});

      // قفل نافذة الـ Undo لمدة 5 ثوانٍ حتى لا يُنقل نفس الحجز مجدداً بالخطأ
      const lockUntil = Date.now() + 5000;
      setUndoLockUntil((prev) => ({ ...prev, [b.id]: lockUntil }));

      toast.success(`نُقل إلى: ${next.label}`, {
        duration: 5000,
        action: {
          label: "تراجع",
          onClick: async () => {
            setMovingId(b.id);
            try {
              const { error: undoErr } = await supabase.from("bookings").update(previousState).eq("id", b.id).eq("photographer_id", uid);
              if (!undoErr) {
                toast.success("تم التراجع بنجاح");
                logMoveFn({ data: { bookingId: b.id, fromStage: next.key, toStage: prevStage } }).catch(() => {});
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
    if (movingId) {
      // Snap-back / Wiggle animation on spam click
      setWiggleId(id);
      setTimeout(() => setWiggleId(null), 300);
      return;
    }

    // قفل نافذة الـ Undo — نمنع تحريك نفس البطاقة لمدة 5 ثوانٍ بعد آخر نقل
    const lockedUntil = undoLockUntil[id] ?? 0;
    if (lockedUntil > Date.now()) {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
      toast.message(`انتظري ${secs} ثانية — يمكنك التراجع عن آخر نقلة قبل تحريك هذا الحجز مجدداً.`);
      setWiggleId(id);
      setTimeout(() => setWiggleId(null), 300);
      return;
    }

    // منع السفر عبر الزمن: الحجز مكتمل لا يمكن تحريكه
    if (b.status === "completed") {
      toast.error("هذا الحجز مغلق (مكتمل) ولا يمكن تعديل مرحلته.");
      return;
    }
    
    const idx = STAGES.findIndex((s) => s.key === (b.production_stage || "awaiting"));
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx > STAGES.length - 1) return; // خارج النطاق
    const next = STAGES[targetIdx];
    
    // تحقق: لا تنقل إلى "اختيار الصور" بدون رابط معرض
    if (next.key === "selecting" && dir === 1 && !b.selection_link) {
      toast.error("لا يمكن الانتقال إلى «اختيار الصور» بدون رابط معرض. أضيفي الرابط من صفحة الحجز أولاً.", {
        action: { label: "فتح الحجز", onClick: () => nav({ to: "/dashboard/bookings/$id", params: { id: b.id } }) }
      });
      return;
    }
    
    setConfirmDialog({ open: true, b, dir, next, idx });
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12">
        <BackToDashboard />
        <h1 className="font-serif text-4xl mt-2 mb-2">لوحة متابعة الإنتاج</h1>
        <p className="text-sm text-muted-foreground mb-6 max-w-2xl text-charcoal/70 dark:text-ivory/70">جاري تحميل حجوزاتك بأمان...</p>

        {/* Desktop Skeleton */}
        <div className="hidden lg:grid gap-4 lg:grid-cols-3 xl:grid-cols-6 mb-8">
          {STAGES.map((s) => (
            <div key={s.key} className={`rounded-sm border ${s.color} p-3 min-h-[200px]`}>
              <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                {s.icon}<span>{s.label}</span>
              </div>
              <div className="space-y-2">
                <SkeletonCard lines={2} className="border-border/50" />
                <SkeletonCard lines={2} className="border-border/50 opacity-70" />
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Skeleton */}
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
        <p className="text-destructive mt-8">{err}</p>
      </section>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12">
        <BackToDashboard />
        <h1 className="font-serif text-4xl mt-2 mb-2">لوحة متابعة الإنتاج</h1>
        <p className="text-sm text-muted-foreground mb-6 max-w-2xl">تابعي كل حجز من يوم التصوير حتى التسليم. حرّكي الحجز بين المراحل بأزرار التالي/السابق.</p>

        {bookings.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="🎉 لا توجد حجوزات قيد المعالجة!"
            description="عند تأكيد حجوزات جديدة، ستظهر هنا لمتابعة مراحل تجهيزها خطوة بخطوة. استمتعي بفنجان قهوة ☕ ريثما يصلك حجز جديد."
          />
        ) : (
          <>
            <AnimatePresence mode="wait">
              {tourStep >= 0 && tourStep < 4 && bookings.length > 0 && (
                <motion.div
                  key="tour-card"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-md shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-1 h-full bg-blue-500" />
                  <div className="flex gap-3">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                        {tourStep === 0 && "هنا الحجوزات الجديدة"}
                        {tourStep === 1 && "استخدمي هذه الأزرار للنقل"}
                        {tourStep === 2 && "تتبع وقت التعديل"}
                        {tourStep === 3 && "الوجهة النهائية"}
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                        {tourStep === 0 && "سوف تظهر حجوزاتك الجديدة دائماً في عمود «بانتظار الجلسة» لتبدئي العمل عليها."}
                        {tourStep === 1 && "يمكنك نقل أي حجز عبر المراحل المختلفة باستخدام زري «التالي» و «السابق» الموجودين أسفل كل بطاقة."}
                        {tourStep === 2 && "عند نقل الحجز لمرحلة «قيد التحرير»، سيبدأ عداد يحسب عدد أيام التعديل تلقائياً."}
                        {tourStep === 3 && "بمجرد تسليم الحجز للعميل، انقرِ على زر التسليم، وسيتم إغلاق الحجز ولا يمكن تعديله مجدداً."}
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-1.5" dir="ltr">
                          {[0, 1, 2, 3].map((step) => (
                            <div key={step} className={`h-1.5 rounded-full transition-all ${step === tourStep ? "w-4 bg-blue-600 dark:bg-blue-400" : "w-1.5 bg-blue-200 dark:bg-blue-800/50"}`} />
                          ))}
                        </div>
                        <button 
                          onClick={async () => {
                            if (tourStep < 3) {
                              setTourStep(tourStep + 1);
                            } else {
                              setTourStep(-1);
                              localStorage.setItem("memoria-production-tour-seen", "true");
                              try { await supabase.from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", uid); } catch(e) {}
                            }
                          }}
                          className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-sm hover:bg-blue-700 transition"
                        >
                          {tourStep === 3 ? "فهمت، لننطلق!" : "التالي"}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Mobile stage selector */}
            <div className="lg:hidden mb-4 -mx-4 px-4 overflow-x-auto">
              <div className="flex gap-2 min-w-max pb-2">
                {STAGES.map((s) => {
                  const count = bookings.filter((b) => (b.production_stage || "awaiting") === s.key).length;
                  const isActive = activeStage === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setActiveStage(s.key)}
                      className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-sm border text-xs whitespace-nowrap transition ${isActive ? "bg-charcoal text-ivory border-charcoal" : "border-border bg-card hover:bg-secondary"}`}
                    >
                      {s.icon}
                      <span>{s.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-sm text-[10px] ${isActive ? "bg-ivory/20" : "bg-secondary"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {movingId && <div className="fixed inset-0 z-40 bg-background/20 pointer-events-none" />}
            
            <div className="hidden lg:grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
              {STAGES.map((s, sIdx) => {
                const items = bookings.filter((b) => (b.production_stage || "awaiting") === s.key);
                return (
                  <div key={s.key} className={`rounded-sm border ${s.color} p-3 min-h-[200px]`}>
                    <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                      {s.icon}<span>{s.label}</span>
                      <span className="ms-auto text-xs bg-background/70 px-2 py-0.5 rounded-sm">{items.length}</span>
                    </div>
                    <motion.div className="space-y-2" layout>
                      <AnimatePresence mode="popLayout">
                      {items.map((b) => {
                        const due = b.delivery_due_at ? Math.ceil((new Date(b.delivery_due_at).getTime() - Date.now()) / 86400000) : null;
                        return (
                          <motion.div
                            key={b.id}
                            layout
                            aria-busy={movingId === b.id}
                            initial={{ opacity: 0, scale: 0.95, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -8 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className={`bg-card text-foreground rounded-sm border ${due !== null && due < 0 && s.key !== "delivered" ? "border-red-500/50" : "border-border"} p-3 text-xs space-y-1.5`}
                          >
                            <Link to="/dashboard/bookings/$id" params={{ id: b.id }} className="cursor-pointer">
                              <span className="font-medium text-sm hover:text-gold block">{b.client_name}</span>
                            </Link>
                            <div className="text-muted-foreground">{new Date(b.event_date).toLocaleDateString("ar-JO")} · {b.start_time?.slice(0,5)}</div>
                            
                            <div className="flex items-center justify-between text-[10px] pt-1">
                              <span className="text-muted-foreground">المرحلة {sIdx + 1} من {STAGES.length}</span>
                              {due !== null && s.key !== "delivered" && (
                                <span className={due < 0 ? "text-destructive" : due <= 7 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}>
                                  {due < 0 ? `متأخّر ${Math.abs(due)} يوم` : `${due} يوم للتسليم`}
                                </span>
                              )}
                            </div>
                            <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-gold transition-all" style={{ width: `${((sIdx + 1) / STAGES.length) * 100}%` }} />
                            </div>

                            <div className="flex gap-1.5 pt-2 border-t border-border mt-1.5">
                              {sIdx > 0 && sIdx < STAGES.length - 1 && (
                                <motion.button whileTap={{scale:0.96}} onClick={()=>move(b.id,-1)} disabled={movingId===b.id} className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 border border-border rounded-sm hover:bg-secondary text-[10px] disabled:opacity-50" title="أرجعي الحجز إلى المرحلة السابقة">
                                  {movingId===b.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <ChevronRight className="h-3 w-3"/>} السابق
                                </motion.button>
                              )}
                              {sIdx < STAGES.length - 1 && (
                                <motion.button whileTap={{scale:0.96}} onClick={()=>move(b.id,1)} disabled={movingId===b.id} className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-charcoal text-ivory rounded-sm hover:opacity-90 text-[10px] disabled:opacity-50" title="انقلي الحجز إلى المرحلة التالية">
                                  التالي {movingId===b.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <ChevronLeft className="h-3 w-3"/>}
                                </motion.button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                      </AnimatePresence>
                      {items.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground opacity-60">
                          <Inbox className="h-6 w-6 mb-2" />
                          <p className="text-[11px]">لا حجوزات هنا</p>
                        </div>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>

            {/* Mobile single-column view */}
            <div className="lg:hidden">
              {(() => {
                const sIdx = STAGES.findIndex((x) => x.key === activeStage);
                const s = STAGES[Math.max(0, sIdx)];
                const items = bookings.filter((b) => (b.production_stage || "awaiting") === s.key);
                return (
                  <div className={`rounded-sm border ${s.color} p-3`}>
                    <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                      {s.icon}<span>{s.label}</span>
                      <span className="ms-auto text-xs bg-background/70 px-2 py-0.5 rounded-sm">{items.length}</span>
                    </div>
                    <motion.div className="space-y-2" layout>
                      <AnimatePresence mode="popLayout">
                      {items.map((b) => {
                        const due = b.delivery_due_at ? Math.ceil((new Date(b.delivery_due_at).getTime() - Date.now()) / 86400000) : null;
                        return (
                          <motion.div
                            key={b.id}
                            layout
                            aria-busy={movingId === b.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className={`bg-card text-foreground rounded-sm border ${due !== null && due < 0 && s.key !== "delivered" ? "border-red-500/50" : "border-border"} p-4 text-sm space-y-2`}
                          >
                            <Link to="/dashboard/bookings/$id" params={{ id: b.id }} className="cursor-pointer">
                              <span className="font-medium text-base hover:text-gold block">{b.client_name}</span>
                            </Link>
                            <div className="text-xs text-muted-foreground">{new Date(b.event_date).toLocaleDateString("ar-JO")} · {b.start_time?.slice(0,5)}</div>
                            
                            <div className="flex items-center justify-between text-xs pt-1">
                              <span className="text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-sm">المرحلة {sIdx + 1} من {STAGES.length}</span>
                              {due !== null && s.key !== "delivered" && (
                                <span className={due < 0 ? "text-destructive font-medium" : due <= 7 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}>
                                  {due < 0 ? `متأخّر ${Math.abs(due)} يوم` : `${due} يوم للتسليم`}
                                </span>
                              )}
                            </div>
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-gold transition-all" style={{ width: `${((sIdx + 1) / STAGES.length) * 100}%` }} />
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-border">
                              {sIdx > 0 && sIdx < STAGES.length - 1 && (
                                <motion.button whileTap={{ scale: 0.96 }} onClick={() => move(b.id, -1)} disabled={movingId === b.id} className="flex-1 inline-flex items-center justify-center gap-1 py-2 border border-border rounded-sm hover:bg-secondary text-xs disabled:opacity-50" title="أرجعي الحجز إلى المرحلة السابقة">
                                  {movingId === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />} السابق
                                </motion.button>
                              )}
                              {b.status === "completed" || b.production_stage === "delivered" ? null : (
                                <motion.button
                                  animate={wiggleId === b.id ? { x: [-5, 5, -5, 5, 0] } : {}}
                                  transition={{ duration: 0.3 }}
                                  disabled={movingId !== null || sIdx >= STAGES.length - 1}
                                  onClick={() => move(b.id, 1)}
                                  className="p-1.5 rounded-full hover:bg-secondary transition disabled:opacity-30 disabled:cursor-not-allowed text-primary"
                                  title="نقل للمرحلة التالية"
                                >
                                  {movingId === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronLeft className="h-4 w-4" />}
                                </motion.button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                      </AnimatePresence>
                      {items.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-60 bg-background/30 rounded-sm border border-dashed border-border mt-4">
                          <Inbox className="h-10 w-10 mb-3" />
                          <p className="text-sm font-medium">العمود فارغ</p>
                          <p className="text-xs mt-1 text-center px-4">لا توجد أي حجوزات في مرحلة "{s.label}" حالياً.</p>
                        </div>
                      )}
                    </motion.div>
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </section>
      
      {/* Confirmation Dialog for All Stages */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.next?.key === "delivered" 
                ? "تأكيد تسليم الحجز" 
                : confirmDialog.dir === 1 
                  ? `نقل الحجز إلى: ${confirmDialog.next?.label}` 
                  : `إرجاع الحجز إلى: ${confirmDialog.next?.label}`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.next?.key === "delivered"
                ? "هل أنت متأكدة من إكمال وتسليم هذا الحجز؟ نقل الحجز لمرحلة \"تم التسليم\" سيغلق بطاقة الحجز نهائياً ولن تستطيعي التراجع لتعديله لاحقاً."
                : `سيتم تغيير حالة الحجز "${confirmDialog.b?.client_name}" إلى مرحلة "${confirmDialog.next?.label}".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                const { b, dir, next, idx } = confirmDialog;
                if (b && dir && next && idx !== undefined) executeMove(b, dir, next, idx);
                setConfirmDialog({ open: false });
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {confirmDialog.next?.key === "delivered" ? "نعم، أكّدي التسليم" : "تأكيد النقل"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}