import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Eye } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { updateRefundPolicy } from "@/lib/cancellation.functions";
import { uploadProfilePhoto, uploadPortfolioPhoto } from "@/lib/upload";
import { requestVerification, updateNotificationPreferences } from "@/lib/trust.functions";

export const Route = createFileRoute("/dashboard/profile")({ component: ProfilePage });

function ProfilePage() {
  const nav = useNavigate();
  const updRefundFn = useServerFn(updateRefundPolicy);
  const verifyFn = useServerFn(requestVerification);
  const notifFn = useServerFn(updateNotificationPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uid, setUid] = useState("");
  const [p, setP] = useState<any>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const portfolioRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return nav({ to: "/login" });
      setUid(session.user.id);
      const [{ data }, { data: priv }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
        supabase.from("photographer_private").select("*").eq("user_id", session.user.id).maybeSingle(),
      ]);
      setP({ ...(data ?? {}), ...(priv ?? {}) });
      setLoading(false);
    })();
  }, [nav]);

  const onAvatar = async (f: File) => {
    const res = await uploadProfilePhoto(f, uid, "avatar");
    if (res.ok) {
      const url = res.publicUrl || res.path;
      setP({ ...p, avatar_url: url });
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", uid);
      toast.success("تم رفع الصورة وحفظها");
    } else {
      toast.error(res.userMessage);
    }
  };

  const onCover = async (f: File) => {
    const res = await uploadProfilePhoto(f, uid, "cover");
    if (res.ok) {
      const url = res.publicUrl || res.path;
      setP({ ...p, cover_url: url });
      await supabase.from("profiles").update({ cover_url: url }).eq("id", uid);
      toast.success("تم رفع الغلاف وحفظه");
    } else {
      toast.error(res.userMessage);
    }
  };

  const onPortfolio = async (files: FileList) => {
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        const res = await uploadPortfolioPhoto(f, uid);
        if (res.ok) urls.push(res.publicUrl || res.path);
        else toast.error(res.userMessage);
      }
      if (urls.length > 0) {
        const newUrls = [...(p.portfolio_urls ?? []), ...urls];
        setP({ ...p, portfolio_urls: newUrls });
        await supabase.from("profiles").update({ portfolio_urls: newUrls }).eq("id", uid);
        toast.success(`أُضيفت ${urls.length} صور وتم الحفظ`);
      }
    } catch (e: any) { toast.error(e.message); }
  };

  const removePortfolio = async (i: number) => {
    const arr = [...(p.portfolio_urls ?? [])];
    arr.splice(i, 1);
    setP({ ...p, portfolio_urls: arr });
    await supabase.from("profiles").update({ portfolio_urls: arr }).eq("id", uid);
    toast.success("تم إزالة الصورة وحفظ التعديلات");
  };

  const save = async () => {
    setSaving(true);
    const finalDepositPercent = Math.max(0, Math.min(100, Number(p.deposit_percent || 25)));
    const finalFixedDeposit = p.fixed_deposit ? Math.max(0, Number(p.fixed_deposit)) : null;

    const { error } = await supabase.from("profiles").update({
      display_name: p.display_name, username: p.username, bio: p.bio, city: p.city,
      base_location: p.base_location, instagram: p.instagram,
      equipment: p.equipment, deposit_percent: finalDepositPercent,
      travel_fee_per_km: Math.max(0, Number(p.travel_fee_per_km || 0.5)), free_km: Math.max(0, Number(p.free_km || 20)),
      avatar_url: p.avatar_url, cover_url: p.cover_url, portfolio_urls: p.portfolio_urls ?? [],
      is_published: !!p.is_published,
      tagline: p.tagline ?? null,
      booking_notes: p.booking_notes ?? null,
      fixed_deposit: finalFixedDeposit,
    }).eq("id", uid);
    const { error: pErr } = await supabase.from("photographer_private").upsert({
      user_id: uid,
      phone: p.phone ?? null,
      whatsapp: p.whatsapp ?? null,
      cliq_alias: p.cliq_alias ?? null,
      bank_info: p.bank_info ?? null,
    }, { onConflict: "user_id" });
    // سياسة استرداد العربون عبر server fn مُصادَق (تتحقّق من ownership)
    try {
      await updRefundFn({ data: {
        policy: (p.deposit_refund_policy as any) || "full",
        percent: p.deposit_refund_policy === "partial" ? Number(p.deposit_refund_percent || 0) : null,
      }});
    } catch (e: any) {
      setSaving(false);
      return toast.error(e?.message || "تعذّر حفظ سياسة الاسترداد");
    }
    setSaving(false);
    if (error || pErr) return toast.error((error ?? pErr)!.message);
    toast.success("تم الحفظ");
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 max-w-3xl">
        <BackToDashboard />
        <div className="flex items-center justify-between mt-2 mb-8 flex-wrap gap-4">
          <h1 className="font-serif text-4xl">تعديل الملف الشخصي</h1>
          {p?.username && (
            <Link
              to="/photographers/$username"
              params={{ username: p.username }}
              target="_blank"
              className="inline-flex items-center gap-2 bg-secondary text-foreground hover:bg-gold hover:text-white px-4 py-2 rounded-sm text-sm transition"
            >
              <Eye className="h-4 w-4" />
              معاينة ملفي العام
            </Link>
          )}
        </div>

        {!p?.is_published && (
          <div className="rounded-sm border border-gold/30 bg-gold/10 p-4 mb-8 text-sm leading-relaxed">
            ملفك غير منشور حاليًا، لذلك لن يظهر للعملاء في البحث. بعد إكمال البيانات الأساسية والصور، فعّلي خيار <strong>نشر ملفي للعموم</strong> في أسفل الصفحة ثم احفظي التغييرات.
          </div>
        )}

        <div className="space-y-8">
          <Card title="الصور">
            <div className="grid sm:grid-cols-2 gap-4">
              <ImgPicker label="الصورة الشخصية" url={p.avatar_url} onPick={onAvatar} />
              <ImgPicker label="صورة الغلاف" url={p.cover_url} onPick={onCover} aspect="aspect-[16/9]" />
            </div>

            <div className="mt-6">
              <div className="text-sm mb-2">معرض الأعمال ({(p.portfolio_urls ?? []).length})</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {(p.portfolio_urls ?? []).map((u: string, i: number) => (
                  <div key={i} className="relative aspect-square bg-secondary rounded-sm overflow-hidden">
                    <img src={u} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => removePortfolio(i)} className="absolute top-1 left-1 bg-black/60 text-white rounded-full p-1"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                <button onClick={() => portfolioRef.current?.click()} className="aspect-square border-2 border-dashed border-border rounded-sm grid place-items-center text-muted-foreground hover:bg-secondary">
                  <Upload className="h-5 w-5" />
                </button>
                <input ref={portfolioRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && onPortfolio(e.target.files)} />
              </div>
            </div>
          </Card>

          <Card title="المعلومات الأساسية">
            <Field label="الاسم المعروض" v={p.display_name} on={(v) => setP({ ...p, display_name: v })} />
            <Field label="اسم المستخدم (للرابط)" v={p.username} on={(v) => setP({ ...p, username: v.toLowerCase().replace(/[^a-z0-9_]/g, "") })} />
            <Field label="شعار قصير (Tagline) — مثال: PHOTOGRAPHY" v={p.tagline} on={(v) => setP({ ...p, tagline: v })} />
            <Field label="المدينة" v={p.city} on={(v) => setP({ ...p, city: v })} />
            <Field label="الموقع الأساسي (عمّان مثلاً)" v={p.base_location} on={(v) => setP({ ...p, base_location: v })} />
            <Area label="نبذة قصيرة" v={p.bio} on={(v) => setP({ ...p, bio: v })} />
            <Area label="المعدّات" v={p.equipment} on={(v) => setP({ ...p, equipment: v })} />
          </Card>

          <Card title="التواصل والدفع">
            <Field label="رقم الهاتف" v={p.phone} on={(v) => setP({ ...p, phone: v })} />
            <Field label="واتساب" v={p.whatsapp} on={(v) => setP({ ...p, whatsapp: v })} />
            <Field label="إنستغرام (اسم المستخدم)" v={p.instagram} on={(v) => setP({ ...p, instagram: v })} />
            <Field label="CliQ Alias لاستلام العربون" v={p.cliq_alias} on={(v) => setP({ ...p, cliq_alias: v })} />
            <Area label="معلومات الحساب البنكي (بنك / رقم حساب / IBAN)" v={p.bank_info} on={(v) => setP({ ...p, bank_info: v })} />
          </Card>

          <Card title="إعدادات الحجز">
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div><label className="text-sm text-muted-foreground block mb-1">نسبة العربون (%)</label><input type="number" min="0" max="100" value={p.deposit_percent || ""} onChange={(e) => setP({ ...p, deposit_percent: e.target.value })} className="w-full border border-border rounded-sm px-3 py-2 bg-background" /></div>
              <div><label className="text-sm text-muted-foreground block mb-1">عربون ثابت (يُلغي النسبة - د.أ)</label><input type="number" min="0" value={p.fixed_deposit || ""} onChange={(e) => setP({ ...p, fixed_deposit: e.target.value })} placeholder="اختياري" className="w-full border border-border rounded-sm px-3 py-2 bg-background" /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div><label className="text-sm text-muted-foreground block mb-1">تكلفة الكيلومتر الإضافي (د.أ)</label><input type="number" min="0" step="0.1" value={p.travel_fee_per_km || ""} onChange={(e) => setP({ ...p, travel_fee_per_km: e.target.value })} className="w-full border border-border rounded-sm px-3 py-2 bg-background" /></div>
              <div><label className="text-sm text-muted-foreground block mb-1">الكيلومترات المجانية (ضمن الباقة)</label><input type="number" min="0" value={p.free_km || ""} onChange={(e) => setP({ ...p, free_km: e.target.value })} className="w-full border border-border rounded-sm px-3 py-2 bg-background" /></div>
            </div>
            <Area label="ملاحظات مهمة تظهر للعميل (مثال: تسليم الصور خلال أسبوع، الفيديو خلال شهر…)" v={p.booking_notes} on={(v) => setP({ ...p, booking_notes: v })} />
            <label className="flex items-center gap-2 text-sm mt-3">
              <input type="checkbox" checked={!!p.is_published} onChange={(e) => setP({ ...p, is_published: e.target.checked })} />
              نشر ملفي للعموم
            </label>
          </Card>

          <Card title="سياسة استرداد العربون عند الإلغاء">
            <p className="text-xs text-muted-foreground -mt-2">
              تُطبَّق هذه السياسة تلقائياً عند إلغاء حجز مؤكَّد العربون. لا تؤثّر على الحجوزات قبل تأكيد العربون.
            </p>
            <div className="grid sm:grid-cols-3 gap-2">
              {[
                { v: "full", l: "استرداد كامل" },
                { v: "partial", l: "استرداد جزئي" },
                { v: "none", l: "لا استرداد" },
              ].map((o) => (
                <label key={o.v} className={`flex items-center gap-2 border rounded-sm px-3 py-2 text-sm cursor-pointer ${ (p.deposit_refund_policy || "full") === o.v ? "border-gold bg-gold/5" : "border-border"}`}>
                  <input
                    type="radio" name="refundPolicy" value={o.v}
                    checked={(p.deposit_refund_policy || "full") === o.v}
                    onChange={() => setP({ ...p, deposit_refund_policy: o.v })}
                  />
                  {o.l}
                </label>
              ))}
            </div>
            {(p.deposit_refund_policy === "partial") && (
              <label className="block mt-2"><span className="text-sm text-muted-foreground">نسبة الاسترداد % (0-100)</span><input type="number" min="0" max="100" value={p.deposit_refund_percent || ""} onChange={(e) => setP({ ...p, deposit_refund_percent: e.target.value })} className="w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background" /></label>
            )}
          </Card>

          <button onClick={save} disabled={saving} className="w-full bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90 disabled:opacity-60">
            {saving ? "جاري الحفظ…" : "حفظ التغييرات"}
          </button>

          <Card title="حالة التحقق">
            <div className="flex items-center gap-3">
              {p.verification_status === "verified" && (
                <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-medium">✓ موثّقة</span>
              )}
              {p.verification_status === "pending_review" && (
                <span className="inline-flex items-center gap-1 text-amber-600 text-sm font-medium">⏳ قيد المراجعة</span>
              )}
              {p.verification_status === "rejected" && (
                <span className="inline-flex items-center gap-1 text-red-500 text-sm font-medium">✗ تم الرفض</span>
              )}
              {(!p.verification_status || p.verification_status === "unverified") && (
                <>
                  <span className="text-sm text-muted-foreground">غير موثّقة</span>
                  <button
                    onClick={async () => {
                      try {
                        await verifyFn();
                        toast.success("تم إرسال طلب التحقق");
                        setP({ ...p, verification_status: "pending_review" });
                      } catch (e: any) {
                        toast.error(e?.message || "تعذّر إرسال الطلب");
                      }
                    }}
                    className="text-xs border border-gold/40 text-gold px-3 py-1.5 rounded-sm hover:bg-gold/10"
                  >
                    طلب التحقق
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">المصوّرات الموثّقات يحصلن على شارة ✓ تزيد ثقة العملاء.</p>
          </Card>

          <Card title="تفضيلات الإشعارات">
            <div className="space-y-2">
              {[
                { key: "booking_new", label: "طلب حجز جديد" },
                { key: "booking_confirmed", label: "تأكيد حجز" },
                { key: "booking_cancelled", label: "إلغاء حجز" },
                { key: "deposit_received", label: "استلام عربون" },
                { key: "message_new", label: "رسالة جديدة" },
                { key: "review_new", label: "تقييم جديد" },
                { key: "subscription_expiring", label: "اشتراك ينتهي قريباً" },
                { key: "event_reminder", label: "تذكير قبل المناسبة" },
                { key: "marketing", label: "إشعارات تسويقية" },
              ].map((pref) => {
                const prefs = p.notification_preferences ?? {};
                const enabled = prefs[pref.key] !== false;
                return (
                  <label key={pref.key} className="flex items-center justify-between py-1.5 cursor-pointer">
                    <span className="text-sm">{pref.label}</span>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={async () => {
                        const newPrefs = { ...prefs, [pref.key]: !enabled };
                        setP({ ...p, notification_preferences: newPrefs });
                        try {
                          await notifFn({ data: { preferences: newPrefs } });
                          toast.success("تم تحديث التفضيلات");
                        } catch (e: any) {
                          toast.error(e?.message || "تعذّر تحديث التفضيلات");
                        }
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </Card>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Card({ title, children }: any) {
  return <div className="rounded-sm border border-border bg-card p-6 shadow-soft space-y-4"><h2 className="font-serif text-xl">{title}</h2>{children}</div>;
}
function Field({ label, v, on, type = "text" }: { label: string; v: any; on: (v: string) => void; type?: string }) {
  return <label className="block"><span className="text-sm text-muted-foreground">{label}</span><input type={type} value={v ?? ""} onChange={(e) => on(e.target.value)} className="w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background" /></label>;
}
function Area({ label, v, on }: { label: string; v: any; on: (v: string) => void }) {
  return <label className="block"><span className="text-sm text-muted-foreground">{label}</span><textarea value={v ?? ""} onChange={(e) => on(e.target.value)} rows={4} className="w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background" /></label>;
}
function ImgPicker({ label, url, onPick, aspect = "aspect-square" }: any) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="text-sm mb-2">{label}</div>
      <button onClick={() => ref.current?.click()} className={`relative w-full ${aspect} bg-secondary rounded-sm overflow-hidden border border-border grid place-items-center`}>
        {url ? <img src={url} className="w-full h-full object-cover" alt="" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
    </div>
  );
}