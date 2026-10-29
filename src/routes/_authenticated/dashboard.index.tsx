import { arCount } from "@/lib/ar-count";
import { Lightbulb, Settings } from "lucide-react";
import { g } from "@/hooks/use-gender";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { playSound } from "@/lib/sounds";
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
  Plus, Package, Download, Link2, LogOut, CheckCircle2 as CheckCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { NotificationPermission } from "@/components/NotificationPermission";
import { staggerContainer, fadeUp } from "@/lib/animations";
import { useCountUp } from "@/hooks/use-count-up";
import { useIntro } from "@/lib/intro";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { CopyButton } from "@/components/ui/copy-button";
import { TodayFocus } from "@/components/dashboard/TodayFocus";
import { NotifyChannelsCard } from "@/components/dashboard/NotifyChannelsCard";
import { ToolIndex, Sparkline, type Tool } from "@/components/dashboard/ToolIndex";
import { computeFocusItems } from "@/components/dashboard/focus";
import { openCommandPalette } from "@/components/CommandPalette";
import { Search } from "lucide-react";
import { locale } from "@/i18n";
import { tx, t as tr } from "@/i18n";

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
  sub,
  subTone,
  extra,
  compact,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  fractionDigits?: number;
  fallback?: string;
  sub?: string;
  subTone?: "up" | "down";
  extra?: React.ReactNode;
  compact?: boolean;
}) {
  const intro = useIntro();
  const animated = useCountUp(Number.isFinite(value) ? value : 0);
  const display = fallback !== undefined && value === 0
    ? fallback
    : animated.toFixed(fractionDigits) + suffix;
  return (
    <motion.div
      variants={fadeUp}
      initial={compact && intro ? "hidden" : compact ? false : undefined}
      animate={compact ? "visible" : undefined}
      className={`min-w-0 rounded-2xl bg-card/60 ring-1 ring-border/70 transition-colors hover:ring-gold/40 ${compact ? "p-4" : "p-6"}`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 [&_svg]:h-4 [&_svg]:w-4">{tx(icon)}<span>{tx(label)}</span></div>
      <div className="flex items-end justify-between gap-3">
        <div className={`font-serif leading-none tabular-nums tracking-tight ${compact ? "text-3xl" : "text-4xl"}`}>{tx(display)}</div>
        {tx(extra)}
      </div>
      {sub && (
        <div className={`mt-3 text-xs truncate ${subTone === "down" ? "text-amber-700 dark:text-amber-400" : subTone === "up" ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
          {tx(sub)}
        </div>
      )}
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
    trial: { icon: <Sparkles className="h-5 w-5 text-gold" />, bg: "bg-gold/10 border-gold/40 dark:bg-gold/5", text: tr("تجربة مجانية — متبقّي {0} يوماً", [daysLeft]), cta: g(tr("اشتركي الآن"), tr("اشترك الآن")) },
    active: { icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />, bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-400", text: tr("اشتراك نشط - ينتهي بعد {0} يومًا", [daysLeft]), cta: tr("إدارة الاشتراك") },
    pending_review: { icon: <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />, bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-400", text: tr("بانتظار مراجعة الإدارة - الموافقة تستغرق عادةً 24 ساعة"), cta: tr("حالة الاشتراك") },
    expired: { icon: <AlertTriangle className="h-5 w-5 text-destructive dark:text-red-400" />, bg: "bg-destructive/10 border-destructive/40 dark:bg-red-950/40 dark:border-red-900", text: g(tr("انتهى اشتراكك — جدّدي للاستمرار"), tr("انتهى اشتراكك — جدّد للاستمرار")), cta: g(tr("جدّدي الاشتراك"), tr("جدّد الاشتراك")) },
    canceled: { icon: <AlertTriangle className="h-5 w-5 text-muted-foreground" />, bg: "bg-secondary border-border", text: tr("اشتراكك ملغى"), cta: tr("إعادة التفعيل") },
  };
  const c = config[sub.status] ?? config.trial;

  return (
    <div className={`mb-8 rounded-2xl border p-4 ps-5 flex items-center justify-between gap-4 ${c.bg}`}>
      <div className="flex items-center gap-3">
        {tx(c.icon)}
        <div className="text-sm font-medium">{tx(c.text)}</div>
      </div>
      <Link to="/dashboard/subscription" className="bg-charcoal text-ivory text-xs px-4 py-2 rounded-full hover:opacity-90 whitespace-nowrap active:scale-95 transition-transform duration-200 dark:bg-gold dark:text-charcoal">
        {tx(c.cta)}
      </Link>
    </div>
  );
}

// ── مكوّن "ابدئي هنا" للمستخدمة الجديدة — ٣ خطوات واضحة فقط ──────────────────
function NewUserWelcome({ profile, pricingCount, hasCliq }: { profile: any; pricingCount: number; hasCliq: boolean }) {
  const steps = [
    {
      num: 1,
      title: g(tr("أكملي ملفك وأضيفي أول باقة"), tr("أكمل ملفك وأضف أول باقة")),
      why: tr("بعد هذه الخطوة يستطيع العميل رؤية اسمك وسعرك — جاهزة للحجز"),
      done: !!profile?.display_name && !!profile?.username && pricingCount > 0,
      to: pricingCount === 0 ? "/dashboard/pricing" : "/dashboard/profile",
      cta: g(tr("ابدئي من هنا"), tr("ابدأ من هنا")),
    },
    {
      num: 2,
      title: g(tr("أضيفي طريقة استقبال العربون"), tr("أضف طريقة استقبال العربون")),
      why: tr("CliQ alias أو واتساب — تظهر للعميل فقط بعد تأكيد الحجز، بياناتك محمية"),
      done: hasCliq,
      to: "/dashboard/profile",
      cta: g(tr("أضيفي بيانات الدفع"), tr("أضف بيانات الدفع")),
    },
    {
      num: 3,
      title: g(tr("انشري ملفك وشاركيه"), tr("انشر ملفك وشاركه")),
      why: tr("بنقرة واحدة يصبح ملفك مرئياً ويمكن للعملاء طلب الحجز مباشرة"),
      done: !!profile?.is_published && !!profile?.username,
      to: "/dashboard/profile",
      cta: g(tr("فعّلي النشر"), tr("فعّل النشر")),
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const activeIdx = steps.findIndex((s) => !s.done);

  return (
    <div className="mb-10">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">{tr("خطوات البداية")}</div>
        <h2 className="font-serif text-3xl mb-1">{tr("٣ خطوات وملفك جاهز ✨")}</h2>
        <p className="text-sm text-muted-foreground">{tr("تستغرق أقل من ٥ دقائق")}</p>
        {/* شريط التقدم */}
        <div className="flex items-center justify-center gap-2 mt-4 max-w-[200px] mx-auto">
          {steps.map((s, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-500 ${s.done ? "bg-gold" : i === activeIdx ? "bg-gold/40" : "bg-secondary"}`} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{tr("{0} من {1} مكتملة", [doneCount, steps.length])}</p>
      </div>

      {/* الخطوات */}
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => {
          const isActive = i === activeIdx;
          return (
            <div key={s.num} className={`relative rounded-2xl border p-6 transition-all ${
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
              <h3 className="font-medium text-base mb-1.5 leading-snug">{tx(s.title)}</h3>
              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">{tx(s.why)}</p>
              {s.done ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />{" "}{tr("اكتملت ✓")}
                </span>
              ) : isActive ? (
                <Link to={s.to} className="inline-flex items-center gap-2 bg-charcoal text-ivory text-sm px-5 py-2.5 rounded-sm hover:opacity-90 transition-opacity active:scale-95 transition-transform duration-200">
                  {tx(s.cta)} <ArrowLeft className="h-3.5 w-3.5" />
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
    { title: tr("الملف الشخصي"), done: !!profile?.display_name && !!profile?.username && !!profile?.avatar_url, to: "/dashboard/profile", cta: tr("تعديل") },
    { title: tr("الأسعار{0}", [pricingCount > 0 ? ` (${pricingCount})` : ""]), done: pricingCount > 0, to: "/dashboard/pricing", cta: tr("إضافة") },
    { title: tr("بيانات الدفع"), done: hasCliq, to: "/dashboard/profile", cta: tr("إعداد") },
    { title: tr("النشر العام"), done: !!profile?.is_published, to: "/dashboard/profile", cta: tr("نشر") },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  return (
    <div className="mb-8 rounded-2xl ring-1 ring-border/70 bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-gold" />
          <span className="text-sm font-medium">{tr("إعداد الحساب")}</span>
          <span className="text-xs text-muted-foreground tabular-nums">({tx(doneCount)}/{tx(steps.length)})</span>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground p-1 rounded-sm hover:bg-secondary active:scale-95 transition-transform duration-200" aria-label={tr("إخفاء")}>
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
            <PartyPopper className="h-4 w-4" />{" "}{tr("حسابك جاهز تماماً! 🎉")}
          </span>
          <button onClick={onDismiss} className="text-xs text-muted-foreground hover:text-foreground underline">{tr("إخفاء")}</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {steps.filter((s) => !s.done).map((s) => (
            <Link key={s.title} to={s.to} className="inline-flex items-center gap-1.5 text-xs border border-border rounded-sm px-3 py-1.5 hover:bg-secondary hover:border-gold/40 transition-colors active:scale-95 transition-transform duration-200">
              <CircleDashed className="h-3 w-3 text-muted-foreground" />
              {tx(s.title)}
              <span className="text-gold">← {tx(s.cta)}</span>
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

function Card({ title, desc, cta, to, external, disabled, icon, badge, badgeText, hint, urgent, quickAction, className = "", feature, figures }: {
  title: string; desc: string; cta: string; to?: string; external?: boolean; disabled?: boolean; icon?: any; badge?: boolean; badgeText?: string; hint?: string; urgent?: boolean; quickAction?: { label: string; to: string }; className?: string; feature?: boolean;
  figures?: { value: number | string; label: string }[]
}) {
  // Text is always visible (hover-only text never shows on phones). Tiles read
  // start-aligned like an index; feature tiles get more room and a darker face.
  const tone = feature
    ? "bg-charcoal text-ivory ring-charcoal grain-overlay dark:bg-[linear-gradient(160deg,color-mix(in_oklab,var(--gold)_16%,var(--card)),var(--card)_70%)] dark:text-foreground dark:ring-gold/30"
    : urgent
      ? "bg-card ring-gold/60"
      : "bg-card ring-border/70";
  const sharedClassName = `group relative flex flex-col overflow-hidden rounded-2xl p-6 ring-1 transition-all duration-500 ${tone} ${feature ? "min-h-[260px]" : "min-h-[190px]"} ${disabled ? "cursor-not-allowed opacity-55" : "hover:-translate-y-0.5 hover:shadow-elegant hover:ring-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"} ${className}`;

  const cardContent = (
    <div className="relative z-10 flex h-full flex-1 flex-col" onMouseEnter={() => !disabled && playSound('tick')}>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className={`grid h-11 w-11 place-items-center rounded-xl transition-colors duration-500 [&_svg]:h-5 [&_svg]:w-5 ${feature ? "bg-ivory/10 text-gold" : "bg-secondary text-foreground/70 group-hover:text-gold"}`}>
          {icon || <ArrowLeft />}
        </div>
        {badgeText && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ${urgent ? "bg-gold/15 text-gold" : feature ? "bg-ivory/10 text-ivory/70" : "bg-secondary text-muted-foreground"}`}>
            {(badge || urgent) && <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />}
            {tx(badgeText)}
          </span>
        )}
      </div>

      <h3 className={`font-serif mb-1.5 ${feature ? "text-3xl" : "text-xl"}`}>{tx(title)}</h3>
      <p className={`text-sm leading-relaxed ${feature ? "text-ivory/70 max-w-sm dark:text-muted-foreground" : "text-muted-foreground"}`}>{tx(desc)}</p>
      {hint && <p className={`mt-2 text-xs ${feature ? "text-gold" : "text-muted-foreground/80"}`}>{tx(hint)}</p>}

      {figures && figures.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-6 border-t border-current/10 pt-6">
          {figures.map((f) => (
            <div key={f.label}>
              <div className="font-serif text-5xl leading-none tabular-nums">{tx(f.value)}</div>
              <div className={`mt-2 text-xs ${feature ? "text-ivory/60 dark:text-muted-foreground" : "text-muted-foreground"}`}>{tx(f.label)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto pt-6 flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-2 text-sm font-medium transition-all duration-300 group-hover:gap-3 ${feature ? "text-ivory dark:text-gold" : "text-foreground group-hover:text-gold"}`}>
          {disabled ? g(tr("أكملي ملفك أولاً"), tr("أكمل ملفك أولاً")) : cta}
          {!disabled && <ArrowLeft className="h-4 w-4" />}
        </span>
        {quickAction && !disabled && (
          <Link
            to={quickAction.to}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] ring-1 transition-colors ${feature ? "ring-ivory/20 hover:ring-gold hover:text-gold" : "ring-border hover:ring-gold/50 hover:text-gold"}`}
            onClick={(e: any) => { e.stopPropagation(); playSound('tick'); }}
          >
            <Plus className="h-3 w-3" /> {tx(quickAction.label)}
          </Link>
        )}
      </div>
    </div>
  );

  if (!to || disabled) return <div className={sharedClassName}>{tx(cardContent)}</div>;
  if (external) return <a href={to} className={sharedClassName} onClick={() => playSound('tick')}>{tx(cardContent)}</a>;
  return <Link to={to} className={sharedClassName} onClick={() => playSound('tick')}>{tx(cardContent)}</Link>;
}


let cachedDashboard: {
  profile: any;
  sub: any;
  pricingCount: number;
  hasCliq: boolean;
  templatesCount: number;
  stats: any;
} | null = null;


function getCompleteness(profile: any) {
  if (!profile) return 0;
  let score = 0;
  if (profile.display_name) score += 20;
  if (profile.bio) score += 20;
  if (profile.avatar_url) score += 20;
  if (profile.cover_url) score += 10;
  if (profile.city) score += 10;
  if (profile.tagline) score += 20;
  return score;
}

function CircularProgress({ value }: { value: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  return (
    <div className="relative flex items-center justify-center w-14 h-14 group">
      <svg className="transform -rotate-90 w-14 h-14">
        <circle cx="28" cy="28" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-secondary/50" />
        <motion.circle 
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          cx="28" cy="28" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" 
          strokeDasharray={circumference} 
          className="text-gold" 
        />
      </svg>
      <span className="absolute text-[10px] font-bold">{tx(value)}%</span>
      {value < 100 && (
        <div className="absolute top-14 bg-popover text-popover-foreground text-[10px] px-3 py-1.5 rounded-sm shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
          {g(tr("أكملي ملفك بنسبة 100% لزيادة الحجوزات!"), tr("أكمل ملفك بنسبة 100% لزيادة الحجوزات!"))}
        </div>
      )}
    </div>
  );
}

const LAST_VISIT_KEY = "memoria:dashboard-last-visit";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return tr("صباح الخير");
  if (h < 18) return tr("نهارك سعيد");
  return tr("مساء الخير");
}

function Dashboard() {
  const intro = useIntro();
  const [profile, setProfile] = useState<any>(cachedDashboard?.profile ?? null);
  const [sub, setSub] = useState<any>(cachedDashboard?.sub ?? null);
  const [loading, setLoading] = useState(!cachedDashboard);
  const [pricingCount, setPricingCount] = useState(cachedDashboard?.pricingCount ?? 0);
  const [hasCliq, setHasCliq] = useState(cachedDashboard?.hasCliq ?? false);
  const [templatesCount, setTemplatesCount] = useState(cachedDashboard?.templatesCount ?? 0);
  const [stats, setStats] = useState(cachedDashboard?.stats ?? { confirmed: 0, pending: 0, completed: 0, revenue: 0, avgRating: 0, reviews: 0, monthRevenue: 0, lastMonthRevenue: 0, revenueSeries: [], upcoming30: 0, pendingDepositsAmount: 0, pendingDepositNames: [], deliveriesDueSoon: 0, focus: [], newBookings: 0, newReviews: 0 });
  const [qsDismissed, setQsDismissed] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);
  const [showMoreStats, setShowMoreStats] = useState(false);
  const navigate = useNavigate();
  // وقت الزيارة السابقة — يُقرأ مرة واحدة عند الفتح ثم يُحدَّث للزيارة القادمة
  const lastVisitRef = useRef<number | null>(null);
  if (lastVisitRef.current === null && typeof window !== "undefined") {
    try { lastVisitRef.current = Number(localStorage.getItem(LAST_VISIT_KEY)) || 0; } catch { lastVisitRef.current = 0; }
  }
  useEffect(() => {
    try { localStorage.setItem(LAST_VISIT_KEY, String(Date.now())); } catch { /* ignore */ }
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate({ to: "/login" }); return; }
    try {
      const pendingRef = sessionStorage.getItem("pending_referral_code");
      if (pendingRef) {
        const { recordReferralAfterSignup } = await import("@/lib/booking.functions");
        await recordReferralAfterSignup({ data: { referral_code: pendingRef } });
        sessionStorage.removeItem("pending_referral_code");
        toast.success(tr("تم تطبيق رمز الإحالة بنجاح!"));
      }
    } catch (e) { sessionStorage.removeItem("pending_referral_code"); }
    const [{ data }, { data: priv }, { data: s }, { data: bks }, { data: rvs }, { count: pricingRulesCount }, { count: tplCount }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
      supabase.from("photographer_private").select("ical_token,cliq_alias,whatsapp,phone").eq("user_id", session.user.id).maybeSingle(),
      supabase.from("subscriptions").select("*").eq("photographer_id", session.user.id).maybeSingle(),
      supabase.from("bookings").select("id,client_name,status,created_at,total_price,deposit_amount,event_date,delivery_due_at,production_stage,deposit_proof_url,deposit_sent_at,final_paid_at,needs_approval,approved_at,phone_verified_at").eq("photographer_id", session.user.id).is("deleted_at", null).not("phone_verified_at" as any, "is", null),
      supabase.from("reviews").select("rating,created_at").eq("photographer_id", session.user.id),
      supabase.from("pricing_rules").select("id", { count: "exact", head: true }).eq("photographer_id", session.user.id),
      supabase.from("whatsapp_templates").select("id", { count: "exact", head: true }).eq("photographer_id", session.user.id),
    ]);
    if (data && !(data as any).onboarding_completed_at) {
      navigate({ to: "/onboarding" });
      return;
    }
    const all = (bks ?? []) as any[];
    const earning = all.filter((b) => b.status === "confirmed" || b.status === "completed");
    const confirmed = all.filter((b) => b.status === "confirmed").length;
    const pending = all.filter((b) => b.status === "pending_deposit" || b.status === "quote").length;
    const completed = all.filter((b) => b.status === "completed").length;
    const revenue = earning.reduce((sum, b) => sum + Number(b.total_price ?? 0), 0);
    const now = Date.now();
    // إيرادات آخر ٦ أشهر حسب تاريخ المناسبة (للمنحنى والمقارنة الشهرية)
    const monthKey = (d: Date) => d.getFullYear() * 12 + d.getMonth();
    const thisMonth = monthKey(new Date());
    const revenueSeries = Array.from({ length: 6 }, (_, i) => {
      const key = thisMonth - 5 + i;
      return earning.filter((b) => b.event_date && monthKey(new Date(b.event_date)) === key).reduce((sum, b) => sum + Number(b.total_price ?? 0), 0);
    });
    const monthRevenue = revenueSeries[5];
    const lastMonthRevenue = revenueSeries[4];
    const upcoming30 = all.filter((b) => b.status === "confirmed" && b.event_date && new Date(b.event_date).getTime() >= now && new Date(b.event_date).getTime() <= now + 30 * 86400000).length;
    const pendingDeposits = all.filter((b) => b.status === "pending_deposit");
    const pendingDepositsAmount = pendingDeposits.reduce((sum, b) => sum + Number(b.deposit_amount ?? 0), 0);
    const pendingDepositNames = pendingDeposits.map((b) => b.client_name).filter(Boolean).slice(0, 3);
    const deliveriesDueSoon = all.filter((b) => b.delivery_due_at && b.production_stage !== "delivered" && b.status !== "cancelled" && new Date(b.delivery_due_at).getTime() <= now + 7 * 86400000).length;
    const avg = (rvs && rvs.length) ? rvs.reduce((sum, r) => sum + r.rating, 0) / rvs.length : 0;
    const since = lastVisitRef.current || 0;
    const newBookings = since ? all.filter((b) => new Date(b.created_at).getTime() > since).length : 0;
    const newReviews = since ? (rvs ?? []).filter((r: any) => new Date(r.created_at).getTime() > since).length : 0;
    const focus = computeFocusItems(all.filter((b) => b.status !== "cancelled"), s);

    const computedStats = { confirmed, pending, completed, revenue, avgRating: avg, reviews: rvs?.length ?? 0, monthRevenue, lastMonthRevenue, revenueSeries, upcoming30, pendingDepositsAmount, pendingDepositNames, deliveriesDueSoon, focus, newBookings, newReviews };
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
    // أي خطأ في التحميل كان يترك اللوحة عالقة على الهيكل الرمادي حتى التحديث
    loadData()
      .catch((e) => { console.error("[dashboard] load failed", e); toast.error(g(tr("تعذّر تحميل اللوحة، حاولي مجدداً"), tr("تعذّر تحميل اللوحة، حاول مجدداً"))); })
      .finally(() => setLoading(false));
  }, [navigate]);

  const dismissQuickStart = async () => {
    setQsDismissed(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("profiles").update({ quickstart_dismissed_at: new Date().toISOString() } as any).eq("id", session.user.id);
      }
      toast.success(g(tr("أخفينا قائمة الإعداد — تجدينها في الملف الشخصي"), tr("أخفينا قائمة الإعداد — تجدها في الملف الشخصي")));
    } catch { toast.error(g(tr("تعذّر الحفظ، حاولي مجدداً"), tr("تعذّر الحفظ، حاول مجدداً"))); }
  };

  if (loading) return <DashboardSkeleton />;
  const onboardingNeeded = !profile?.display_name || !profile?.username || !profile?.avatar_url || pricingCount === 0;
  const totalBookings = stats.confirmed + stats.pending + stats.completed;
  // مستخدمة جديدة: ملف ناقص + لا حجوزات بعد
  const isNewUser = onboardingNeeded && totalBookings === 0;
  const hasAnyStats = stats.confirmed > 0 || stats.pending > 0 || stats.revenue > 0 || stats.reviews > 0;
  const publicUrl = profile?.username && typeof window !== "undefined" ? `${window.location.origin}/photographers/${profile.username}` : "";

  const monthDelta = stats.lastMonthRevenue > 0
    ? Math.round(((stats.monthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100)
    : null;
  const whatsNewParts = [
    stats.newBookings > 0 ? (stats.newBookings === 1 ? tr("طلب جديد") : tr("{0} طلبات جديدة", [stats.newBookings])) : null,
    stats.newReviews > 0 ? (stats.newReviews === 1 ? tr("تقييم جديد") : tr("{0} تقييمات جديدة", [stats.newReviews])) : null,
  ].filter(Boolean);

  const subStatus = (() => {
    if (!sub) return null;
    const isPast = sub.current_period_end ? new Date(sub.current_period_end).getTime() < Date.now() : false;
    return sub.status === "active" && isPast ? "expired" : sub.status;
  })();

  const tools: Tool[] = [
    { key: "bookings", title: tr("الحجوزات"), to: "/dashboard/bookings", icon: <Calendar />, badge: stats.pending > 0 ? tr("{0} جديد", [stats.pending]) : undefined, attention: stats.pending > 0, hint: arCount(totalBookings, tr("حجز واحد"), tr("حجزان"), tr("حجوزات"), tr("حجزاً")) },
    { key: "production", title: tr("متابعة الإنتاج"), to: "/dashboard/production", icon: <Sparkles />, badge: stats.deliveriesDueSoon > 0 ? tr("{0} قريب", [stats.deliveriesDueSoon]) : undefined, attention: stats.deliveriesDueSoon > 0, hint: tr("من التصوير إلى التسليم") },
    { key: "calendar", title: tr("التقويم"), to: "/dashboard/calendar", icon: <Calendar />, hint: stats.upcoming30 > 0 ? tr("{0} مناسبات خلال ٣٠ يوماً", [stats.upcoming30]) : tr("حجب الأيام والتوفّر") },
    { key: "pricing", title: tr("الأسعار"), to: "/dashboard/pricing", icon: <Package />, badge: pricingCount === 0 ? tr("فارغة") : undefined, attention: pricingCount === 0, hint: arCount(pricingCount, tr("باقة واحدة"), tr("باقتان"), tr("باقات"), tr("باقة")) },
    { key: "profile", title: tr("ملفي"), to: "/dashboard/profile", icon: <Star />, badge: (!profile?.avatar_url || !profile?.cover_url) ? tr("ناقص") : undefined, attention: !profile?.avatar_url, hint: tr("الصور والنبذة وبيانات الدفع") },
    { key: "settings", title: tr("الإعدادات"), to: "/dashboard/settings", icon: <Settings />, hint: tr("ألوان صفحتك ولغتها وأقسامها") },
    { key: "reports", title: tr("التقارير"), to: "/dashboard/reports", icon: <TrendingUp />, hint: stats.monthRevenue > 0 ? tr("{0} د.أ هذا الشهر", [stats.monthRevenue]) : tr("الإيرادات وتصدير CSV") },
    { key: "contracts", title: tr("العقود"), to: "/dashboard/contracts", icon: <Link2 />, hint: tr("توقيع إلكتروني") },
    { key: "offers", title: tr("عروض الأسعار"), to: "/dashboard/offers", icon: <MessageCircle />, hint: tr("أسعار اقترحتها العرائس") },
    { key: "whatsapp", title: tr("رسائل واتساب"), to: "/dashboard/whatsapp-templates", icon: <MessageCircle />, hint: tr("{0} جاهزة", [arCount(templatesCount, "قالب واحد", "قالبان", "قوالب", "قالباً")]) },
    { key: "subscription", title: tr("الاشتراك"), to: "/dashboard/subscription", icon: <LogOut />, badge: subStatus === "expired" ? tr("منتهي") : subStatus === "trial" ? tr("تجريبي") : undefined, attention: subStatus === "expired", hint: subStatus === "active" ? tr("نشط") : tr("التجديد وإثبات الدفع") },
    { key: "notifications", title: tr("الإشعارات"), to: "/notifications", icon: <Bell />, hint: tr("كل التنبيهات") },
    { key: "recap", title: tr("سنتي"), to: "/dashboard/recap", icon: <Sparkles />, hint: tr("ملخّص للمشاركة على إنستغرام") },
    { key: "referrals", title: tr("الإحالة"), to: "/dashboard/referrals", icon: <CheckCircleIcon />, hint: tr("١٤ يوماً مجاناً عن كل زميلة") },
    { key: "public", title: tr("ملفي العام"), to: profile?.username ? `/photographers/${profile.username}` : undefined, external: !!profile?.username, icon: <ArrowLeft />, hint: tr("كما تراه العرائس") },
  ];

  return (
    <PullToRefresh onRefresh={async () => { await loadData(); }}>
      <div className="min-h-screen bg-background sm:pb-0 pb-20">
        <div className="hidden sm:block">
          <Header />
        </div>
        <OnboardingWizard shouldShow={onboardingNeeded} />

        <section className="container-editorial py-6 sm:py-14 max-w-6xl">
        {/* Mobile Large Title */}
        <div className="sm:hidden mb-6 px-2 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{greeting()}</div>
            <h1 className="font-serif text-3xl font-bold">{tr("لوحتي")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openCommandPalette} aria-label={tr("بحث")} className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-secondary active:scale-95 transition-transform"><Search className="h-4 w-4" /></button>
            <button onClick={signOut} className="text-sm border border-border px-3 py-1.5 rounded-sm hover:bg-secondary active:scale-95 transition-transform duration-200">{tr("خروج")}</button>
          </div>
        </div>

        <div className="hidden sm:flex items-end justify-between mb-10">
          <div>
            <div className="eyebrow mb-2">{new Date().toLocaleDateString(locale("ar-JO"), { weekday: "long", day: "numeric", month: "long" })}</div>
            <h1 className="font-serif text-5xl">{tr("{0}،", [greeting()])}{" "}<span className="font-script text-gold">{profile?.display_name ?? tr("مصوّر")}</span></h1>
            {profile?.username ? (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Link to="/photographers/$username" params={{ username: profile.username }} className="text-gold hover:underline" dir="ltr">@{tx(profile.username)}</Link>
                {publicUrl && <CopyButton value={publicUrl} label={tr("نسخ رابط ملفي")} />}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground mt-1">{g(tr("أكملي اسم المستخدم من الملف الشخصي"), tr("أكمل اسم المستخدم من الملف الشخصي"))}</div>
            )}
          </div>
          <div className="flex items-center gap-5">
            <button onClick={openCommandPalette} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:border-gold/40 hover:text-foreground transition-colors">
              <Search className="h-4 w-4" /> {g(tr("ابحثي عن عروس أو صفحة"), tr("ابحث عن عروس أو صفحة"))}
              <kbd className="rounded border border-border bg-secondary px-1.5 text-[10px] font-sans" dir="ltr">Ctrl K</kbd>
            </button>
            <button onClick={signOut} className="text-sm text-muted-foreground border-b border-current/30 pb-0.5 hover:text-foreground transition-colors">{tr("تسجيل الخروج")}</button>
          </div>
        </div>

        {/* بانر الاشتراك: فقط عندما يتطلّب إجراءً — الاقتراب من الانتهاء يظهر كمهمة اليوم */}
        {(subStatus === "expired" || subStatus === "canceled" || subStatus === "pending_review" || (isNewUser && subStatus === "trial")) && <SubscriptionBanner sub={{ ...sub, status: subStatus }} />}

        {isNewUser ? (
          <>
            <NewUserWelcome profile={profile} pricingCount={pricingCount} hasCliq={hasCliq} />
            <motion.div variants={staggerContainer} initial={intro ? "hidden" : false} animate="visible" className="grid gap-5 md:grid-cols-3 mb-5">
              <Card
                title={tr("الحجوزات")}
                desc={g(tr("راجعي الطلبات الواردة، أكّدي العربون وتابعي مراحل كل حجز."), tr("راجع الطلبات الواردة، أكّد العربون وتابع مراحل كل حجز."))}
                cta={tr("عرض الحجوزات")}
                to="/dashboard/bookings"
                hint={tr("لا توجد حجوزات بعد")}
                icon={<Calendar className="h-6 w-6" />}
              />
              <Card
                title={tr("الملف الشخصي")}
                desc={tr("الاسم، الصورة، الباقات، بيانات الدفع وإعدادات النشر.")}
                cta={tr("تعديل الملف")}
                to="/dashboard/profile"
                urgent={!profile?.avatar_url || !profile?.username}
                badgeText={!profile?.avatar_url || !profile?.username ? tr("مطلوب للنشر") : tr("جاهز")}
                hint={tr("الخطوة الأولى لبدء استقبال الطلبات")}
                icon={<Star className="h-6 w-6" />}
              />
              <Card
                title={tr("بطاقة الأسعار")}
                desc={g(tr("أضيفي باقاتك ليتمكن العميل من اختيار الخدمة المناسبة."), tr("أضف باقاتك ليتمكن العميل من اختيار الخدمة المناسبة."))}
                cta={tr("إدارة الأسعار")}
                to="/dashboard/pricing"
                urgent={pricingCount === 0}
                badgeText={pricingCount === 0 ? g(tr("ابدئي من هنا"), tr("ابدأ من هنا")) : arCount(pricingCount, tr("باقة واحدة"), tr("باقتان"), tr("باقات"), tr("باقة"))}
                quickAction={{ label: tr("إضافة باقة سريعة"), to: "/dashboard/pricing" }}
                icon={<Package className="h-6 w-6" />}
              />
            </motion.div>
            <AnimatePresence>
              {showAllCards && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden pt-2">
                  <ToolIndex tools={tools.filter((t) => !["bookings", "profile", "pricing"].includes(t.key))} />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="text-center mt-4">
              <button
                onClick={() => setShowAllCards((v) => !v)}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-sm px-5 py-2 hover:bg-secondary transition-colors active:scale-95 duration-200"
              >
                {showAllCards ? tr("إخفاء الأدوات الإضافية") : tr("عرض كل الأدوات")}
                <ArrowLeft className={`h-3.5 w-3.5 transition-transform ${showAllCards ? "rotate-90" : "-rotate-90"}`} />
              </button>
            </div>
          </>
        ) : (
          <>
            <TodayFocus items={stats.focus ?? []} whatsNew={whatsNewParts.length ? whatsNewParts.join(" · ") : null} />

            <NotifyChannelsCard promptOnly />

            {!hasAnyStats && profile?.is_published && profile?.username && (
              <div className="mb-10 rounded-2xl border border-gold/30 bg-gold/5 p-5 text-sm leading-relaxed flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <strong>{g(tr("ملفكِ منشور وجاهز."), tr("ملفك منشور وجاهز."))}</strong> {g(tr("ضعي"), tr("ضع"))}{" "}{tr("رابطه في بايو إنستجرام لتبدأ العرائس بالحجز مباشرة.")}
                  <div className="mt-1 text-xs text-muted-foreground" dir="ltr">{publicUrl.replace(/^https?:\/\//, "")}</div>
                </div>
                {publicUrl && <CopyButton value={publicUrl} label={tr("نسخ الرابط")} className="self-start sm:self-auto px-4 py-2 text-sm" />}
              </div>
            )}

            {/* ── ٣ أرقام أساسية فقط، والباقي عند الطلب ── */}
            {hasAnyStats && (
              <div className="mb-12">
                <motion.div variants={staggerContainer} initial={intro ? "hidden" : false} animate="visible" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <NumStat
                    icon={<TrendingUp className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />}
                    label={tr("إيرادات هذا الشهر")}
                    value={stats.monthRevenue}
                    suffix={tr("د.أ")}
                    sub={monthDelta === null ? undefined : tr("{0}{1}٪ عن الشهر الماضي", [monthDelta >= 0 ? "+" : "", monthDelta])}
                    subTone={monthDelta !== null && monthDelta < 0 ? "down" : "up"}
                    extra={<Sparkline values={stats.revenueSeries ?? []} />}
                  />
                  <NumStat
                    icon={<DollarSign className="h-5 w-5 text-amber-600" />}
                    label={tr("عرابين معلّقة")}
                    value={stats.pendingDepositsAmount}
                    suffix={tr("د.أ")}
                    sub={stats.pendingDepositNames?.length ? tr("من {0}", [stats.pendingDepositNames.join("، ")]) : tr("لا عرابين معلّقة")}
                  />
                  <NumStat
                    icon={<Send className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
                    label={tr("تسليمات خلال ٧ أيام")}
                    value={stats.deliveriesDueSoon}
                    sub={stats.deliveriesDueSoon > 0 ? g(tr("تابعيها في لوحة الإنتاج"), tr("تابعها في لوحة الإنتاج")) : tr("لا تسليمات قريبة")}
                  />
                </motion.div>

                <AnimatePresence initial={false}>
                  {showMoreStats && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                        <NumStat compact icon={<Calendar className="h-4 w-4 text-gold" />} label={tr("حجوزات مؤكّدة")} value={stats.confirmed} />
                        <NumStat compact icon={<Clock className="h-4 w-4 text-amber-600" />} label={tr("بانتظار العربون")} value={stats.pending} />
                        <NumStat compact icon={<Calendar className="h-4 w-4 text-blue-600" />} label={tr("مناسبات خلال ٣٠ يوماً")} value={stats.upcoming30} />
                        <NumStat compact icon={<Star className="h-4 w-4 text-gold" />} label={tr("التقييم ({0})", [stats.reviews])} value={stats.avgRating} fractionDigits={1} fallback={stats.avgRating ? undefined : "—"} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <button
                  type="button"
                  onClick={() => setShowMoreStats((v) => !v)}
                  aria-expanded={showMoreStats}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showMoreStats ? tr("أرقام أقل") : tr("كل الأرقام")}
                  <ArrowLeft className={`h-3 w-3 transition-transform duration-300 ${showMoreStats ? "rotate-90" : "-rotate-90"}`} />
                </button>
              </div>
            )}

            <AnimatePresence initial={false}>
              {!profile?.quickstart_dismissed_at && !qsDismissed && (
                <motion.div key="qs" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                  <QuickStart profile={profile} pricingCount={pricingCount} bookingCount={totalBookings} hasCliq={hasCliq} templatesCount={templatesCount} onDismiss={dismissQuickStart} />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-2xl">{tr("أدواتك")}</h2>
            </div>
            <ToolIndex tools={tools} />
          </>
        )}
      </section>
      <Footer />
    </div>
    </PullToRefresh>
  );
}
