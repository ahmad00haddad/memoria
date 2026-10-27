import { Lightbulb } from "lucide-react";
import { g } from "@/hooks/use-gender";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
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
import { computeReportStats } from "@/lib/report-stats";
import { t, tx } from "@/i18n";

export const Route = createFileRoute("/_authenticated/dashboard/reports")({ component: ReportsPage });

function ReportsPage() {
  const { isLocked, lockLoading } = useSubscriptionLock();

  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [range, setRange] = useState<"30" | "90" | "365" | "all">("365");
  const [err, setErr] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const statsFn = useServerFn(getReportStats);

  // تصدير الحجوزات ضمن الفترة المختارة كملف CSV يفتح في Excel
  const exportCsv = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      let q = supabase.from("bookings")
        .select("event_date,client_name,client_phone,service,status,total_price,deposit_amount,final_paid_at,venue_name")
        .eq("photographer_id", session.user.id).is("deleted_at", null).order("event_date", { ascending: false });
      if (range !== "all") q = q.gte("event_date", new Date(Date.now() - Number(range) * 86400000).toISOString().slice(0, 10));
      const { data, error } = await q;
      if (error) throw error;
      const head = [t("التاريخ"), t("العميلة"), t("الهاتف"), t("الخدمة"), t("الحالة"), t("الإجمالي"), t("العربون"), t("الدفعة النهائية"), t("المكان")];
      const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const rows = (data ?? []).map((b: any) => [b.event_date, b.client_name, b.client_phone, b.service === "cinematic_video" ? t("فيديو") : t("تصوير"), statusLabel(b.status), b.total_price, b.deposit_amount, b.final_paid_at ? t("مستلمة") : "", b.venue_name].map(esc).join(","));
      // BOM حتى يقرأ Excel الأحرف العربية بشكل صحيح
      const blob = new Blob(["\ufeff" + [head.map(esc).join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `memoria-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(t("صُدّر {0} حجزاً", [rows.length]));
    } catch (e: any) {
      toast.error(e?.message || t("تعذّر التصدير"));
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    (async () => {
      setFetching(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return nav({ to: "/login" });
        // نحاول حسابات الخادم أولاً؛ إذا فشل أو أعاد شكلاً غير متوقّع نحسب في المتصفح
        // من نفس الحجوزات (محمية بـ RLS) حتى لا تتعطّل الصفحة.
        let data: any = null;
        try { data = await statsFn({ data: { range } }); } catch (e: any) { console.warn("[reports] server stats failed, using local", e?.message); }
        if (!data || !Array.isArray(data.monthly) || !Array.isArray(data.funnel) || !Array.isArray(data.services)) {
          const { data: bks, error } = await supabase
            .from("bookings")
            .select("id, client_name, event_date, service, status, total_price, deposit_amount, deposit_confirmed_at, delivered_at, created_at, cancelled_at")
            .eq("photographer_id", session.user.id)
            .is("deleted_at", null)
            .order("event_date", { ascending: false });
          if (error) throw error;
          data = computeReportStats((bks ?? []) as any, range);
        }
        setStats(data as ReportStats);
        setErr(null);
      } catch (e: any) {
        setErr(t("تعذّر تحميل التقارير. تحقّق من اتصالك وحاول مجدداً."));
        console.error("[reports] fetch error:", e?.message);
      } finally {
        setLoading(false);
        setFetching(false);
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
        <p className="text-destructive mt-8">{err || t("لا توجد بيانات.")}</p>
      </section>
      <Footer />
    </div>
  );

  const peak = Math.max(1, ...stats.monthly.map((x) => x.revenue));
  const best = stats.monthly.reduce((a, m) => (m.revenue > a.revenue ? m : a), stats.monthly[0] ?? { label: "", revenue: 0, count: 0 });
  const RANGES = [["30", t("٣٠ يوماً")], ["90", t("٣ أشهر")], ["365", t("سنة")], ["all", t("الكل")]] as const;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12">
        <BackToDashboard />
        <div className="flex flex-wrap items-end justify-between gap-3 mt-2 mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">{t("التقارير")}</div>
            <h1 className="font-serif text-4xl">{t("أداؤك المالي")}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-full bg-secondary p-1 text-xs" role="tablist" aria-label={t("الفترة")}>
              {RANGES.map(([k, l]) => (
                <button key={k} role="tab" aria-selected={range === k} onClick={() => setRange(k)} className={`relative rounded-full px-3 py-1.5 transition-colors ${range === k ? "text-foreground" : "text-muted-foreground"}`}>
                  {range === k && <motion.span layoutId="reports-range" className="absolute inset-0 rounded-full bg-card shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                  <span className="relative">{tx(l)}</span>
                </button>
              ))}
            </div>
            <button onClick={exportCsv} disabled={exporting} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs hover:border-gold/50 hover:text-gold disabled:opacity-60">
              {exporting ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : <Download className="h-3.5 w-3.5" />}
              {t("تصدير CSV")}
            </button>
          </div>
        </div>

        <div className={`transition-opacity duration-300 ${fetching ? "opacity-50" : "opacity-100"}`}>
        {stats.count === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center mb-8">
            <p className="text-muted-foreground">{g(t("لا حجوزات في هذه الفترة. جرّبي فترة أطول."), t("لا حجوزات في هذه الفترة. جرّب فترة أطول."))}</p>
          </div>
        )}

        {/* ٤ أرقام أساسية، والباقي عند الطلب */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
          <Stat
            icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
            label={t("هذا الشهر")}
            value={t("{0} د.أ", [stats.thisMonthRevenue.toFixed(0)])}
            sub={stats.revenueGrowth !== null
              ? stats.revenueGrowth >= 0 ? t("+{0}٪ عن الشهر الماضي", [stats.revenueGrowth]) : t("{0}٪ عن الشهر الماضي", [stats.revenueGrowth])
              : t("لا شهر سابق للمقارنة")}
            subColor={stats.revenueGrowth !== null && stats.revenueGrowth >= 0 ? "text-emerald-600" : stats.revenueGrowth !== null ? "text-amber-700 dark:text-amber-400" : undefined}
          />
          <Stat icon={<TrendingUp className="h-5 w-5 text-blue-600" />} label={t("إيرادات قادمة")} value={t("{0} د.أ", [stats.upcomingRevenue.toFixed(0)])} sub={t("من حجوزات مؤكّدة")} />
          <Stat icon={<Clock className="h-5 w-5 text-amber-600" />} label={t("عرابين معلّقة")} value={t("{0} د.أ", [stats.pendingDeposits.toFixed(0)])} sub={t("لم تصل بعد")} />
          <Stat icon={<CheckCircle2 className="h-5 w-5 text-purple-600" />} label={t("معدّل التحويل")} value={t("{0}٪", [stats.conversionRate])} sub={t("من الطلبات إلى حجوزات مؤكّدة")} />
        </div>
        <AnimatePresence initial={false}>
          {showMore && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-1 pb-3">
                <Stat icon={<DollarSign className="h-5 w-5 text-emerald-700" />} label={t("إجمالي الإيرادات")} value={t("{0} د.أ", [stats.totalRevenue.toFixed(0)])} sub={t("{0} حجزاً", [stats.count])} />
                <Stat icon={<CheckCircle2 className="h-5 w-5 text-emerald-700" />} label={t("مكتمل ومحصّل")} value={t("{0} د.أ", [stats.completedRevenue.toFixed(0)])} />
                <Stat icon={<CheckCircle2 className="h-5 w-5 text-indigo-600" />} label={t("الخدمة الأكثر طلباً")} value={stats.topService === "photography" ? t("تصوير") : stats.topService === "cinematic_video" ? t("فيديو") : stats.topService ?? "—"} />
                <Stat icon={<DollarSign className="h-5 w-5 text-orange-600" />} label={t("متوسط قيمة الحجز")} value={t("{0} د.أ", [(stats.avgTicket || 0).toFixed(0)])} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={() => setShowMore((v) => !v)} aria-expanded={showMore} className="mb-8 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          {showMore ? t("أرقام أقل") : t("كل الأرقام")} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showMore ? "rotate-180" : ""}`} />
        </button>

        {/* الإيرادات الشهرية */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
            <h2 className="font-serif text-2xl flex items-center gap-2"><Wallet className="h-5 w-5 text-gold" />{" "}{t("آخر ١٢ شهراً")}</h2>
            {best && best.revenue > 0 && <span className="text-xs text-muted-foreground">{t("أفضل شهر:")}{" "}<strong className="text-foreground">{tx(best.label)}</strong>{" "}{t("بـ {0} د.أ", [best.revenue.toFixed(0)])}</span>}
          </div>
          <div className="grid grid-cols-12 gap-1.5 sm:gap-2 items-end h-48">
            {stats.monthly.map((m, i) => {
              const isLast = i === stats.monthly.length - 1;
              return (
                <div key={m.label} className="group relative flex flex-col items-center justify-end h-full gap-2">
                  <span className="pointer-events-none absolute -top-2 z-10 whitespace-nowrap rounded-md bg-charcoal px-2 py-1 text-[10px] text-ivory opacity-0 transition-opacity group-hover:opacity-100 tabular-nums">
                    {t("{0} د.أ · {1} حجز", [m.revenue.toFixed(0), m.count])}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(m.revenue / peak) * 100}%` }}
                    transition={{ delay: i * 0.04, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className={`w-full rounded-t-md transition-colors ${isLast ? "bg-gold" : "bg-gold/25 group-hover:bg-gold/50"}`}
                    style={{ minHeight: m.revenue > 0 ? 4 : 0 }}
                  />
                  <div className={`text-[10px] whitespace-nowrap ${isLast ? "text-foreground font-medium" : "text-muted-foreground"}`}>{tx(m.label)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* قمع الحجز */}
        {stats.funnel.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 mb-8">
            <h2 className="font-serif text-xl mb-4">{t("من الطلب إلى التسليم")}</h2>
            <div className="space-y-2">
              {stats.funnel.map((f, i) => {
                const maxCount = Math.max(...stats.funnel.map((x) => x.count), 1);
                const pct = (f.count / maxCount) * 100;
                return (
                  <div key={f.stage} className="flex items-center gap-3">
                    <div className="text-sm w-28 shrink-0">{tx(f.label)}</div>
                    <div className="flex-1 bg-secondary rounded-full h-7 relative overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className={`h-full rounded-full ${f.stage === "cancelled" ? "bg-destructive/60" : "bg-gold"}`}
                        style={{ opacity: f.stage === "cancelled" ? 1 : 1 - i * 0.12 }}
                      />
                    </div>
                    <div className="text-sm font-medium w-10 tabular-nums">{tx(f.count)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* حسب الخدمة + حسب الحالة */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-serif text-xl mb-4">{t("حسب الخدمة")}</h2>
            {stats.services.length === 0 ? <p className="text-sm text-muted-foreground">{t("لا بيانات.")}</p> : stats.services.map(([name, v]) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium">{name === "photography" ? t("تصوير") : name === "cinematic_video" ? t("فيديو سينمائي") : name}</div>
                  <div className="text-xs text-muted-foreground">{t("{0} حجز", [v.count])}</div>
                </div>
                <div className="text-sm font-medium tabular-nums">{t("{0} د.أ", [v.revenue.toFixed(0)])}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-serif text-xl mb-4">{t("حسب الحالة")}</h2>
            {Object.keys(stats.statusCounts).length === 0 ? <p className="text-sm text-muted-foreground">{t("لا بيانات.")}</p> : Object.entries(stats.statusCounts).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="text-sm">{statusLabel(k)}</div>
                <div className="text-sm font-medium tabular-nums">{tx(v)}</div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Stat({ icon, label, value, sub, subColor }: { icon: any; label: string; value: any; sub?: string; subColor?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 [&_svg]:h-4 [&_svg]:w-4">{tx(icon)}<span>{tx(label)}</span></div>
      <div className="font-serif text-3xl tabular-nums">{tx(value)}</div>
      {sub && <div className={["text-xs mt-1", subColor ?? "text-muted-foreground"].join(" ")}>{tx(sub)}</div>}
    </div>
  );
}

function statusLabel(s: string) {
  switch (s) {
    case "quote": return t("عرض سعر");
    case "pending_deposit": return t("بانتظار العربون");
    case "confirmed": return t("مؤكّد");
    case "completed": return t("مكتمل");
    case "cancelled": return t("ملغى");
    default: return s;
  }
}