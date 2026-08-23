import { Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { PremiumLock, useSubscriptionLock } from "@/components/ui/PremiumLock";
import { useServerFn } from "@tanstack/react-start";
import { DollarSign, TrendingUp, Wallet, Clock, CheckCircle2, Download } from "lucide-react";
import { getReportStats, type ReportStats } from "@/lib/reports.functions";

export const Route = createFileRoute("/_authenticated/dashboard/reports")({ component: ReportsPage });

function ReportsPage() {
  const { isLocked, lockLoading } = useSubscriptionLock();

  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [range, setRange] = useState<"30" | "90" | "365" | "all">("365");
  const [err, setErr] = useState<string | null>(null);
  const statsFn = useServerFn(getReportStats);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return nav({ to: "/login" });
        const data = await statsFn({ data: { range } });
        setStats(data as ReportStats);
      } catch (e: any) {
        setErr("تعذّر تحميل التقارير. تحقّق من اتصالك وحاول مجدداً.");
        console.error("[reports] fetch error:", e?.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  if (loading) return <PageLoader />;
  if (err || !stats) return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-24 text-center">
        <BackToDashboard />
        <p className="text-destructive mt-8">{err || "لا توجد بيانات."}</p>
      </section>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12">
        <BackToDashboard />
        <div className="flex flex-wrap items-end justify-between gap-3 mt-2 mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">تقارير ماليتي</div>
            <h1 className="font-serif text-4xl">ملخّص الأداء المالي</h1>
          </div>
          <div className="flex gap-2 items-center">
            <select value={range} onChange={(e) => setRange(e.target.value as any)} className="border border-border rounded-sm px-3 py-2 bg-background text-sm">
              <option value="30">آخر 30 يوماً</option>
              <option value="90">آخر 90 يوماً</option>
              <option value="365">آخر سنة</option>
              <option value="all">كل الفترات</option>
            </select>
          </div>
        </div>

        {stats.count === 0 && (
          <div className="rounded-sm border border-border bg-card p-12 text-center mb-8 shadow-soft">
            <p className="text-muted-foreground">لا توجد حجوزات في هذه الفترة الزمنية بعد.</p>
          </div>
        )}

        {/* KPIs — الصف الأول */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Stat icon={<DollarSign className="h-5 w-5 text-emerald-600" />} label="إجمالي الإيرادات" value={`${stats.totalRevenue.toFixed(0)} د.أ`} sub={`${stats.count} حجز`} />
          <Stat icon={<CheckCircle2 className="h-5 w-5 text-emerald-700" />} label="مكتمل ومحصّل" value={`${stats.completedRevenue.toFixed(0)} د.أ`} />
          <Stat icon={<TrendingUp className="h-5 w-5 text-blue-600" />} label="إيرادات قادمة" value={`${stats.upcomingRevenue.toFixed(0)} د.أ`} sub="حجوزات مؤكّدة قادمة" />
          <Stat icon={<Clock className="h-5 w-5 text-amber-600" />} label="عربين معلّقة" value={`${stats.pendingDeposits.toFixed(0)} د.أ`} sub="لم يصل العربون بعد" />
        </div>

        {/* KPIs — الصف الثاني (التحليلات المتقدّمة) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Stat
            icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
            label="معدّل التحويل"
            value={`${stats.conversionRate}%`}
            sub="من الطلبات → حجوزات مؤكّدة"
          />
          <Stat
            icon={<DollarSign className="h-5 w-5 text-cyan-600" />}
            label="هذا الشهر"
            value={`${stats.thisMonthRevenue.toFixed(0)} د.أ`}
            sub={stats.revenueGrowth !== null
              ? stats.revenueGrowth >= 0
                ? `▲ ${stats.revenueGrowth}% عن الشهر الماضي`
                : `▼ ${Math.abs(stats.revenueGrowth)}% عن الشهر الماضي`
              : "لا توجد شهر مقارنة"}
            subColor={stats.revenueGrowth !== null && stats.revenueGrowth >= 0 ? "text-emerald-600" : "text-red-500"}
          />
          <Stat
            icon={<CheckCircle2 className="h-5 w-5 text-indigo-600" />}
            label="أعلى خدمة"
            value={stats.topService === "photography" ? "تصوير" : stats.topService === "cinematic_video" ? "فيديو سينمائي" : stats.topService ?? "—"}
            sub="الأكثر طلباً"
          />
          <Stat
            icon={<DollarSign className="h-5 w-5 text-orange-600" />}
            label="متوسط التذكرة"
            value={`${(stats.avgTicket || 0).toFixed(0)} د.أ`}
            sub="لكل حجز مؤكّد"
          />
        </div>

        {/* قمع الحجز (Funnel) */}
        {stats.funnel.length > 0 && (
          <div className="rounded-sm border border-border bg-card p-6 shadow-soft mb-8">
            <h2 className="font-serif text-xl mb-4">قمع الحجز</h2>
            <div className="space-y-2">
              {stats.funnel.map((f, i) => {
                const maxCount = Math.max(...stats.funnel.map(x => x.count), 1);
                const pct = (f.count / maxCount) * 100;
                return (
                  <div key={f.stage} className="flex items-center gap-3">
                    <div className="text-sm w-28 text-left">{f.label}</div>
                    <div className="flex-1 bg-secondary rounded-sm h-8 relative overflow-hidden active:scale-95 transition-transform duration-200">
                      <div
                        className="h-full rounded-sm transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: f.stage === "cancelled" ? "#ef4444" : ["#a07a32", "#c4a04e", "#5b9279", "#3b82f6", "#10b981", "#ef4444"][i] || "#a07a32",
                        }}
                      />
                    </div>
                    <div className="text-sm font-medium w-12 text-left">{f.count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* الإيرادات الشهرية */}
        <div className="rounded-sm border border-border bg-card p-6 shadow-soft mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-gold" />
            <h2 className="font-serif text-2xl">الإيرادات الشهرية (آخر 12 شهر)</h2>
          </div>
          <div className="grid grid-cols-12 gap-2 items-end h-48">
            {stats.monthly.map((m) => {
              const peak = Math.max(1, ...stats.monthly.map(x => x.revenue));
              return (
                <div key={m.label} className="flex flex-col items-center justify-end h-full gap-2">
                  <div className="text-[10px] text-muted-foreground">{m.revenue > 0 ? m.revenue.toFixed(0) : ""}</div>
                  <div className="w-full bg-gold/20 hover:bg-gold/40 rounded-sm transition" style={{ height: `${(m.revenue / peak) * 100}%`, minHeight: m.revenue > 0 ? "4px" : "0" }} title={`${m.revenue.toFixed(0)} د.أ — ${m.count} حجز`} />
                  <div className="text-[10px] text-muted-foreground whitespace-nowrap">{m.label}</div>
                </div>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground mt-4">متوسط قيمة الحجز: <strong className="text-foreground">{stats.avgTicket.toFixed(0)} د.أ</strong></div>
        </div>

        {/* حسب الخدمة + حسب الحالة */}
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
            {Object.keys(stats.statusCounts).length === 0 ? <p className="text-sm text-muted-foreground">لا بيانات.</p> : Object.entries(stats.statusCounts).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="text-sm">{statusLabel(k)}</div>
                <div className="text-sm font-medium">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* مصادر العملاء (Referrals) */}
        {stats.referralSources.length > 0 && (
          <div className="rounded-sm border border-border bg-card p-6 shadow-soft mb-8">
            <h2 className="font-serif text-xl mb-4">مصادر العملاء</h2>
            {stats.referralSources.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="text-sm">مصدر #{i + 1}</div>
                <div className="text-sm font-medium">{r.count} حجز</div>
              </div>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}

function Stat({ icon, label, value, sub, subColor }: { icon: any; label: string; value: any; sub?: string; subColor?: string }) {
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">{icon}<span>{label}</span></div>
      <div className="font-serif text-2xl">{value}</div>
      {sub && <div className={["text-xs mt-1", subColor ?? "text-muted-foreground"].join(" ")}>{sub}</div>}
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