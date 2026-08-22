import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Calendar,
  DollarSign,
  Star,
  ArrowLeft,
  Bell,
  CircleDashed,
  ListChecks,
  TrendingUp,
  Send,
  MessageCircle,
  X,
  PartyPopper,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { NotificationPermission } from "@/components/NotificationPermission";
import { staggerContainer, fadeUp } from "@/lib/animations";
import { useCountUp } from "@/hooks/use-count-up";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Dashboard,
});

function NumStat({
  icon,
  label,
  value,
  suffix = "",
  fractionDigits = 0,
  fallback,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  fractionDigits?: number;
  fallback?: string;
}) {
  const animated = useCountUp(Number.isFinite(value) ? value : 0);
  const display = fallback !== undefined && value === 0
    ? fallback
    : animated.toFixed(fractionDigits) + suffix;
  return (
    <motion.div
      variants={fadeUp}
      className="rounded-sm border border-border bg-card p-4 hover:shadow-soft transition-shadow min-w-[140px]"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">{icon}<span>{label}</span></div>
      <div className="font-serif text-2xl tabular-nums">{display}</div>
    </motion.div>
  );
}

function SubscriptionBanner({ sub }: { sub: any }) {
  if (!sub) return null;
  const trialEnds = new Date(sub.trial_ends_at);
  const periodEnds = sub.current_period_end ? new Date(sub.current_period_end) : null;
  const daysLeft = sub.status === "trial"
    ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / 86400000))
    : periodEnds ? Math.max(0, Math.ceil((periodEnds.getTime() - Date.now()) / 86400000)) : 0;

  const config: Record<string, { icon: any; bg: string; text: string; cta: string }> = {
    trial: { icon: <Sparkles className="h-5 w-5 text-gold" />, bg: "bg-gold/10 border-gold/40 dark:bg-gold/5", text: `تجربة مجانية — متبقّي ${daysLeft} يوماً`, cta: "اشتركي الآن" },
    active: { icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />, bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-400", text: `اشتراك نشط - ينتهي بعد ${daysLeft} يومًا`, cta: "إدارة الاشتراك" },
    pending_review: { icon: <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />, bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-400", text: "بانتظار مراجعة الإدارة - الموافقة تستغرق عادةً 24 ساعة", cta: "حالة الاشتراك" },
    expired: { icon: <AlertTriangle className="h-5 w-5 text-destructive dark:text-red-400" />, bg: "bg-destructive/10 border-destructive/40 dark:bg-red-950/40 dark:border-red-900", text: "انتهى اشتراكك — جدّدي للاستمرار", cta: "جدّدي الاشتراك" },
    canceled: { icon: <AlertTriangle className="h-5 w-5 text-muted-foreground" />, bg: "bg-secondary border-border", text: "اشتراكك ملغى", cta: "إعادة التفعيل" },
  };
  const c = config[sub.status] ?? config.trial;

  return (
    <div className={`mb-8 rounded-sm border p-4 flex items-center justify-between gap-4 ${c.bg}`}>
      <div className="flex items-center gap-3">
        {c.icon}
        <div className="text-sm font-medium">{c.text}</div>
      </div>
      <Link to="/dashboard/subscription" className="bg-charcoal text-ivory text-xs px-4 py-2 rounded-sm hover:opacity-90 whitespace-nowrap">
        {c.cta}
      </Link>
    </div>
  );
}

// ── مكوّن "ابدئي هنا" للمستخدمة الجديدة — ٣ خطوات واضحة فقط ──────────────────
function NewUserWelcome({ profile, pricingCount, hasCliq }: { profile: any; pricingCount: number; hasCliq: boolean }) {
  const steps = [
    {
      num: 1,
      title: "أكملي ملفك وأضيفي أول باقة",
      why: "بعد هذه الخطوة يستطيع العميل رؤية اسمك وسعرك — جاهزة للحجز",
      done: !!profile?.display_name && !!profile?.username && pricingCount > 0,
      to: pricingCount === 0 ? "/dashboard/pricing" : "/dashboard/profile",
      cta: "ابدئي من هنا",
    },
    {
      num: 2,
      title: "أضيفي طريقة استقبال العربون",
      why: "CliQ alias أو واتساب — تظهر للعميل فقط بعد تأكيد الحجز، بياناتك محمية",
      done: hasCliq,
      to: "/dashboard/profile",
      cta: "أضيفي بيانات الدفع",
    },
    {
      num: 3,
      title: "انشري ملفك وشاركيه",
      why: "بنقرة واحدة يصبح ملفك مرئياً ويمكن للعملاء طلب الحجز مباشرة",
      done: !!profile?.is_published && !!profile?.username,
      to: "/dashboard/profile",
      cta: "فعّلي النشر",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const activeIdx = steps.findIndex((s) => !s.done);

  return (
    <div className="mb-10">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">خطوات البداية</div>
        <h2 className="font-serif text-3xl mb-1">٣ خطوات وملفك جاهز ✨</h2>
        <p className="text-sm text-muted-foreground">تستغرق أقل من ٥ دقائق</p>
        {/* شريط التقدم */}
        <div className="flex items-center justify-center gap-2 mt-4 max-w-[200px] mx-auto">
          {steps.map((s, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-500 ${s.done ? "bg-gold" : i === activeIdx ? "bg-gold/40" : "bg-secondary"}`} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{doneCount} من {steps.length} مكتملة</p>
      </div>

      {/* الخطوات */}
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => {
          const isActive = i === activeIdx;
          return (
            <div key={s.num} className={`relative rounded-sm border p-5 transition-all ${
              s.done
                ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                : isActive
                  ? "border-gold/50 bg-gold/5 shadow-elegant"
                  : "border-border bg-card opacity-40 pointer-events-none"
            }`}>
              {/* رقم الخطوة */}
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold mb-4 ${
                s.done
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : isActive
                    ? "bg-gold/20 text-gold"
                    : "bg-secondary text-muted-foreground"
              }`}>
                {s.done ? <CheckCircle2 className="h-4 w-4" /> : s.num}
              </div>
              <h3 className="font-medium text-base mb-1.5 leading-snug">{s.title}</h3>
              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">{s.why}</p>
              {s.done ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> اكتملت ✓
                </span>
              ) : isActive ? (
                <Link to={s.to} className="inline-flex items-center gap-2 bg-charcoal text-ivory text-sm px-5 py-2.5 rounded-sm hover:opacity-90 transition-opacity">
                  {s.cta} <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── حالة الجاهزية المبسّطة (للمستخدمة النشطة التي لم تكمل بعض الخطوات) ────────
function QuickStart({ profile, pricingCount, bookingCount, hasCliq, templatesCount, onDismiss }: { profile: any; pricingCount: number; bookingCount: number; hasCliq: boolean; templatesCount: number; onDismiss: () => void }) {
  const steps = [
    { title: "الملف الشخصي", done: !!profile?.display_name && !!profile?.username && !!profile?.avatar_url, to: "/dashboard/profile", cta: "تعديل" },
    { title: `الأسعار${pricingCount > 0 ? ` (${pricingCount})` : ""}`, done: pricingCount > 0, to: "/dashboard/pricing", cta: "إضافة" },
    { title: "بيانات الدفع", done: hasCliq, to: "/dashboard/profile", cta: "إعداد" },
    { title: "النشر العام", done: !!profile?.is_published, to: "/dashboard/profile", cta: "نشر" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  return (
    <div className="mb-8 rounded-sm border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-gold" />
          <span className="text-sm font-medium">إعداد الحساب</span>
          <span className="text-xs text-muted-foreground tabular-nums">({doneCount}/{steps.length})</span>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground p-1 rounded-sm hover:bg-secondary" aria-label="إخفاء">
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* شريط تقدم */}
      <div className="flex gap-1.5 mb-4">
        {steps.map((s, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${s.done ? "bg-gold" : "bg-secondary"}`} />
        ))}
      </div>
      {allDone ? (
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <PartyPopper className="h-4 w-4" /> حسابك جاهز تماماً! 🎉
          </span>
          <button onClick={onDismiss} className="text-xs text-muted-foreground hover:text-foreground underline">إخفاء</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {steps.filter((s) => !s.done).map((s) => (
            <Link key={s.title} to={s.to} className="inline-flex items-center gap-1.5 text-xs border border-border rounded-sm px-3 py-1.5 hover:bg-secondary hover:border-gold/40 transition-colors">
              <CircleDashed className="h-3 w-3 text-muted-foreground" />
              {s.title}
              <span className="text-gold">← {s.cta}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-sm" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="min-h-[190px] w-full rounded-sm" />
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Card({ title, desc, cta, to, external, disabled, icon, badge }: { title: string; desc: string; cta: string; to?: string; external?: boolean; disabled?: boolean; icon?: any; badge?: boolean }) {
  const sharedClassName = `group flex min-h-[190px] flex-col justify-between rounded-sm border border-border bg-card p-6 shadow-soft transition ${disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5 hover:border-gold/40 hover:bg-secondary/20 hover:shadow-elegant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"}`;
  const content = (
    <>
      <div>
        <h3 className="font-serif text-xl mb-1 flex items-center gap-2">
          {title}
          {badge && <span className="h-2 w-2 rounded-full bg-gold shadow-[0_0_8px_rgba(201,162,39,0.8)] animate-pulse" />}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
      <div className="mt-6 inline-flex items-center gap-2 text-sm text-gold">
        {icon}
        <span className="border-b border-current pb-0.5">{disabled ? "أكملي اسم المستخدم أولاً" : cta}</span>
        {!disabled && <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />}
      </div>
    </>
  );
  if (!to || disabled) return <div className={sharedClassName}>{content}</div>;
  if (external) return <a href={to} className={sharedClassName}>{content}</a>;
  return <Link to={to} className={sharedClassName}>{content}</Link>;
}

let cachedDashboard: {
  profile: any;
  sub: any;
  pricingCount: number;
  hasCliq: boolean;
  templatesCount: number;
  stats: any;
} | null = null;

function Dashboard() {
  const [profile, setProfile] = useState<any>(cachedDashboard?.profile ?? null);
  const [sub, setSub] = useState<any>(cachedDashboard?.sub ?? null);
  const [loading, setLoading] = useState(!cachedDashboard);
  const [pricingCount, setPricingCount] = useState(cachedDashboard?.pricingCount ?? 0);
  const [hasCliq, setHasCliq] = useState(cachedDashboard?.hasCliq ?? false);
  const [templatesCount, setTemplatesCount] = useState(cachedDashboard?.templatesCount ?? 0);
  const [stats, setStats] = useState(cachedDashboard?.stats ?? { confirmed: 0, pending: 0, completed: 0, revenue: 0, avgRating: 0, reviews: 0, monthRevenue: 0, upcoming30: 0, pendingDepositsAmount: 0, deliveriesDueSoon: 0 });
  const [qsDismissed, setQsDismissed] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);
  const navigate = useNavigate();

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate({ to: "/login" }); return; }
    try {
      const pendingRef = sessionStorage.getItem("pending_referral_code");
      if (pendingRef) {
        const { recordReferralAfterSignup } = await import("@/lib/booking.functions");
        await recordReferralAfterSignup({ data: { referral_code: pendingRef } });
        sessionStorage.removeItem("pending_referral_code");
        toast.success("تم تطبيق رمز الإحالة بنجاح!");
      }
    } catch (e) { sessionStorage.removeItem("pending_referral_code"); }
    const [{ data }, { data: priv }, { data: s }, { data: bks }, { data: rvs }, { count: pricingRulesCount }, { count: tplCount }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
      supabase.from("photographer_private").select("ical_token,cliq_alias,whatsapp,phone").eq("user_id", session.user.id).maybeSingle(),
      supabase.from("subscriptions").select("*").eq("photographer_id", session.user.id).maybeSingle(),
      supabase.from("bookings").select("status,total_price,deposit_amount,event_date,delivery_due_at,production_stage").eq("photographer_id", session.user.id).is("deleted_at", null),
      supabase.from("reviews").select("rating").eq("photographer_id", session.user.id),
      supabase.from("pricing_rules").select("id", { count: "exact", head: true }).eq("photographer_id", session.user.id),
      supabase.from("whatsapp_templates").select("id", { count: "exact", head: true }).eq("photographer_id", session.user.id),
    ]);
    if (data && !(data as any).onboarding_completed_at) {
      navigate({ to: "/onboarding" });
      return;
    }
    const all = bks ?? [];
    const confirmed = all.filter((b: any) => b.status === "confirmed").length;
    const pending = all.filter((b: any) => b.status === "pending_deposit" || b.status === "quote").length;
    const completed = all.filter((b: any) => b.status === "completed").length;
    const revenue = all.filter((b: any) => b.status === "confirmed" || b.status === "completed").reduce((sum: number, b: any) => sum + Number(b.total_price ?? 0), 0);
    const now = Date.now();
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const monthRevenue = all.filter((b: any) => (b.status === "confirmed" || b.status === "completed") && b.event_date && new Date(b.event_date).getTime() >= startOfMonth.getTime()).reduce((sum: number, b: any) => sum + Number(b.total_price ?? 0), 0);
    const upcoming30 = all.filter((b: any) => b.status === "confirmed" && b.event_date && new Date(b.event_date).getTime() >= now && new Date(b.event_date).getTime() <= now + 30 * 86400000).length;
    const pendingDepositsAmount = all.filter((b: any) => b.status === "pending_deposit").reduce((sum: number, b: any) => sum + Number(b.deposit_amount ?? 0), 0);
    const deliveriesDueSoon = all.filter((b: any) => b.delivery_due_at && b.production_stage !== "delivered" && new Date(b.delivery_due_at).getTime() <= now + 7 * 86400000).length;
    const avg = (rvs && rvs.length) ? rvs.reduce((sum, r) => sum + r.rating, 0) / rvs.length : 0;
    
    const computedStats = { confirmed, pending, completed, revenue, avgRating: avg, reviews: rvs?.length ?? 0, monthRevenue, upcoming30, pendingDepositsAmount, deliveriesDueSoon };
    const loadedProfile = { ...(data ?? {}), ical_token: priv?.ical_token ?? null };

    cachedDashboard = {
      profile: loadedProfile,
      sub: s,
      pricingCount: pricingRulesCount ?? 0,
      hasCliq: !!(priv?.cliq_alias || priv?.whatsapp || priv?.phone),
      templatesCount: tplCount ?? 0,
      stats: computedStats
    };

    setProfile(loadedProfile);
    setSub(s);
    setPricingCount(pricingRulesCount ?? 0);
    setHasCliq(!!(priv?.cliq_alias || priv?.whatsapp || priv?.phone));
    setTemplatesCount(tplCount ?? 0);
    setStats(computedStats);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [navigate]);

  const dismissQuickStart = async () => {
    setQsDismissed(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("profiles").update({ quickstart_dismissed_at: new Date().toISOString() } as any).eq("id", session.user.id);
      }
      toast.success("تم إخفاء حالة الجاهزية");
    } catch { toast.error("تعذّر الحفظ، حاولي مجدداً"); }
  };

  if (loading) return <DashboardSkeleton />;
  const onboardingNeeded = !profile?.display_name || !profile?.username || !profile?.avatar_url || pricingCount === 0;
  const totalBookings = stats.confirmed + stats.pending + stats.completed;
  // مستخدمة جديدة: ملف ناقص + لا حجوزات بعد
  const isNewUser = onboardingNeeded && totalBookings === 0;
  const hasAnyStats = stats.confirmed > 0 || stats.pending > 0 || stats.revenue > 0 || stats.reviews > 0;

  return (
    <PullToRefresh onRefresh={async () => { await loadData(); }}>
      <div className="min-h-screen bg-background sm:pb-0 pb-20">
        <div className="hidden sm:block">
          <Header />
        </div>
        <OnboardingWizard shouldShow={onboardingNeeded} />

        <section className="container-editorial py-6 sm:py-12">
        {/* Mobile Large Title */}
        <div className="sm:hidden mb-6 px-2 flex items-center justify-between">
          <h1 className="font-serif text-3xl font-bold">لوحتي</h1>
          <button onClick={signOut} className="text-sm border border-border px-3 py-1.5 rounded-sm hover:bg-secondary">خروج</button>
        </div>

        <div className="hidden sm:flex items-end justify-between mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">لوحة المصوّر</div>
            <h1 className="font-serif text-4xl">أهلاً، {profile?.display_name ?? "مصوّر"}</h1>
            <div className="text-sm text-muted-foreground mt-1">
              ملفك العام:{" "}
              {profile?.username ? (
                <Link to="/photographers/$username" params={{ username: profile.username }} className="text-gold underline">@{profile.username}</Link>
              ) : (
                <span>أكملي اسم المستخدم من الملف الشخصي</span>
              )}
            </div>
          </div>
          <button onClick={signOut} className="text-sm border border-border px-4 py-2 rounded-sm hover:bg-secondary">تسجيل الخروج</button>
        </div>

        <SubscriptionBanner sub={sub} />

        {!hasAnyStats && profile?.is_published && (
          <div className="mb-8 bg-gold/10 border border-gold/30 text-foreground rounded-sm p-4 text-sm flex items-start gap-3">
            <span className="text-xl">🚀</span>
            <div>
              <strong>بداية موفّقة!</strong> ملفكِ جاهز ومنشور، لكن لم تصلكِ حجوزات بعد.
              <br />
              💡 <em>تلميح:</em> انسخي رابط ملفكِ (<Link to="/photographers/$username" params={{ username: profile.username }} className="underline font-semibold text-gold">@{profile.username}</Link>) وضعيه في بايو الإنستجرام لتبدأ العرائس بالحجز مباشرة!
            </div>
          </div>
        )}

        {/* ── إحصائيات: مخفية للمستخدمة الجديدة وتُعرض فقط بعد أول نشاط ── */}
        {hasAnyStats && (
          <>
            {/* Stats — mobile horizontal scroll */}
            <div className="md:hidden overflow-x-auto scrollbar-none pb-2 -mx-4 px-4 mb-8">
              <div className="flex gap-3">
                <NumStat icon={<Calendar className="h-5 w-5 text-gold" />} label="حجوزات مؤكّدة" value={stats.confirmed} />
                <NumStat icon={<Clock className="h-5 w-5 text-amber-600" />} label="بانتظار العربون" value={stats.pending} />
                <NumStat icon={<DollarSign className="h-5 w-5 text-emerald-600" />} label="الإيرادات" value={stats.revenue} suffix=" د.أ" />
                <NumStat icon={<Star className="h-5 w-5 text-gold" />} label={`التقييم (${stats.reviews})`} value={stats.avgRating} fractionDigits={1} fallback={stats.avgRating ? undefined : "—"} />
              </div>
            </div>

            {/* Stats — desktop grid */}
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <NumStat icon={<Calendar className="h-5 w-5 text-gold" />} label="حجوزات مؤكّدة" value={stats.confirmed} />
              <NumStat icon={<Clock className="h-5 w-5 text-amber-600" />} label="بانتظار العربون" value={stats.pending} />
              <NumStat icon={<DollarSign className="h-5 w-5 text-emerald-600" />} label="الإيرادات" value={stats.revenue} suffix=" د.أ" />
              <NumStat icon={<Star className="h-5 w-5 text-gold" />} label={`التقييم (${stats.reviews})`} value={stats.avgRating} fractionDigits={1} fallback={stats.avgRating ? undefined : "—"} />
            </motion.div>

            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <NumStat icon={<TrendingUp className="h-5 w-5 text-emerald-700" />} label="إيرادات هذا الشهر" value={stats.monthRevenue} suffix=" د.أ" />
              <NumStat icon={<Calendar className="h-5 w-5 text-blue-600" />} label="حجوزات خلال 30 يوماً" value={stats.upcoming30} />
              <NumStat icon={<DollarSign className="h-5 w-5 text-amber-600" />} label="عرابين معلّقة" value={stats.pendingDepositsAmount} suffix=" د.أ" />
              <NumStat icon={<Send className="h-5 w-5 text-violet-600" />} label="تسليمات خلال 7 أيام" value={stats.deliveriesDueSoon} />
            </motion.div>
          </>
        )}

        {/* Quick Actions chips — mobile only (للمستخدمات النشطات فقط) */}
        {!isNewUser && (
          <div className="md:hidden overflow-x-auto scrollbar-none -mx-4 px-4 mb-6">
            <div className="flex gap-2 w-max">
              {([
                { icon: <Calendar className="h-4 w-4" />, label: 'الحجوزات', to: '/dashboard/bookings' },
                { icon: <ListChecks className="h-4 w-4" />, label: 'الإنتاج', to: '/dashboard/production' },
                { icon: <MessageCircle className="h-4 w-4" />, label: 'قوالب', to: '/dashboard/whatsapp-templates' },
                { icon: <TrendingUp className="h-4 w-4" />, label: 'التقارير', to: '/dashboard/reports' },
              ] as const).map((chip) => (
                <Link
                  key={chip.to}
                  to={chip.to}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border text-sm whitespace-nowrap"
                >
                  {chip.icon}
                  {chip.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Welcome / QuickStart: Progressive Disclosure ── */}
        {isNewUser ? (
          // مستخدمة جديدة → شاشة "ابدئي هنا" مبسّطة
          <NewUserWelcome profile={profile} pricingCount={pricingCount} hasCliq={hasCliq} />
        ) : (
          // مستخدمة نشطة → شريط حالة الجاهزية المضغوط (قابل للإخفاء)
          <AnimatePresence initial={false}>
            {!profile?.quickstart_dismissed_at && !qsDismissed && (
              <motion.div key="qs" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                <QuickStart profile={profile} pricingCount={pricingCount} bookingCount={totalBookings} hasCliq={hasCliq} templatesCount={templatesCount} onDismiss={dismissQuickStart} />
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* ── بطاقات الأدوات ── */}
        {isNewUser ? (
          // مستخدمة جديدة → ٣ بطاقات أساسية فقط + زر "عرض كل الأدوات"
          <div>
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid gap-6 md:grid-cols-3 mb-4">
              <Card title="الحجوزات" desc="راجعي الطلبات الواردة، أكّدي العربون وتابعي مراحل كل حجز." cta="عرض الحجوزات" to="/dashboard/bookings" />
              <Card title="الملف الشخصي" desc="الاسم، الصورة، الباقات، بيانات الدفع وإعدادات النشر." cta="تعديل الملف" to="/dashboard/profile" />
              <Card title="بطاقة الأسعار" desc="أضيفي باقاتك ليتمكن العميل من اختيار الخدمة المناسبة." cta="إدارة الأسعار" to="/dashboard/pricing" />
            </motion.div>
            <AnimatePresence>
              {showAllCards && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid gap-6 md:grid-cols-3 mb-4">
                    <Card title="متابعة الإنتاج" desc="لوحة كانبان من التصوير إلى التحرير إلى التسليم." cta="افتح اللوحة" to="/dashboard/production" />
                    <Card title="التقويم والتوفر" desc="حجب أيام معيّنة ومراجعة الحجوزات القادمة." cta="فتح التقويم" to="/dashboard/calendar" />
                    <Card title="التقارير المالية" desc="إيرادات شهرية، حسب الخدمة والحالة، وتصدير CSV." cta="عرض التقارير" to="/dashboard/reports" />
                    <Card title="العقود الرقمية" desc="قوالب وعقود توقيع إلكتروني." cta="إدارة العقود" to="/dashboard/contracts" />
                    <Card title="رسائل واتساب" desc="قوالب جاهزة (ترحيب، عربون، تذكير، تسليم) ترسليها بنقرة." cta="إدارة القوالب" to="/dashboard/whatsapp-templates" icon={<MessageCircle className="h-4 w-4" />} />
                    <Card title="الاشتراك" desc="حالة اشتراكك وتجديده ورفع إثبات الدفع." cta="إدارة الاشتراك" to="/dashboard/subscription" />
                    <Card title="الإشعارات" desc="جميع التنبيهات والتنقل السريع إلى العناصر المرتبطة بها." cta="عرض الإشعارات" to="/notifications" icon={<Bell className="h-4 w-4" />} />
                    <Card title="برنامج الإحالة" desc="ادعُ زميلة واربحا شهراً مجانياً للطرفين." cta="رابط الإحالة" to="/dashboard/referrals" />
                    <Card title="ملفي العام" desc="عرض ما يراه عملاؤك." cta="فتح الملف" to={profile?.username ? `/photographers/${profile.username}` : undefined} external={!!profile?.username} disabled={!profile?.username} />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="text-center mt-2">
              <button
                onClick={() => setShowAllCards((v) => !v)}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-sm px-5 py-2 hover:bg-secondary transition-colors"
              >
                {showAllCards ? "إخفاء الأدوات الإضافية" : "عرض كل الأدوات (" + 9 + ")"}
                <ArrowLeft className={`h-3.5 w-3.5 transition-transform ${showAllCards ? "rotate-90" : "-rotate-90"}`} />
              </button>
            </div>
          </div>
        ) : (
          // مستخدمة نشطة → كل البطاقات ظاهرة
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid gap-6 md:grid-cols-3">
              <Card title="ملف المصوّرة" desc="المعلومات الأساسية وصورة الغلاف ومعرض الأعمال." cta="تعديل الملف" to="/dashboard/profile" />
              <Card 
                title="بطاقات الأسعار" 
                desc="حددي الباقات الأساسية والإضافات." 
                cta="إدارة الباقات" 
                to="/dashboard/pricing" 
                badge={true} 
              />
            <Card title="التقويم والتوفر" desc="حجب أيام معيّنة ومراجعة الحجوزات القادمة." cta="فتح التقويم" to="/dashboard/calendar" />
            <Card title="الحجوزات" desc="جميع الطلبات والمؤكّدة والمنتهية." cta="عرض الحجوزات" to="/dashboard/bookings" />
            <Card title="متابعة الإنتاج" desc="لوحة كانبان من التصوير إلى التحرير إلى التسليم." cta="افتح اللوحة" to="/dashboard/production" />
            <Card title="التقارير المالية" desc="إيرادات شهرية، حسب الخدمة والحالة، وتصدير CSV." cta="عرض التقارير" to="/dashboard/reports" />
            <Card title="العقود الرقمية" desc="قوالب وعقود توقيع إلكتروني." cta="إدارة العقود" to="/dashboard/contracts" />
            <Card title="رسائل واتساب" desc="قوالب جاهزة (ترحيب، عربون، تذكير، تسليم) ترسليها بنقرة." cta="إدارة القوالب" to="/dashboard/whatsapp-templates" icon={<MessageCircle className="h-4 w-4" />} />
            <Card title="الاشتراك" desc="حالة اشتراكك وتجديده ورفع إثبات الدفع." cta="إدارة الاشتراك" to="/dashboard/subscription" />
            <Card title="الإشعارات" desc="جميع التنبيهات والتنقل السريع إلى العناصر المرتبطة بها." cta="عرض الإشعارات" to="/notifications" icon={<Bell className="h-4 w-4" />} />
            <Card title="برنامج الإحالة" desc="ادعُ زميلة واربحا شهراً مجانياً للطرفين." cta="رابط الإحالة" to="/dashboard/referrals" />
            <Card title="ملفي العام" desc="عرض ما يراه عملاؤك." cta="فتح الملف" to={profile?.username ? `/photographers/${profile.username}` : undefined} external={!!profile?.username} disabled={!profile?.username} />
          </motion.div>
        )}
      </section>
      <Footer />
    </div>
    </PullToRefresh>
  );
}
