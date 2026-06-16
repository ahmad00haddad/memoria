import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, Wallet, Clock, CheckCircle2, Download } from "lucide-react";

export const Route = createFileRoute("/dashboard/reports")({ component: ReportsPage });

type Booking = {
  id: string;
  client_name: string | null;
  event_date: string | null;
  service: string | null;
  status: string;
  total_price: number | null;
  deposit_amount: number | null;
  deposit_confirmed_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

function ReportsPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [range, setRange] = useState<"30" | "90" | "365" | "all">("365");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return nav({ to: "/login" });
      const { data } = await supabase
        .from("bookings")
        .select("id,client_name,event_date,service,status,total_price,deposit_amount,deposit_confirmed_at,delivered_at,created_at")
        .eq("photographer_id", session.user.id)
        .is("deleted_at", null)
        .order("event_date", { ascending: false });
      setBookings((data ?? []) as Booking[]);
      setLoading(false);
    })();
  }, [nav]);

  const now = Date.now();
  const filtered = useMemo(() => {
    if (range === "all") return bookings;
    const days = Number(range);
    const cutoff = now - days * 86400000;
    return bookings.filter((b) => {
      const d = b.event_date ? new Date(b.event_date).getTime() : new Date(b.created_at).getTime();
      return d >= cutoff;
    });
  }, [bookings, range, now]);

  const stats = useMemo(() => {
    const earned = filtered.filter((b) => b.status === "completed" || b.status === "confirmed");
    const totalRevenue = earned.reduce((s, b) => s + Number(b.total_price ?? 0), 0);
    const completedRevenue = filtered.filter((b) => b.status === "completed").reduce((s, b) => s + Number(b.total_price ?? 0), 0);
    const upcomingRevenue = filtered.filter((b) => b.status === "confirmed" && b.event_date && new Date(b.event_date).getTime() >= now).reduce((s, b) => s + Number(b.total_price ?? 0), 0);
    const pendingDeposits = filtered.filter((b) => b.status === "pending_deposit").reduce((s, b) => s + Number(b.deposit_amount ?? 0), 0);
    const avgTicket = earned.length ? totalRevenue / earned.length : 0;

    // Monthly buckets (last 12 months of events)
    const months: Record<string, { label: string; revenue: number; count: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = { label: d.toLocaleDateString("ar-JO", { month: "short", year: "2-digit" }), revenue: 0, count: 0 };
    }
    earned.forEach((b) => {
      if (!b.event_date) return;
      const d = new Date(b.event_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months[key]) { months[key].revenue += Number(b.total_price ?? 0); months[key].count += 1; }
    });
    const monthly = Object.values(months);
    const peak = Math.max(1, ...monthly.map((m) => m.revenue));

    // By service
    const byService: Record<string, { revenue: number; count: number }> = {};
    earned.forEach((b) => {
      const k = b.service || "غير محدد";
      byService[k] = byService[k] ?? { revenue: 0, count: 0 };
      byService[k].revenue += Number(b.total_price ?? 0);
      byService[k].count += 1;
    });
    const services = Object.entries(byService).sort((a, b) => b[1].revenue - a[1].revenue);

    // By status counts
    const statusCounts: Record<string, number> = {};
    filtered.forEach((b) => { statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1; });

    return { totalRevenue, completedRevenue, upcomingRevenue, pendingDeposits, avgTicket, monthly, peak, services, statusCounts, count: earned.length };
  }, [filtered, now]);

  const exportCsv = () => {
    const rows = [["id", "client", "service", "event_date", "status", "total_price", "deposit_amount", "deposit_confirmed_at", "delivered_at"]];
    filtered.forEach((b) => rows.push([b.id, b.client_name ?? "", b.service ?? "", b.event_date ?? "", b.status, String(b.total_price ?? 0), String(b.deposit_amount ?? 0), b.deposit_confirmed_at ?? "", b.delivered_at ?? ""]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="min-h-screen grid place-items-center">جاري التحميل…</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12">
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-gold">← اللوحة</Link>
        <div className="flex flex-wrap items-end justify-between gap-3 mt-2 mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">تقارير مالية</div>
            <h1 className="font-serif text-4xl">ملخّص الأداء المالي</h1>
          </div>
          <div className="flex gap-2 items-center">
            <select value={range} onChange={(e) => setRange(e.target.value as any)} className="border border-border rounded-sm px-3 py-2 bg-background text-sm">
              <option value="30">آخر 30 يوماً</option>
              <option value="90">آخر 90 يوماً</option>
              <option value="365">آخر سنة</option>
              <option value="all">كل الفترات</option>
            </select>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded-sm hover:bg-secondary text-sm">
              <Download className="h-4 w-4" /> تصدير CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Stat icon={<DollarSign className="h-5 w-5 text-emerald-600" />} label="إجمالي الإيرادات" value={`${stats.totalRevenue.toFixed(0)} د.أ`} sub={`${stats.count} حجز`} />
          <Stat icon={<CheckCircle2 className="h-5 w-5 text-emerald-700" />} label="مكتمل ومحصّل" value={`${stats.completedRevenue.toFixed(0)} د.أ`} />
          <Stat icon={<TrendingUp className="h-5 w-5 text-blue-600" />} label="إيرادات قادمة" value={`${stats.upcomingRevenue.toFixed(0)} د.أ`} sub="حجوزات مؤكّدة قادمة" />
          <Stat icon={<Clock className="h-5 w-5 text-amber-600" />} label="عرابين معلّقة" value={`${stats.pendingDeposits.toFixed(0)} د.أ`} sub="لم يصل العربون بعد" />
        </div>

        <div className="rounded-sm border border-border bg-card p-6 shadow-soft mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-gold" />
            <h2 className="font-serif text-2xl">الإيرادات الشهرية (آخر 12 شهر)</h2>
          </div>
          <div className="grid grid-cols-12 gap-2 items-end h-48">
            {stats.monthly.map((m) => (
              <div key={m.label} className="flex flex-col items-center justify-end h-full gap-2">
                <div className="text-[10px] text-muted-foreground">{m.revenue > 0 ? m.revenue.toFixed(0) : ""}</div>
                <div className="w-full bg-gold/20 hover:bg-gold/40 rounded-sm transition" style={{ height: `${(m.revenue / stats.peak) * 100}%`, minHeight: m.revenue > 0 ? "4px" : "0" }} title={`${m.revenue.toFixed(0)} د.أ — ${m.count} حجز`} />
                <div className="text-[10px] text-muted-foreground whitespace-nowrap">{m.label}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-4">متوسط قيمة الحجز: <strong className="text-foreground">{stats.avgTicket.toFixed(0)} د.أ</strong></div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-sm border border-border bg-card p-6 shadow-soft">
            <h2 className="font-serif text-xl mb-4">حسب الخدمة</h2>
            {stats.services.length === 0 ? <p className="text-sm text-muted-foreground">لا بيانات.</p> : stats.services.map(([name, v]) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium">{name}</div>
                  <div className="text-xs text-muted-foreground">{v.count} حجز</div>
                </div>
                <div className="text-sm font-medium">{v.revenue.toFixed(0)} د.أ</div>
              </div>
            ))}
          </div>

          <div className="rounded-sm border border-border bg-card p-6 shadow-soft">
            <h2 className="font-serif text-xl mb-4">حسب الحالة</h2>
            {Object.entries(stats.statusCounts).length === 0 ? <p className="text-sm text-muted-foreground">لا بيانات.</p> : Object.entries(stats.statusCounts).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="text-sm">{statusLabel(k)}</div>
                <div className="text-sm font-medium">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: any; label: string; value: any; sub?: string }) {
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">{icon}<span>{label}</span></div>
      <div className="font-serif text-2xl">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function statusLabel(s: string) {
  switch (s) {
    case "quote": return "عرض سعر";
    case "pending_deposit": return "بانتظار العربون";
    case "confirmed": return "مؤكّد";
    case "completed": return "مكتمل";
    case "cancelled": return "ملغى";
    default: return s;
  }
}