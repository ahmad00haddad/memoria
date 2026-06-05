import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X } from "lucide-react";

export const Route = createFileRoute("/dashboard/calendar")({ component: CalendarPage });

function CalendarPage() {
  const nav = useNavigate();
  const [uid, setUid] = useState("");
  const [unavail, setUnavail] = useState<{ id: string; date: string; reason: string | null }[]>([]);
  const [bookings, setBookings] = useState<{ event_date: string; status: string; client_name: string }[]>([]);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async (id: string) => {
    const [{ data: u }, { data: b }] = await Promise.all([
      supabase.from("photographer_unavailability").select("*").eq("photographer_id", id).order("date"),
      supabase.from("bookings").select("event_date,status,client_name").eq("photographer_id", id).order("event_date"),
    ]);
    setUnavail((u ?? []) as any);
    setBookings((b ?? []) as any);
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return nav({ to: "/login" });
        setUid(session.user.id);
        await load(session.user.id);
      } catch (error: any) {
        setLoadError(error?.message || "تعذّر تحميل التقويم.");
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  const block = async () => {
    if (!date) return;
    const { error } = await supabase.from("photographer_unavailability").insert({ photographer_id: uid, date, reason });
    if (error) return toast.error(error.message);
    setDate(""); setReason(""); toast.success("تم حجب اليوم");
    load(uid);
  };
  const unblock = async (id: string) => {
    await supabase.from("photographer_unavailability").delete().eq("id", id);
    load(uid);
  };

  if (loading) return <div className="min-h-screen grid place-items-center">جاري التحميل…</div>;
  if (loadError) return <div className="min-h-screen grid place-items-center px-4 text-sm text-destructive">{loadError}</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 max-w-3xl">
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-gold">← اللوحة</Link>
        <h1 className="font-serif text-4xl mt-2 mb-8">التقويم وإدارة التوفر</h1>

        <div className="rounded-sm border border-border bg-card p-6 shadow-soft mb-8">
          <h2 className="font-serif text-xl mb-3">حجب يوم</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            استخدمي هذا القسم لإغلاق الأيام غير المتاحة عليكِ، مثل السفر أو الحجوزات الخارجية. الأيام المحجوبة ستمنع العميل من اختيارها أثناء الطلب.
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-border rounded-sm px-3 py-2 bg-background" />
            <input placeholder="السبب (اختياري)" value={reason} onChange={(e) => setReason(e.target.value)} className="border border-border rounded-sm px-3 py-2 bg-background flex-1 min-w-[200px]" />
            <button onClick={block} className="bg-charcoal text-ivory px-6 py-2 rounded-sm hover:opacity-90">حجب</button>
          </div>
        </div>

        <h2 className="font-serif text-xl mb-3">الأيام المحجوبة</h2>
        <div className="rounded-sm border border-border bg-card overflow-hidden mb-8">
          {unavail.length === 0 ? <p className="p-4 text-sm text-muted-foreground">لا توجد أيام محجوبة حاليًا.</p> : unavail.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-3 border-b border-border last:border-0">
              <div><div className="text-sm">{new Date(u.date).toLocaleDateString("ar-JO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>{u.reason && <div className="text-xs text-muted-foreground">{u.reason}</div>}</div>
              <button onClick={() => unblock(u.id)} className="text-destructive p-2"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>

        <h2 className="font-serif text-xl mb-3">الحجوزات القادمة</h2>
        <div className="rounded-sm border border-border bg-card overflow-hidden">
          {bookings.filter((b) => new Date(b.event_date) >= new Date(Date.now() - 86400000)).length === 0
            ? <p className="p-4 text-sm text-muted-foreground">لا حجوزات قادمة.</p>
            : bookings.filter((b) => new Date(b.event_date) >= new Date(Date.now() - 86400000)).map((b, i) => (
              <div key={i} className="flex items-center justify-between p-3 border-b border-border last:border-0">
                <div><div className="text-sm">{new Date(b.event_date).toLocaleDateString("ar-JO")}</div><div className="text-xs text-muted-foreground">{b.client_name}</div></div>
                <span className="text-xs px-2 py-1 bg-secondary rounded-sm">{b.status}</span>
              </div>
            ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}