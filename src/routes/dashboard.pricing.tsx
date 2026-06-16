import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/pricing")({ component: PricingMgr });

type Rule = {
  id?: string; service: "photography" | "cinematic_video"; package: "hourly" | "full_day" | "addon";
  label: string; price: number; per_photo_price?: number | null; description?: string | null;
};

function PricingMgr() {
  const nav = useNavigate();
  const [uid, setUid] = useState("");
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return nav({ to: "/login" });
        setUid(session.user.id);
        const { data, error } = await supabase.from("pricing_rules").select("*").eq("photographer_id", session.user.id);
        if (error) throw error;
        setRules((data ?? []) as Rule[]);
      } catch (error: any) {
        setLoadError(error?.message || "تعذّر تحميل الأسعار الآن.");
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  const add = () => setRules([...rules, { service: "photography", package: "hourly", label: "", price: 0 }]);
  const upd = (i: number, k: keyof Rule, v: any) => { const a = [...rules]; (a[i] as any)[k] = v; setRules(a); };
  const del = async (i: number) => {
    const r = rules[i];
    if (r.id) await supabase.from("pricing_rules").delete().eq("id", r.id);
    setRules(rules.filter((_, idx) => idx !== i));
  };
  const save = async () => {
    for (const r of rules) {
      if (!r.label) continue;
      const payload = { ...r, photographer_id: uid, price: Number(r.price), per_photo_price: r.per_photo_price ? Number(r.per_photo_price) : 0 };
      if (r.id) await supabase.from("pricing_rules").update(payload).eq("id", r.id);
      else await supabase.from("pricing_rules").insert(payload);
    }
    toast.success("تم حفظ الأسعار");
    const { data } = await supabase.from("pricing_rules").select("*").eq("photographer_id", uid);
    setRules((data ?? []) as Rule[]);
  };

  if (loading) return <div className="min-h-screen grid place-items-center">جاري التحميل…</div>;
  if (loadError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <section className="container-editorial py-12 max-w-3xl">
          <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-gold">← اللوحة</Link>
          <div className="rounded-sm border border-destructive/30 bg-card p-6 shadow-soft mt-4">
            <h1 className="font-serif text-3xl mb-2">تعذّر فتح صفحة الأسعار</h1>
            <p className="text-sm text-muted-foreground mb-4">{loadError}</p>
            <button onClick={() => window.location.reload()} className="bg-charcoal text-ivory px-5 py-2 rounded-sm hover:opacity-90">إعادة المحاولة</button>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 max-w-4xl">
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-gold">← اللوحة</Link>
        <h1 className="font-serif text-4xl mt-2 mb-2">إدارة الأسعار</h1>
        <p className="text-sm text-muted-foreground mb-6">حدّدي باقات التصوير والفيديو والإضافات. تظهر فورًا للعملاء على ملفك العام.</p>

        {rules.length === 0 && (
          <div className="rounded-sm border border-border bg-card p-6 shadow-soft mb-6">
            <h2 className="font-serif text-2xl mb-2">ابدئي بأول باقة</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              العميل لن يستطيع فهم خدمتك أو الحجز بشكل واضح إذا لم يجد باقات جاهزة. أضيفي على الأقل باقة تصوير وباقة يوم كامل، ثم احفظيها لتظهر مباشرة في ملفك العام.
            </p>
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-sm border border-border bg-background p-4">
                <div className="font-medium mb-1">تصوير 4 ساعات</div>
                <div className="text-muted-foreground">مناسب للحفلات القصيرة أو الخطبة.</div>
              </div>
              <div className="rounded-sm border border-border bg-background p-4">
                <div className="font-medium mb-1">يوم زفاف كامل</div>
                <div className="text-muted-foreground">من التحضيرات حتى نهاية الحفل.</div>
              </div>
              <div className="rounded-sm border border-border bg-background p-4">
                <div className="font-medium mb-1">إضافة فيديو أو ألبوم</div>
                <div className="text-muted-foreground">خيار إضافي يرفع قيمة الطلب.</div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {rules.map((r, i) => (
            <div key={i} className="rounded-sm border border-border bg-card p-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_120px_120px_auto]">
              <select value={r.service} onChange={(e) => upd(i, "service", e.target.value)} className="border border-border rounded-sm px-2 py-2 bg-background text-sm">
                <option value="photography">تصوير فوتوغرافي</option>
                <option value="cinematic_video">فيديو سينمائي</option>
              </select>
              <select value={r.package} onChange={(e) => upd(i, "package", e.target.value)} className="border border-border rounded-sm px-2 py-2 bg-background text-sm">
                <option value="hourly">بالساعة</option>
                <option value="full_day">يوم كامل</option>
                <option value="addon">إضافة</option>
              </select>
              <input placeholder="مثال: 4 ساعات" value={r.label} onChange={(e) => upd(i, "label", e.target.value)} className="border border-border rounded-sm px-3 py-2 bg-background text-sm" />
              <input type="number" placeholder="السعر" value={r.price} onChange={(e) => upd(i, "price", e.target.value)} className="border border-border rounded-sm px-3 py-2 bg-background text-sm" />
              <input type="number" placeholder="سعر الصورة الإضافية" value={r.per_photo_price ?? ""} onChange={(e) => upd(i, "per_photo_price", e.target.value)} className="border border-border rounded-sm px-3 py-2 bg-background text-sm" />
              <button onClick={() => del(i)} className="text-destructive p-2 hover:bg-destructive/10 rounded-sm"><Trash2 className="h-4 w-4" /></button>
              <input placeholder="وصف اختياري" value={r.description ?? ""} onChange={(e) => upd(i, "description", e.target.value)} className="border border-border rounded-sm px-3 py-2 bg-background text-sm sm:col-span-6" />
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={add} className="inline-flex items-center gap-2 border border-border px-4 py-2 rounded-sm hover:bg-secondary"><Plus className="h-4 w-4" /> إضافة باقة</button>
          <button onClick={save} className="bg-charcoal text-ivory px-6 py-2 rounded-sm hover:opacity-90">حفظ الجميع</button>
        </div>
      </section>
      <Footer />
    </div>
  );
}