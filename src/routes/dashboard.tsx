import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/login" });
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      setProfile(data);
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

        <div className="grid gap-6 md:grid-cols-3">
          <Card title="الملف الشخصي" desc="أكمل النبذة، المدينة، روابط التواصل، والمعدّات." cta="تعديل الملف" />
          <Card title="بطاقة الأسعار" desc="حدّد أسعار التصوير والفيديو والإضافات." cta="إدارة الأسعار" />
          <Card title="التقويم" desc="اربط Google Calendar وحدّد أيام العطل." cta="قريبًا" disabled />
          <Card title="الحجوزات" desc="استعرض الطلبات الجديدة والمؤكّدة." cta="قريبًا" disabled />
          <Card title="الرسائل" desc="رسائل العملاء المرتبطة بكل حجز." cta="قريبًا" disabled />
          <Card title="المراجعات" desc="تقييمات العملاء بعد العرس." cta="قريبًا" disabled />
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Card({ title, desc, cta, disabled }: { title: string; desc: string; cta: string; disabled?: boolean }) {
  return (
    <div className="rounded-sm border border-border bg-card p-6 shadow-soft">
      <h3 className="font-serif text-xl mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{desc}</p>
      <button disabled={disabled} className={`text-sm border-b border-current pb-0.5 ${disabled ? "text-muted-foreground cursor-not-allowed" : "text-gold"}`}>{cta}</button>
    </div>
  );
}
