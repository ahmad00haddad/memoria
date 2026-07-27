import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/ui/loading";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { toast } from "sonner";
import { CheckCircle2, ArrowLeft, ArrowRight, Camera, DollarSign, Wallet, Eye, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
  head: () => ({
    meta: [
      { title: "إعداد حسابك — Memoria" },
      { name: "description", content: "خطوات سريعة لإكمال ملف المصوّرة قبل استقبال أول حجز." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Form = {
  display_name: string;
  username: string;
  city: string;
  bio: string;
  avatar_url: string;
  cliq_alias: string;
  whatsapp: string;
  pkg_label: string;
  pkg_price: string;
  pkg_service: "photography" | "cinematic_video";
  pkg_type: "hourly" | "full_day" | "addon";
};

const STEPS = [
  { icon: Sparkles, title: "مرحباً بكِ في Memoria", desc: "٥ خطوات قصيرة لإطلاق ملفك الاحترافي واستقبال أول حجز." },
  { icon: Camera, title: "معلوماتك الأساسية", desc: "الاسم الذي يراه العميل، اسم المستخدم للرابط، والمدينة." },
  { icon: DollarSign, title: "أول باقة أسعار", desc: "بدون باقة لن يستطيع العميل رؤية أسعارك أو طلب الحجز." },
  { icon: Wallet, title: "بيانات الدفع والتواصل", desc: "CliQ alias ورقم واتساب — تظهر للعميل فقط بعد تأكيد الحجز." },
  { icon: Eye, title: "نشر ملفك", desc: "راجعي البيانات وفعّلي ظهور ملفك العام." },
];

function Onboarding() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uid, setUid] = useState("");
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>({
    display_name: "", username: "", city: "", bio: "", avatar_url: "",
    cliq_alias: "", whatsapp: "",
    pkg_label: "", pkg_price: "", pkg_service: "photography", pkg_type: "hourly",
  });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { nav({ to: "/login" }); return; }
      setUid(session.user.id);
      const [{ data: p }, { data: priv }, { data: rules }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
        supabase.from("photographer_private").select("cliq_alias, whatsapp").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("pricing_rules").select("id, label, price, service, package").eq("photographer_id", session.user.id).limit(1),
      ]);
      if ((p as any)?.onboarding_completed_at) { nav({ to: "/dashboard" }); return; }
      const first = rules?.[0] as any;
      setF({
        display_name: p?.display_name ?? "",
        username: p?.username ?? "",
        city: p?.city ?? "",
        bio: p?.bio ?? "",
        avatar_url: p?.avatar_url ?? "",
        cliq_alias: priv?.cliq_alias ?? "",
        whatsapp: priv?.whatsapp ?? "",
        pkg_label: first?.label ?? "",
        pkg_price: first?.price ? String(first.price) : "",
        pkg_service: first?.service ?? "photography",
        pkg_type: first?.package ?? "hourly",
      });
      const savedStep = Number((p as any)?.onboarding_step ?? 0);
      setStep(Math.min(Math.max(savedStep, 0), STEPS.length - 1));
      setLoading(false);
    })();
  }, [nav]);

  const upd = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));

  const persistStep = async (nextStep: number) => {
    await supabase.from("profiles").update({ onboarding_step: nextStep } as any).eq("id", uid);
  };

  const validateStep = (): string | null => {
    if (step === 1) {
      const uname = f.username.trim().toLowerCase();
      if (!f.display_name.trim()) return "أدخلي الاسم الذي سيظهر للعميل.";
      if (uname.length < 3 || !/^[a-z0-9_]+$/.test(uname)) return "اسم المستخدم يجب أن يكون ٣ أحرف على الأقل (a-z, 0-9, _).";
      if (!f.city.trim()) return "اختاري المدينة الأساسية.";
      if (f.avatar_url.trim() && !/^https?:\/\/.+/i.test(f.avatar_url.trim())) {
        return "رابط الصورة يجب أن يبدأ بـ http:// أو https://";
      }
    }
    if (step === 2) {
      if (!f.pkg_label.trim()) return "أدخلي اسم الباقة (مثال: باقة الساعة الواحدة).";
      if (!f.pkg_price || Number(f.pkg_price) <= 0) return "أدخلي سعراً صحيحاً للباقة.";
    }
    if (step === 3) {
      if (!f.cliq_alias.trim() && !f.whatsapp.trim()) return "أضيفي CliQ أو رقم واتساب على الأقل.";
      if (f.whatsapp.trim() && !/^\+?\d{9,15}$/.test(f.whatsapp.trim().replace(/[\s-]/g, ""))) {
        return "رقم واتساب غير صحيح — أدخلي رقماً دولياً مثل +9627XXXXXXXX.";
      }
    }
    return null;
  };

  const saveStepData = async (): Promise<boolean> => {
    if (step === 1) {
      const { error } = await supabase.from("profiles").update({
        display_name: f.display_name.trim(),
        username: f.username.trim().toLowerCase(),
        city: f.city.trim(),
        bio: f.bio.trim() || null,
        avatar_url: f.avatar_url.trim() || null,
      }).eq("id", uid);
      if (error) {
        if (error.code === '23505') {
          toast.error("اسم المستخدم هذا محجوز، يرجى اختيار اسم آخر.");
        } else {
          toast.error(error.message || "تعذّر حفظ المعلومات");
        }
        return false;
      }
    }
    if (step === 2) {
      const { data: existing } = await supabase.from("pricing_rules")
        .select("id").eq("photographer_id", uid).limit(1).maybeSingle();
      const payload = {
        photographer_id: uid,
        service: f.pkg_service, package: f.pkg_type,
        label: f.pkg_label.trim(), price: Number(f.pkg_price),
      };
      const { error } = existing?.id
        ? await supabase.from("pricing_rules").update(payload).eq("id", existing.id)
        : await supabase.from("pricing_rules").insert(payload);
      if (error) { toast.error(error.message || "تعذّر حفظ الباقة"); return false; }
    }
    if (step === 3) {
      const { error } = await supabase.from("photographer_private").upsert({
        user_id: uid,
        cliq_alias: f.cliq_alias.trim() || null,
        whatsapp: f.whatsapp.trim() || null,
      }, { onConflict: "user_id" });
      if (error) { toast.error(error.message || "تعذّر حفظ بيانات التواصل"); return false; }
    }
    return true;
  };

  const next = async () => {
    if (saving) return;
    const err = validateStep();
    if (err) { toast.error(err); return; }
    setSaving(true);
    const ok = await saveStepData();
    if (!ok) { setSaving(false); return; }
    const nextStep = step + 1;
    await persistStep(nextStep);
    setSaving(false);
    setStep(nextStep);
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      onboarding_completed_at: new Date().toISOString(),
      onboarding_step: STEPS.length,
      is_published: true,
    } as any).eq("id", uid);
    setSaving(false);
    if (error) { toast.error(error.message || "تعذّر إكمال الإعداد"); return; }
    toast.success("تم إطلاق ملفك بنجاح 🎉");
    nav({ to: "/dashboard" });
  };

  const skip = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        onboarding_completed_at: new Date().toISOString(),
        onboarding_step: STEPS.length,
      } as any).eq("id", uid);
      if (error) throw error;
      nav({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e?.message || "تعذّر التخطي، حاولي مجدداً.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-10 max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.3em] text-gold">إعداد الحساب</div>
          <button onClick={skip} className="text-xs text-muted-foreground hover:text-foreground">تخطّي وإكمال لاحقاً</button>
        </div>

        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full transition ${i <= step ? "bg-gold" : "bg-secondary"}`} />
          ))}
        </div>

        <div className="rounded-sm border border-border bg-card p-6 sm:p-8 shadow-soft">
          <div className="flex items-start gap-4 mb-6">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-gold/15 shrink-0">
              <Icon className="h-6 w-6 text-gold" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">الخطوة {step + 1} من {STEPS.length}</div>
              <h1 className="font-serif text-2xl leading-tight">{s.title}</h1>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
            </div>
          </div>

          {step === 0 && (
            <ul className="space-y-3 text-sm text-muted-foreground">
              {["معلوماتك الأساسية والمدينة", "أول باقة أسعار", "بيانات الدفع والتواصل", "نشر ملفك للعملاء"].map((t) => (
                <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gold" />{t}</li>
              ))}
            </ul>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Field label="الاسم الظاهر للعميل *">
                <input value={f.display_name} onChange={(e) => upd("display_name", e.target.value)} className={inputCx} placeholder="سارة أحمد / استوديو النور" />
              </Field>
              <Field label="اسم المستخدم * (يظهر في رابط ملفك)">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">memoria.jo/photographers/</span>
                  <input value={f.username} onChange={(e) => upd("username", e.target.value)} className={inputCx} placeholder="sara_photo" dir="ltr" />
                </div>
              </Field>
              <Field label="المدينة *">
                <input value={f.city} onChange={(e) => upd("city", e.target.value)} className={inputCx} placeholder="عمّان / إربد / الزرقاء…" />
              </Field>
              <Field label="نبذة قصيرة (اختياري)">
                <textarea value={f.bio} onChange={(e) => upd("bio", e.target.value)} className={inputCx + " min-h-[90px]"} placeholder="أسلوبك، خبرتك، نوع الجلسات التي تفضّلينها…" />
              </Field>
              <Field label="رابط صورتك الشخصية (اختياري)">
                <input value={f.avatar_url} onChange={(e) => upd("avatar_url", e.target.value)} className={inputCx} placeholder="https://…" dir="ltr" />
                <p className="text-xs text-muted-foreground mt-1">يمكنك رفع صورة أعلى جودة لاحقاً من الملف الشخصي.</p>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Field label="اسم الباقة *">
                <input value={f.pkg_label} onChange={(e) => upd("pkg_label", e.target.value)} className={inputCx} placeholder="مثال: باقة الساعة الواحدة / يوم كامل" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="نوع الخدمة">
                  <select value={f.pkg_service} onChange={(e) => upd("pkg_service", e.target.value as any)} className={inputCx}>
                    <option value="photography">تصوير فوتوغرافي</option>
                    <option value="cinematic_video">تصوير فيديو</option>
                  </select>
                </Field>
                <Field label="نوع الباقة">
                  <select value={f.pkg_type} onChange={(e) => upd("pkg_type", e.target.value as any)} className={inputCx}>
                    <option value="hourly">بالساعة</option>
                    <option value="full_day">يوم كامل</option>
                    <option value="addon">إضافة</option>
                  </select>
                </Field>
              </div>
              <Field label="السعر (د.أ) *">
                <input type="number" min={0} value={f.pkg_price} onChange={(e) => upd("pkg_price", e.target.value)} className={inputCx} placeholder="100" dir="ltr" />
              </Field>
              <p className="text-xs text-muted-foreground">يمكنك إضافة المزيد من الباقات لاحقاً من صفحة الأسعار.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Field label="CliQ alias (لاستقبال العربون)">
                <input value={f.cliq_alias} onChange={(e) => upd("cliq_alias", e.target.value)} className={inputCx} placeholder="SARA.PHOTO" dir="ltr" />
              </Field>
              <Field label="رقم واتساب (للتواصل مع العميل)">
                <input value={f.whatsapp} onChange={(e) => upd("whatsapp", e.target.value)} className={inputCx} placeholder="+9627XXXXXXXX" dir="ltr" />
              </Field>
              <p className="text-xs text-muted-foreground">لن تظهر هذه البيانات إلا للعملاء الذين أكّدوا حجزهم فعلياً.</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-sm">
              <div className="rounded-sm border border-border bg-background p-4 space-y-2">
                <Row k="الاسم" v={f.display_name} />
                <Row k="اسم المستخدم" v={"@" + f.username} />
                <Row k="المدينة" v={f.city} />
                <Row k="أول باقة" v={`${f.pkg_label} — ${f.pkg_price} د.أ`} />
                <Row k="CliQ / واتساب" v={[f.cliq_alias, f.whatsapp].filter(Boolean).join(" · ") || "—"} />
              </div>
              <div className="rounded-sm border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40 p-4 text-emerald-800 dark:text-emerald-300 text-sm">
                عند الضغط على "نشر ملفي" سيصبح ملفك مرئياً للعملاء ويمكنهم بدء الحجز مباشرة.
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              onClick={back}
              disabled={step === 0 || saving}
              className="text-sm px-4 py-2 border border-border rounded-sm hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4" /> السابق
            </button>
            {isLast ? (
              <button
                onClick={finish}
                disabled={saving}
                className="text-sm px-6 py-2 rounded-sm bg-emerald-600 text-white hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                نشر ملفي وإنهاء الإعداد
              </button>
            ) : (
              <button
                onClick={next}
                disabled={saving}
                className="text-sm px-6 py-2 rounded-sm bg-charcoal text-ivory hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                التالي <ArrowLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const inputCx = "w-full h-10 px-3 rounded-sm border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1.5">{label}</div>
      {children}
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className="text-sm font-medium text-end">{v || "—"}</span>
    </div>
  );
}