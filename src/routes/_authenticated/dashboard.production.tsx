import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Camera, Image as ImageIcon, Edit3, CheckCircle2, Send, Clock, Inbox, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const Route = createFileRoute("/_authenticated/dashboard/production")({ component: ProductionBoard });

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
  const [uid, setUid] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string>("awaiting");
  const [err, setErr] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const load = async (id: string) => {
    const { data, error } = await supabase.from("bookings")
      .select("id,client_name,event_date,start_time,end_time,total_price,production_stage,delivery_due_at,selection_link,status,editing_started_at,editing_completed_at")
      .eq("photographer_id", id).is("deleted_at", null).neq("status", "cancelled").order("event_date", { ascending: true });
    if (error) throw new Error(error.message);
    setBookings(data ?? []);
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.info("انتهت جلستك لأسباب أمنية. سجّلي الدخول للعودة إلى لوحة الإنتاج.");
          return nav({ to: "/login", search: { redirect: window.location.pathname } });
        }
        setUid(session.user.id);
        await load(session.user.id);
      } catch (e: any) {
        setErr("تعذّر تحميل لوحة الإنتاج. تحقّق من اتصالك وحاول مجدداً.");
        console.error("[production] fetch error:", e?.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  const executeMove = async (b: any, dir: 1 | -1, next: typeof STAGES[0], idx: number) => {
    const patch: any = { production_stage: next.key };
    
    if (dir === -1 && b.production_stage === "editing" && next.key === "selecting") {
      patch.editing_started_at = null;
      patch.editing_completed_at = null;
    }
    
    if (next.key === "editing" && !b.editing_started_at) patch.editing_started_at = new Date().toISOString();
    if (next.key === "delivered") { patch.editing_completed_at = new Date().toISOString(); patch.delivered_at = new Date().toISOString(); patch.status = "completed"; }
    
    setMovingId(b.id);
    const { error } = await supabase.from("bookings").update(patch).eq("id", b.id).eq("photographer_id", uid);
    
    if (error) { 
      setMovingId(null); 
      toast.error(`تعذّر نقل «${b.client_name}» — تحقّق من الاتصال وحاول مجدداً.`, {
        action: { label: "إعادة المحاولة", onClick: () => move(b.id, dir) }
      }); 
      console.error("[production] move error:", error.message); 
      return; 
    }
    
    
    toast.success(`نُقل إلى: ${next.label}`);
    // Mobile: انقلي التبويب تلقائياً حتى لا يختفي الحجز من أمام المصوّرة
    setActiveStage(next.key);
    try { await load(uid); } catch (e) { console.error(e); }
    setMovingId(null);
  };

  const move = async (id: string, dir: 1 | -1) => {
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    if (movingId) return;
    
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
    
    if (next.key === "delivered" && dir === 1) {
      toast("تأكيد التسليم سيُغلق الحجز نهائياً ولا يمكن التراجع. هل أنت متأكدة؟", {
        duration: 10000,
        action: {
          label: "نعم، أكّدي التسليم",
          onClick: () => executeMove(b, dir, next, idx)
        }
      });
      return;
    }
    
    await executeMove(b, dir, next, idx);
  };

  if (loading) return <PageLoader />;
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
            title="لا توجد حجوزات في لوحة الإنتاج"
            description="عند تأكيد حجوزات جديدة، ستظهر هنا لمتابعة مراحل تجهيزها."
          />
        ) : (
          <>
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
                            {due !== null && s.key !== "delivered" && (
                              <div className={`text-[10px] ${due < 0 ? "text-destructive" : due <= 7 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                                {due < 0 ? `متأخّر ${Math.abs(due)} يوم` : `${due} يوم للتسليم`}
                              </div>
                            )}
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
                      {items.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-4">—</p>}
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
                            {due !== null && s.key !== "delivered" && (
                              <div className={`text-xs ${due < 0 ? "text-destructive" : due <= 7 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                                {due < 0 ? `متأخّر ${Math.abs(due)} يوم` : `${due} يوم للتسليم`}
                              </div>
                            )}
                            <div className="flex gap-2 pt-2 border-t border-border">
                              {sIdx > 0 && sIdx < STAGES.length - 1 && (
                                <motion.button whileTap={{ scale: 0.96 }} onClick={() => move(b.id, -1)} disabled={movingId === b.id} className="flex-1 inline-flex items-center justify-center gap-1 py-2 border border-border rounded-sm hover:bg-secondary text-xs disabled:opacity-50" title="أرجعي الحجز إلى المرحلة السابقة">
                                  {movingId === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />} السابق
                                </motion.button>
                              )}
                              {sIdx < STAGES.length - 1 && (
                                <motion.button whileTap={{ scale: 0.96 }} onClick={() => move(b.id, 1)} disabled={movingId === b.id} className="flex-1 inline-flex items-center justify-center gap-1 py-2 bg-charcoal text-ivory rounded-sm hover:opacity-90 text-xs disabled:opacity-50" title="انقلي الحجز إلى المرحلة التالية">
                                  التالي {movingId === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronLeft className="h-4 w-4" />}
                                </motion.button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                      </AnimatePresence>
                      {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">لا حجوزات في هذه المرحلة</p>}
                    </motion.div>
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </section>
      <Footer />
    </div>
  );
}