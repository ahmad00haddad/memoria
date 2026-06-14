import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/bookings/")({ component: BookingsList });

function BookingsList() {
  const nav = useNavigate();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return nav({ to: "/login" });
        const { data, error } = await supabase.from("bookings").select("*").eq("photographer_id", session.user.id).is("deleted_at", null).order("event_date", { ascending: false });
        if (error) throw error;
        setList(data ?? []);
      } catch (error: any) {
        setLoadError(error?.message || "تعذّر تحميل الحجوزات.");
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  if (loading) return <div className="min-h-screen grid place-items-center">جاري التحميل…</div>;
  if (loadError) return <div className="min-h-screen grid place-items-center px-4 text-sm text-destructive">{loadError}</div>;
  const filtered = filter === "all" ? list : list.filter((b) => b.status === filter);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 max-w-5xl">
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-gold">← اللوحة</Link>
        <h1 className="font-serif text-4xl mt-2 mb-6">الحجوزات</h1>

        <div className="flex gap-2 mb-4 flex-wrap text-sm">
          {[
            { v: "all", l: "الكل" }, { v: "quote", l: "عروض أسعار" }, { v: "pending_deposit", l: "بانتظار العربون" },
            { v: "confirmed", l: "مؤكّد" }, { v: "completed", l: "منجز" }, { v: "cancelled", l: "ملغى" },
          ].map((f) => (
            <button key={f.v} onClick={() => setFilter(f.v)} className={`px-3 py-1.5 rounded-sm border ${filter === f.v ? "bg-charcoal text-ivory border-charcoal" : "border-border hover:bg-secondary"}`}>{f.l}</button>
          ))}
        </div>

        {list.length === 0 && (
          <div className="rounded-sm border border-border bg-card p-6 mb-6 shadow-soft">
            <h2 className="font-serif text-2xl mb-2">لا توجد حجوزات بعد</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              هذه الصفحة ليست فارغة بسبب خطأ، بل لأن العملاء لم يرسلوا أي طلب بعد. لبدء استقبال الطلبات يجب أولًا إكمال الملف الشخصي ثم إضافة الباقات ونشر الملف العام.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link to="/dashboard/profile" className="border border-border px-4 py-2 rounded-sm hover:bg-secondary">إكمال الملف</Link>
              <Link to="/dashboard/pricing" className="border border-border px-4 py-2 rounded-sm hover:bg-secondary">إضافة باقات</Link>
              <Link to="/search" className="bg-charcoal text-ivory px-4 py-2 rounded-sm hover:opacity-90">معاينة تجربة العميل</Link>
            </div>
          </div>
        )}

        <div className="rounded-sm border border-border bg-card overflow-hidden">
          {filtered.length === 0 ? <p className="p-6 text-sm text-muted-foreground">لا حجوزات.</p> : filtered.map((b) => (
            <Link key={b.id} to="/dashboard/bookings/$id" params={{ id: b.id }} className="block p-4 border-b border-border last:border-0 hover:bg-secondary/50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{b.client_name} <span className="text-xs text-muted-foreground">— {b.service === "photography" ? "تصوير" : "فيديو"}</span></div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(b.event_date).toLocaleDateString("ar-JO")} · {b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}</div>
                  {b.venue_name && <div className="text-xs text-muted-foreground">{b.venue_name}</div>}
                </div>
                <div className="text-right">
                  <div className="font-serif text-lg">{Number(b.total_price).toLocaleString("ar-JO")} د.أ</div>
                  <StatusBadge s={b.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const m: Record<string, { l: string; c: string }> = {
    quote: { l: "عرض سعر", c: "bg-secondary" },
    pending_deposit: { l: "بانتظار العربون", c: "bg-amber-100 text-amber-800" },
    confirmed: { l: "مؤكّد", c: "bg-emerald-100 text-emerald-800" },
    completed: { l: "منجز", c: "bg-charcoal text-ivory" },
    cancelled: { l: "ملغى", c: "bg-destructive/10 text-destructive" },
  };
  const x = m[s] ?? m.quote;
  return <span className={`text-[10px] mt-1 inline-block px-2 py-0.5 rounded-sm ${x.c}`}>{x.l}</span>;
}