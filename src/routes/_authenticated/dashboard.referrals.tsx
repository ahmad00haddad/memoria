import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Users, MessageCircle, CheckCircle2, Clock } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { useCountUp } from "@/hooks/use-count-up";

export const Route = createFileRoute("/_authenticated/dashboard/referrals")({
  component: ReferralsPage,
});

// كل إحالة ناجحة = 14 يوماً مجانياً للداعية (grant_referral_reward في قاعدة البيانات)
const REWARD_DAYS = 14;

function ReferralsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [refs, setRefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("referral_code,display_name").eq("id", session.user.id).maybeSingle(),
        supabase.from("referrals").select("*").eq("referrer_id", session.user.id).order("created_at", { ascending: false }),
      ]);
      setProfile(p);
      setRefs(r ?? []);
      setLoading(false);
    })();
  }, [navigate]);

  const grantedCount = refs.filter((r) => r.reward_granted).length;
  const earnedDays = useCountUp(grantedCount * REWARD_DAYS);
  const joined = useCountUp(refs.length);

  if (loading) return <PageLoader />;

  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/photographers/join?ref=${profile?.referral_code ?? ""}`;
  const shareText = `مرحباً! أستخدم ميموريا لإدارة حجوزات التصوير (العربون، العقود، التسليم) ووفّر عليّ وقتاً كثيراً. سجّلي من هنا وجرّبيه مجاناً ١٤ يوماً:\n${link}`;
  const pending = refs.length - grantedCount;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 max-w-3xl">
        <div className="mb-4"><BackToDashboard /></div>
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">برنامج الإحالة</div>
        <h1 className="font-serif text-4xl mb-2">ادعي زميلة، واربحي {REWARD_DAYS} يوماً مجاناً</h1>
        <p className="text-muted-foreground mb-8">عن كل مصوّرة تسجّل من رابطك وتفعّل أول اشتراك مدفوع، يُضاف {REWARD_DAYS} يوماً لاشتراكك تلقائياً.</p>

        <div className="rounded-2xl border border-border bg-card p-6 mb-6">
          <div className="text-sm text-muted-foreground mb-2">رابطك الخاص</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input readOnly dir="ltr" value={link} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-xl bg-secondary px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <CopyButton value={link} label="نسخ" className="px-4 py-2 text-sm" />
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-sm text-white transition-transform active:scale-95"
              >
                <MessageCircle className="h-4 w-4" /> أرسلي بواتساب
              </a>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">الرسالة جاهزة — تختارين الزميلة من واتساب وترسلين.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl border border-border bg-card p-6">
            <Users className="w-5 h-5 text-gold mb-2" />
            <div className="text-3xl font-serif tabular-nums">{Math.round(joined)}</div>
            <div className="text-sm text-muted-foreground">زميلات سجّلن{pending > 0 ? ` · ${pending} بانتظار الاشتراك` : ""}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <Gift className="w-5 h-5 text-gold mb-2" />
            <div className="text-3xl font-serif tabular-nums">{Math.round(earnedDays)}</div>
            <div className="text-sm text-muted-foreground">يوماً مجانياً ربحتِها</div>
          </div>
        </div>

        {refs.length > 0 ? (
          <ul className="mb-8 divide-y divide-border rounded-2xl border border-border bg-card">
            {refs.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 p-4">
                <div className="text-sm">
                  سجّلت في {new Date(r.created_at).toLocaleDateString("ar-JO", { day: "numeric", month: "long" })}
                </div>
                {r.reward_granted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> أُضيف {REWARD_DAYS} يوماً
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    <Clock className="h-3.5 w-3.5" /> تنتظر أول اشتراك
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mb-8 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            لم تسجّل أي زميلة بعد. أرسلي الرابط لزميلتين أو ثلاث تعرفين أنهن يدِرن الحجوزات عبر واتساب.
          </div>
        )}

        <ol className="grid gap-3 text-sm sm:grid-cols-3">
          {["أرسلي رابطك لزميلة", "تسجّل وتجرّب ١٤ يوماً مجاناً", `عند أول اشتراك مدفوع لها، يُضاف ${REWARD_DAYS} يوماً لكِ`].map((t, i) => (
            <li key={t} className="flex items-start gap-3 rounded-xl bg-secondary/50 p-4">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold/20 text-xs font-bold text-gold">{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </section>
      <Footer />
    </div>
  );
}
