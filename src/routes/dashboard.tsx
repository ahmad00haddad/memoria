import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { Clock, CheckCircle2, AlertTriangle, Sparkles, Calendar, DollarSign, Users, Star, Copy, ArrowLeft, Bell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ confirmed: 0, pending: 0, completed: 0, revenue: 0, avgRating: 0, reviews: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/login" });
        return;
      }
      const [{ data }, { data: s }, { data: bks }, { data: rvs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
        supabase.from("subscriptions").select("*").eq("photographer_id", session.user.id).maybeSingle(),
        supabase.from("bookings").select("status,total_price").eq("photographer_id", session.user.id),
        supabase.from("reviews").select("rating").eq("photographer_id", session.user.id),
      ]);
      setProfile(data);
      setSub(s);
      const confirmed = (bks ?? []).filter((b) => b.status === "confirmed").length;
      const pending = (bks ?? []).filter((b) => b.status === "pending_deposit" || b.status === "quote").length;
      const completed = (bks ?? []).filter((b) => b.status === "completed").length;
      const revenue = (bks ?? []).filter((b) => b.status === "confirmed" || b.status === "completed")
        .reduce((s, b) => s + Number(b.total_price ?? 0), 0);
      const avg = (rvs && rvs.length) ? rvs.reduce((s, r) => s + r.rating, 0) / rvs.length : 0;
      setStats({ confirmed, pending, completed, revenue, avgRating: avg, reviews: rvs?.length ?? 0 });
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <div className="min-h-screen grid place-items-center">جاري التحميل…</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">لوحة المصوّر</div>
            <h1 className="font-serif text-4xl">أهلاً، {profile?.display_name ?? "مصوّر"}</h1>
            <div className="text-sm text-muted-foreground mt-1">ملفك العام: <Link to="/photographers/$username" params={{ username: profile?.username ?? "" }} className="text-gold underline">@{profile?.username}</Link></div>
          </div>
          <button onClick={signOut} className="text-sm border border-border px-4 py-2 rounded-sm hover:bg-secondary">تسجيل الخروج</button>
        </div>

        <SubscriptionBanner sub={sub} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Stat icon={<Calendar className="h-5 w-5 text-gold" />} label="حجوزات مؤكّدة" value={stats.confirmed} />
          <Stat icon={<Clock className="h-5 w-5 text-amber-600" />} label="بانتظار العربون" value={stats.pending} />
          <Stat icon={<DollarSign className="h-5 w-5 text-emerald-600" />} label="الإيرادات" value={`${stats.revenue.toFixed(0)} د.أ`} />
          <Stat icon={<Star className="h-5 w-5 text-gold" />} label={`التقييم (${stats.reviews})`} value={stats.avgRating ? stats.avgRating.toFixed(1) : "—"} />
        </div>

        {profile?.ical_token && <IcalBlock token={profile.ical_token} />}

        <div className="grid gap-6 md:grid-cols-3">
          <Card title="الملف الشخصي" desc="الصور، النبذة، المعدّات، التواصل، إعدادات الحجز." cta="تعديل الملف" to="/dashboard/profile" />
          <Card title="بطاقة الأسعار" desc="باقات التصوير والفيديو والإضافات." cta="إدارة الأسعار" to="/dashboard/pricing" />
          <Card title="التقويم والتوفر" desc="حجب أيام معيّنة ومراجعة الحجوزات القادمة." cta="فتح التقويم" to="/dashboard/calendar" />
          <Card title="الحجوزات" desc="جميع الطلبات والمؤكّدة والمنتهية." cta="عرض الحجوزات" to="/dashboard/bookings" />
          <Card title="العقود الرقمية" desc="قوالب وعقود توقيع إلكتروني." cta="إدارة العقود" to="/dashboard/contracts" />
          <Card title="الاشتراك" desc="حالة اشتراكك وتجديده ورفع إثبات الدفع." cta="إدارة الاشتراك" to="/dashboard/subscription" />
          <Card title="الإشعارات" desc="جميع التنبيهات والتنقل السريع إلى العناصر المرتبطة بها." cta="عرض الإشعارات" to="/notifications" icon={<Bell className="h-4 w-4" />} />
          <Card title="برنامج الإحالة" desc="ادعُ زميلة واربحا شهرًا مجانيًا للطرفين." cta="رابط الإحالة" to="/dashboard/referrals" />
          <Card title="✨ أدوات الذكاء الاصطناعي" desc="نبذة، ردود، تسعير، عقود، ترجمة، كابشن إنستغرام والمزيد — مدعومة بـ Lovable AI." cta="افتح الأدوات" to="/dashboard/ai-tools" />
          <Card title="ملفي العام" desc="عرض ما يراه عملاؤك." cta="فتح الملف" to={profile?.username ? `/photographers/${profile.username}` : undefined} external={!!profile?.username} disabled={!profile?.username} />
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">{icon}<span>{label}</span></div>
      <div className="font-serif text-2xl">{value}</div>
    </div>
  );
}

function IcalBlock({ token }: { token: string }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/api/public/ical/${token}` : "";
  return (
    <div className="mb-8 rounded-sm border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-gold mb-1">مزامنة Google Calendar</div>
        <div className="text-sm text-muted-foreground">انسخ الرابط وأضفه في Google Calendar → Other calendars → From URL</div>
      </div>
      <div className="flex gap-2 items-center">
        <code className="text-xs bg-secondary px-2 py-1 rounded-sm max-w-[260px] truncate">{url}</code>
        <button onClick={() => { navigator.clipboard.writeText(url); toast.success("تم النسخ"); }}
          className="inline-flex items-center gap-1 border border-border px-3 py-2 rounded-sm hover:bg-secondary text-sm"><Copy className="h-4 w-4" /> نسخ</button>
      </div>
    </div>
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
    trial: { icon: <Sparkles className="h-5 w-5 text-gold" />, bg: "bg-gold/10 border-gold/40", text: `تجربة مجانية — متبقّي ${daysLeft} يومًا`, cta: "اشتركي الآن" },
    active: { icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />, bg: "bg-emerald-50 border-emerald-200", text: `اشتراك نشط — يتجدّد بعد ${daysLeft} يومًا`, cta: "إدارة الاشتراك" },
    pending_review: { icon: <Clock className="h-5 w-5 text-amber-600" />, bg: "bg-amber-50 border-amber-200", text: "دفعتك قيد المراجعة — سيُفعَّل اشتراكك خلال 24 ساعة", cta: "عرض التفاصيل" },
    expired: { icon: <AlertTriangle className="h-5 w-5 text-destructive" />, bg: "bg-destructive/10 border-destructive/40", text: "انتهى اشتراكك — جدّدي للاستمرار", cta: "جدّدي الاشتراك" },
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

function Card({
  title,
  desc,
  cta,
  to,
  external,
  disabled,
  icon,
}: {
  title: string;
  desc: string;
  cta: string;
  to?: string;
  external?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const sharedClassName = `group flex min-h-[190px] flex-col justify-between rounded-sm border border-border bg-card p-6 shadow-soft transition ${disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5 hover:border-gold/40 hover:bg-secondary/20 hover:shadow-elegant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"}`;

  const content = (
    <>
      <div>
        <h3 className="font-serif text-xl mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
      <div className="mt-6 inline-flex items-center gap-2 text-sm text-gold">
        {icon}
        <span className="border-b border-current pb-0.5">{disabled ? "أكملي اسم المستخدم أولًا" : cta}</span>
        {!disabled && <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />}
      </div>
    </>
  );

  if (!to || disabled) {
    return <div className={sharedClassName}>{content}</div>;
  }

  if (external) {
    return <a href={to} className={sharedClassName}>{content}</a>;
  }

  return <Link to={to} className={sharedClassName}>{content}</Link>;
}
