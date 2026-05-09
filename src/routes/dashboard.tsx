import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { Clock, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/login" });
        return;
      }
      const [{ data }, { data: s }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
        supabase.from("subscriptions").select("*").eq("photographer_id", session.user.id).maybeSingle(),
      ]);
      setProfile(data);
      setSub(s);
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

        <div className="grid gap-6 md:grid-cols-3">
          <Card title="الملف الشخصي" desc="الصور، النبذة، المعدّات، التواصل، إعدادات الحجز." cta="تعديل الملف" to="/dashboard/profile" />
          <Card title="بطاقة الأسعار" desc="باقات التصوير والفيديو والإضافات." cta="إدارة الأسعار" to="/dashboard/pricing" />
          <Card title="التقويم والتوفر" desc="حجب أيام معيّنة ومراجعة الحجوزات القادمة." cta="فتح التقويم" to="/dashboard/calendar" />
          <Card title="الحجوزات" desc="جميع الطلبات والمؤكّدة والمنتهية." cta="عرض الحجوزات" to="/dashboard/bookings" />
          <Card title="الاشتراك" desc="حالة اشتراكك وتجديده." cta="إدارة الاشتراك" to="/dashboard/subscription" />
          <Card title="ملفي العام" desc="عرض ما يراه عملاؤك." cta="فتح الملف" to={`/photographers/${profile?.username ?? ""}`} external />
        </div>
      </section>
      <Footer />
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

function Card({ title, desc, cta, to, external }: { title: string; desc: string; cta: string; to?: string; external?: boolean }) {
  return (
    <div className="rounded-sm border border-border bg-card p-6 shadow-soft">
      <h3 className="font-serif text-xl mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{desc}</p>
      {to ? (
        external ? <a href={to} className="text-sm border-b border-current pb-0.5 text-gold">{cta}</a>
        : <Link to={to} className="text-sm border-b border-current pb-0.5 text-gold">{cta}</Link>
      ) : <span className="text-sm text-muted-foreground">{cta}</span>}
    </div>
  );
}
