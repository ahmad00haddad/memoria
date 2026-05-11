import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Gift, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/referrals")({
  component: ReferralsPage,
});

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
        supabase.from("referrals").select("*").eq("referrer_id", session.user.id),
      ]);
      setProfile(p);
      setRefs(r ?? []);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <div className="min-h-screen grid place-items-center">جاري التحميل…</div>;

  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/photographers/join?ref=${profile?.referral_code ?? ""}`;
  const granted = refs.filter((r) => r.reward_granted).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">برنامج الإحالة</div>
        <h1 className="font-serif text-4xl mb-2">ادعُ زميلة، اربحا شهرًا مجانيًا</h1>
        <p className="text-muted-foreground mb-8">عند انضمام مصوّرة جديدة عبر رابطك وإكمال أول اشتراك، تحصلان على شهر مجاني للطرفين.</p>

        <div className="border border-border rounded-sm p-6 bg-card mb-6">
          <div className="text-sm text-muted-foreground mb-2">رابطك الخاص</div>
          <div className="flex gap-2">
            <input readOnly value={link} className="flex-1 bg-secondary px-3 py-2 rounded-sm text-sm" />
            <button
              onClick={() => { navigator.clipboard.writeText(link); toast.success("نُسخ الرابط"); }}
              className="px-4 py-2 bg-gold text-background rounded-sm text-sm flex items-center gap-2"
            >
              <Copy className="w-4 h-4" /> نسخ
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="border border-border rounded-sm p-6 bg-card">
            <Users className="w-5 h-5 text-gold mb-2" />
            <div className="text-3xl font-serif">{refs.length}</div>
            <div className="text-sm text-muted-foreground">إحالات مسجّلة</div>
          </div>
          <div className="border border-border rounded-sm p-6 bg-card">
            <Gift className="w-5 h-5 text-gold mb-2" />
            <div className="text-3xl font-serif">{granted}</div>
            <div className="text-sm text-muted-foreground">شهور مجانية مكتسبة</div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground border-t border-border pt-4">
          <strong>كيف يعمل؟</strong> أرسلي الرابط لزميلة. حين تُكمل تسجيلها وتُفعّل اشتراكها الأول، يُضاف شهر مجاني تلقائيًا لاشتراكَيكما عند مراجعة الإدارة.
        </div>
      </section>
      <Footer />
    </div>
  );
}
