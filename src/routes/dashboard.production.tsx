import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Camera, Image as ImageIcon, Edit3, CheckCircle2, Send, Clock } from "lucide-react";

export const Route = createFileRoute("/dashboard/production")({ component: ProductionBoard });

const STAGES: { key: string; label: string; icon: any; color: string }[] = [
  { key: "awaiting", label: "بانتظار الجلسة", icon: <Clock className="h-4 w-4" />, color: "bg-slate-50 border-slate-200" },
  { key: "shooting", label: "يوم التصوير", icon: <Camera className="h-4 w-4" />, color: "bg-amber-50 border-amber-200" },
  { key: "selecting", label: "اختيار الصور", icon: <ImageIcon className="h-4 w-4" />, color: "bg-blue-50 border-blue-200" },
  { key: "editing", label: "قيد التحرير", icon: <Edit3 className="h-4 w-4" />, color: "bg-violet-50 border-violet-200" },
  { key: "ready", label: "جاهز للتسليم", icon: <Send className="h-4 w-4" />, color: "bg-emerald-50 border-emerald-200" },
  { key: "delivered", label: "تم التسليم", icon: <CheckCircle2 className="h-4 w-4" />, color: "bg-secondary border-border" },
];

function ProductionBoard() {
  const nav = useNavigate();
  const [uid, setUid] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (id: string) => {
    const { data } = await supabase.from("bookings")
      .select("id,client_name,event_date,start_time,end_time,total_price,production_stage,delivery_due_at,selection_link,status")
      .eq("photographer_id", id).neq("status", "cancelled").order("event_date", { ascending: true });
    setBookings(data ?? []);
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return nav({ to: "/login" });
      setUid(session.user.id);
      await load(session.user.id);
      setLoading(false);
    })();
  }, [nav]);

  const move = async (id: string, dir: 1 | -1) => {
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    const idx = STAGES.findIndex((s) => s.key === (b.production_stage || "awaiting"));
    const next = STAGES[Math.max(0, Math.min(STAGES.length - 1, idx + dir))];
    const patch: any = { production_stage: next.key };
    if (next.key === "editing" && !b.editing_started_at) patch.editing_started_at = new Date().toISOString();
    if (next.key === "delivered") { patch.editing_completed_at = new Date().toISOString(); patch.delivered_at = new Date().toISOString(); patch.status = "completed"; }
    await supabase.from("bookings").update(patch).eq("id", id);
    toast.success(`نُقل إلى: ${next.label}`);
    load(uid);
  };

  if (loading) return <div className="min-h-screen grid place-items-center">جاري التحميل…</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12">
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-gold">← اللوحة</Link>
        <h1 className="font-serif text-4xl mt-2 mb-2">لوحة متابعة الإنتاج</h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-2xl">تابعي كل حجز من يوم التصوير حتى التسليم. حرّكي الحجز بين المراحل بأزرار التالي/السابق.</p>

        <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {STAGES.map((s) => {
            const items = bookings.filter((b) => (b.production_stage || "awaiting") === s.key);
            return (
              <div key={s.key} className={`rounded-sm border ${s.color} p-3 min-h-[200px]`}>
                <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                  {s.icon}<span>{s.label}</span>
                  <span className="ms-auto text-xs bg-white/70 px-2 py-0.5 rounded-sm">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((b) => {
                    const due = b.delivery_due_at ? Math.ceil((new Date(b.delivery_due_at).getTime() - Date.now()) / 86400000) : null;
                    return (
                      <div key={b.id} className="bg-white rounded-sm border border-border p-3 text-xs space-y-1.5">
                        <Link to="/dashboard/bookings/$id" params={{ id: b.id }} className="font-medium text-sm hover:text-gold block">{b.client_name}</Link>
                        <div className="text-muted-foreground">{new Date(b.event_date).toLocaleDateString("ar-JO")} · {b.start_time?.slice(0,5)}</div>
                        {due !== null && s.key !== "delivered" && (
                          <div className={due < 0 ? "text-destructive" : due <= 7 ? "text-amber-700" : "text-muted-foreground"}>
                            {due < 0 ? `متأخّر ${Math.abs(due)} يوم` : `${due} يوم للتسليم`}
                          </div>
                        )}
                        <div className="flex gap-1 pt-1">
                          <button onClick={() => move(b.id, -1)} className="p-1 border border-border rounded-sm hover:bg-secondary" title="السابق"><ChevronRight className="h-3 w-3" /></button>
                          <button onClick={() => move(b.id, 1)} className="p-1 border border-border rounded-sm hover:bg-secondary" title="التالي"><ChevronLeft className="h-3 w-3" /></button>
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-4">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <Footer />
    </div>
  );
}