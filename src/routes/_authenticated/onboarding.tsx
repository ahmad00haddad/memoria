import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GenderPicker } from "@/components/dashboard/GenderPicker";
import { g, useGender } from "@/hooks/use-gender";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { uploadProfilePhoto } from "@/lib/upload";
import { hapticVibrate } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/ui/loading";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { toast } from "sonner";
import { CheckCircle2, ArrowLeft, ArrowRight, Camera, DollarSign, Wallet, Eye, Sparkles, Loader2, Upload, Pencil } from "lucide-react";
import { t as tr, tx } from "@/i18n";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
  head: () => ({
    meta: [
      { title: tr("إعداد حسابك — Memoria") },
      { name: "description", content: tr("خطوات سريعة لإكمال ملف المصوّرة قبل استقبال أول حجز.") },
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
  refund_policy: "none" | "partial" | "full";
  refund_percent: string;
  pkg_label: string;
  pkg_price: string;
  pkg_service: "photography" | "cinematic_video";
  pkg_type: "hourly" | "full_day" | "addon";
};

const CITIES = ["عمّان", "إربد", "الزرقاء", "العقبة", "السلط", "مادبا"];
const PKG_TEMPLATES = [
  { label: "تغطية ٤ ساعات", price: "150", type: "hourly" as const },
  { label: "يوم زفاف كامل", price: "250", type: "full_day" as const },
  { label: "جلسة خطوبة", price: "100", type: "hourly" as const },
];

const STEPS_ = () => [
  { icon: Sparkles, title: g(tr("مرحباً بكِ في Memoria"), tr("مرحباً بك في Memoria")), desc: tr("٤ خطوات قصيرة تستغرق أقل من ٥ دقائق — بعدها ملفك جاهز لاستقبال أول حجز.") },
  { icon: Camera, title: tr("معلوماتك الأساسية"), desc: g(tr("الاسم الذي يراه العميل، اسم المستخدم للرابط، والمدينة. بعد هذه الخطوة يكون لديك رابط ملف خاص بكِ."), tr("الاسم الذي يراه العميل، اسم المستخدم للرابط، والمدينة. بعد هذه الخطوة يكون لديك رابط ملف خاص بك.")) },
  { icon: DollarSign, title: tr("أول باقة أسعار"), desc: g(tr("بدون باقة لن يستطيع العميل رؤية أسعارك أو طلب الحجز — خطوة واحدة تفتح لكِ باب الحجوزات."), tr("بدون باقة لن يستطيع العميل رؤية أسعارك أو طلب الحجز — خطوة واحدة تفتح لك باب الحجوزات.")) },
  { icon: Wallet, title: tr("الدفع والعربون"), desc: tr("أين تستلمين العربون، وماذا يحدث له إذا ألغت العروس.") },
  { icon: Eye, title: tr("نشر ملفك"), desc: g(tr("راجعي البيانات ثم انشري بنقرة — يمكنك تحديث كل شيء لاحقاً من لوحة التحكم."), tr("راجع البيانات ثم انشر بنقرة — يمكنك تحديث كل شيء لاحقاً من لوحة التحكم.")) },
];

function Onboarding() {
  useGender(); // يعيد الرسم فور تغيير صيغة المخاطبة
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uid, setUid] = useState("");
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [fieldErr, setFieldErr] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState<Form>({
    display_name: "", username: "", city: "", bio: "", avatar_url: "",
    cliq_alias: "", whatsapp: "", refund_policy: "none", refund_percent: "50",
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
        refund_policy: (["none", "partial", "full"].includes((p as any)?.deposit_refund_policy) ? (p as any).deposit_refund_policy : "none"),
        refund_percent: String((p as any)?.deposit_refund_percent ?? 50),
        pkg_label: first?.label ?? "",
        pkg_price: first?.price ? String(first.price) : "",
        pkg_service: first?.service ?? "photography",
        pkg_type: first?.package ?? "hourly",
      });
      const savedStep = Number((p as any)?.onboarding_step ?? 0);
      setStep(Math.min(Math.max(savedStep, 0), STEPS_().length - 1));
      setLoading(false);
    })();
  }, [nav]);

  const upd = <K extends keyof Form>(k: K, v: Form[K]) => { setFieldErr(null); setF((s) => ({ ...s, [k]: v })); };

  const onAvatar = async (file: File) => {
    setAvatarBusy(true);
    const res = await uploadProfilePhoto(file, uid, "avatar");
    setAvatarBusy(false);
    if (!res.ok) { toast.error(res.userMessage); return; }
    upd("avatar_url", res.publicUrl || res.path);
  };

  const persistStep = async (nextStep: number) => {
    await supabase.from("profiles").update({ onboarding_step: nextStep } as any).eq("id", uid);
  };

  const validateStep = (): string | null => {
    if (step === 1) {
      const uname = f.username.trim().toLowerCase();
      if (!f.display_name.trim()) return g(tr("أدخلي الاسم الذي سيظهر للعميل."), tr("أدخل الاسم الذي سيظهر للعميل."));
      if (uname.length < 3 || !/^[a-z0-9_]+$/.test(uname)) return tr("اسم المستخدم يجب أن يكون ٣ أحرف على الأقل (a-z, 0-9, _).");
      if (!f.city.trim()) return g(tr("اختاري المدينة الأساسية."), tr("اختر المدينة الأساسية."));
      if (f.avatar_url.trim() && !/^https?:\/\/.+/i.test(f.avatar_url.trim())) {
        return tr("رابط الصورة يجب أن يبدأ بـ http:// أو https://");
      }
    }
    if (step === 2) {
      if (!f.pkg_label.trim()) return g(tr("أدخلي اسم الباقة (مثال: باقة الساعة الواحدة)."), tr("أدخل اسم الباقة (مثال: باقة الساعة الواحدة)."));
      if (!f.pkg_price || Number(f.pkg_price) <= 0) return g(tr("أدخلي سعراً صحيحاً للباقة."), tr("أدخل سعراً صحيحاً للباقة."));
    }
    if (step === 3) {
      if (!f.cliq_alias.trim() && !f.whatsapp.trim()) return g(tr("أضيفي CliQ أو رقم واتساب على الأقل."), tr("أضف CliQ أو رقم واتساب على الأقل."));
      if (f.whatsapp.trim() && !/^\+?\d{9,15}$/.test(f.whatsapp.trim().replace(/[\s-]/g, ""))) {
        return g(tr("رقم واتساب غير صحيح — أدخلي رقماً دولياً مثل +9627XXXXXXXX."), tr("رقم واتساب غير صحيح — أدخل رقماً دولياً مثل +9627XXXXXXXX."));
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
          toast.error(tr("اسم المستخدم هذا محجوز، يرجى اختيار اسم آخر."));
        } else {
          toast.error(error.message || tr("تعذّر حفظ المعلومات"));
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
      if (error) { toast.error(error.message || tr("تعذّر حفظ الباقة")); return false; }
    }
    if (step === 3) {
      const { error } = await supabase.from("photographer_private").upsert({
        user_id: uid,
        cliq_alias: f.cliq_alias.trim() || null,
        whatsapp: f.whatsapp.trim() || null,
      }, { onConflict: "user_id" });
      if (error) { toast.error(error.message || tr("تعذّر حفظ بيانات التواصل")); return false; }
      const pct = Math.min(99, Math.max(1, Number(f.refund_percent) || 50));
      const { error: polErr } = await supabase.from("profiles").update({
        deposit_refund_policy: f.refund_policy,
        deposit_refund_percent: f.refund_policy === "partial" ? pct : null,
      } as any).eq("id", uid);
      if (polErr) { toast.error(polErr.message || tr("تعذّر حفظ سياسة العربون")); return false; }
    }
    return true;
  };

  const next = async () => {
    if (saving) return;
    const err = validateStep();
    if (err) { setFieldErr(err); setShake((n) => n + 1); hapticVibrate("error"); return; }
    setSaving(true);
    const ok = await saveStepData();
    if (!ok) { setSaving(false); return; }
    const nextStep = step + 1;
    await persistStep(nextStep);
    setSaving(false);
    setDir(1);
    setStep(nextStep);
  };

  const back = () => { setDir(-1); setFieldErr(null); setStep((s) => Math.max(0, s - 1)); };
  const goTo = (i: number) => { setDir(i > step ? 1 : -1); setFieldErr(null); setStep(i); };

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    // لا نُنشر الملف بدون باقة سعرية واحدة على الأقل (تحقّق فعلي وليس على الواجهة فقط)
    const { count: pkgCount } = await supabase
      .from("pricing_rules")
      .select("id", { count: "exact", head: true })
      .eq("photographer_id", uid);
    if (!pkgCount) {
      setSaving(false);
      toast.error(g(tr("أضيفي باقة سعرية واحدة على الأقل قبل نشر ملفك"), tr("أضف باقة سعرية واحدة على الأقل قبل نشر ملفك")));
      setStep(2);
      return;
    }
    const { error } = await supabase.from("profiles").update({
      onboarding_completed_at: new Date().toISOString(),
      onboarding_step: STEPS_().length,
      is_published: true,
    } as any).eq("id", uid);
    setSaving(false);
    if (error) { toast.error(error.message || tr("تعذّر إكمال الإعداد")); return; }
    hapticVibrate("success");
    try { confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors: ["#c9a96e", "#f4ead5", "#2b2520"] }); } catch { /* ignore */ }
    toast.success(tr("ملفك منشور الآن — العرائس يستطعن رؤيته وحجز موعد"));
    setTimeout(() => nav({ to: "/dashboard" }), 900);
  };

  const skip = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        onboarding_completed_at: new Date().toISOString(),
        onboarding_step: STEPS_().length,
      } as any).eq("id", uid);
      if (error) throw error;
      nav({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e?.message || g(tr("تعذّر التخطي، حاولي مجدداً."), tr("تعذّر التخطي، حاول مجدداً.")));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  const s = STEPS_()[step];
  const Icon = s.icon;
  const isLast = step === STEPS_().length - 1;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-10 max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.3em] text-gold">{tr("إعداد الحساب")}</div>
          <button onClick={skip} className="text-xs text-muted-foreground hover:text-foreground">{g(tr("تخطّي وإكمال لاحقاً"), tr("تخطَّ وإكمال لاحقاً"))}</button>
        </div>

        <div className="mb-6 flex items-center gap-2">
          {STEPS_().map((_, i) => (
            <span key={i} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <motion.span
                className="absolute inset-y-0 start-0 rounded-full bg-gold"
                initial={false}
                animate={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
          ))}
        </div>

        <motion.div
          key={shake}
          animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : undefined}
          transition={{ duration: 0.35 }}
          onKeyDown={(e) => { if (e.key === "Enter" && !(e.target as HTMLElement).matches("textarea") && !isLast) { e.preventDefault(); next(); } }}
          className="overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-soft"
        >
        <AnimatePresence mode="wait" initial={false} custom={dir}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: dir > 0 ? -24 : 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir > 0 ? 24 : -24 }}
          transition={{ duration: 0.22 }}
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-gold/15 shrink-0">
              <Icon className="h-6 w-6 text-gold" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{tr("الخطوة {0} من {1}", [step + 1, STEPS_().length])}</div>
              <h1 className="font-serif text-2xl leading-tight">{tx(s.title)}</h1>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{tx(s.desc)}</p>
            </div>
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-xs bg-gold/10 text-gold border border-gold/20 rounded-full px-3 py-1.5 mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                {tr("تستغرق أقل من ٥ دقائق")}
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {[tr("الاسم الظاهر للعميل ورابط ملفك الخاص"), tr("أول باقة أسعار لتفعيل الحجوزات"), tr("بيانات الدفع — آمنة ومخفية عن الزوار"), tr("نشر ملفك بنقرة واحدة")].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-gold shrink-0" />{tx(t)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Field label={tr("أنا")}>
                <GenderPicker />
              </Field>
              <Field label={tr("الاسم الظاهر للعميل *")}>
                <input value={f.display_name} onChange={(e) => upd("display_name", e.target.value)} className={inputCx} placeholder={tr("سارة أحمد / استوديو النور")} />
              </Field>
              <Field label={tr("اسم المستخدم * (يظهر في رابط ملفك)")}>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">{typeof window !== "undefined" ? window.location.host : ""}/photographers/</span>
                  <input value={f.username} onChange={(e) => upd("username", e.target.value)} className={inputCx} placeholder="sara_photo" dir="ltr" />
                </div>
              </Field>
              <Field label={tr("المدينة *")}>
                <input value={f.city} onChange={(e) => upd("city", e.target.value)} className={inputCx} placeholder={tr("عمّان / إربد / الزرقاء…")} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CITIES.map((c) => (
                    <button key={c} type="button" onClick={() => upd("city", c)} className={`rounded-full border px-3 py-1 text-xs transition-colors ${f.city === c ? "border-gold bg-gold/10 text-foreground" : "border-border text-muted-foreground hover:border-gold/40"}`}>{tx(c)}</button>
                  ))}
                </div>
              </Field>
              <Field label={tr("نبذة قصيرة (اختياري)")}>
                <textarea value={f.bio} onChange={(e) => upd("bio", e.target.value)} className={inputCx + " min-h-[90px]"} placeholder={g(tr("أسلوبك، خبرتك، نوع الجلسات التي تفضّلينها…"), tr("أسلوبك، خبرتك، نوع الجلسات التي تفضّلها…"))} />
              </Field>
              <div>
                <div className="text-xs font-medium mb-1.5">{tr("صورتك الشخصية (اختياري)")}</div>
                <button type="button" onClick={() => avatarRef.current?.click()} className="flex items-center gap-3 rounded-xl border border-dashed border-border p-3 text-sm hover:border-gold/50 transition-colors w-full text-start">
                  <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary">
                    {f.avatar_url ? <img src={f.avatar_url} alt="" className="h-full w-full object-cover" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                    {avatarBusy && <span className="absolute inset-0 grid place-items-center bg-black/40"><Loader2 className="h-5 w-5 animate-spin text-white" /></span>}
                  </span>
                  <span>
                    <span className="block font-medium">{f.avatar_url ? tr("تغيير الصورة") : g(tr("اختاري صورة"), tr("اختر صورة"))}</span>
                    <span className="block text-xs text-muted-foreground">{tr("الملفات بصورة شخصية تُفتح أكثر")}</span>
                  </span>
                </button>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onAvatar(file); e.target.value = ""; }} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {!f.pkg_label && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="w-full text-xs text-muted-foreground">{g(tr("ابدئي من مثال وعدّليه:"), tr("ابدأ من مثال وعدّله:"))}</span>
                  {PKG_TEMPLATES.map((t) => (
                    <button key={t.label} type="button" onClick={() => { upd("pkg_label", t.label); upd("pkg_price", t.price); upd("pkg_type", t.type); }} className="rounded-full border border-gold/30 bg-gold/5 px-3 py-1 text-xs text-gold hover:bg-gold/15">
                      {tr("{0} · {1} د.أ", [t.label, t.price])}</button>
                  ))}
                </div>
              )}
              <Field label={tr("اسم الباقة *")}>
                <input value={f.pkg_label} onChange={(e) => upd("pkg_label", e.target.value)} className={inputCx} placeholder={tr("مثال: باقة الساعة الواحدة / يوم كامل")} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={tr("نوع الخدمة")}>
                  <select value={f.pkg_service} onChange={(e) => upd("pkg_service", e.target.value as any)} className={inputCx}>
                    <option value="photography">{tr("تصوير فوتوغرافي")}</option>
                    <option value="cinematic_video">{tr("تصوير فيديو")}</option>
                  </select>
                </Field>
                <Field label={tr("نوع الباقة")}>
                  <select value={f.pkg_type} onChange={(e) => upd("pkg_type", e.target.value as any)} className={inputCx}>
                    <option value="hourly">{tr("بالساعة")}</option>
                    <option value="full_day">{tr("يوم كامل")}</option>
                    <option value="addon">{tr("إضافة")}</option>
                  </select>
                </Field>
              </div>
              <Field label={tr("السعر (د.أ) *")}>
                <input type="number" min={0} value={f.pkg_price} onChange={(e) => upd("pkg_price", e.target.value)} className={inputCx} placeholder="100" dir="ltr" />
              </Field>
              {Number(f.pkg_price) > 0 && (
                <p className="text-xs text-muted-foreground tabular-nums">{tr("العربون الافتراضي ٢٥٪ = {0} د.أ — تغيّرينه لاحقاً من ملفك.", [Math.round(Number(f.pkg_price) * 0.25)])}</p>
              )}
              <p className="text-xs text-muted-foreground">{tr("يمكنك إضافة المزيد من الباقات لاحقاً من صفحة الأسعار.")}</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Field label={tr("CliQ alias (لاستقبال العربون)")}>
                <input value={f.cliq_alias} onChange={(e) => upd("cliq_alias", e.target.value)} className={inputCx} placeholder="SARA.PHOTO" dir="ltr" />
              </Field>
              <Field label={tr("رقم واتساب (للتواصل مع العميل)")}>
                <input value={f.whatsapp} onChange={(e) => upd("whatsapp", e.target.value)} className={inputCx} placeholder="+9627XXXXXXXX" dir="ltr" />
              </Field>
              <p className="text-xs text-muted-foreground">{tr("لن تظهر هذه البيانات إلا للعملاء الذين أكّدوا حجزهم فعلياً.")}</p>
              <Field label={tr("إذا ألغت العروس بعد دفع العربون")}>
                <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
                  {([["none", tr("لا يُرجَع")], ["partial", tr("يُرجَع جزء منه")], ["full", tr("يُرجَع كاملاً")]] as const).map(([v, label]) => (
                    <button key={v} type="button" role="radio" aria-checked={f.refund_policy === v} onClick={() => upd("refund_policy", v)}
                      className={`rounded-sm border px-3 py-2 text-sm transition ${f.refund_policy === v ? "border-gold bg-gold/10 font-medium" : "border-border hover:bg-secondary"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
              {f.refund_policy === "partial" && (
                <Field label={tr("نسبة الإرجاع %")}>
                  <input type="number" inputMode="numeric" min={1} max={99} value={f.refund_percent} onChange={(e) => upd("refund_percent", e.target.value)} className={inputCx} dir="ltr" />
                </Field>
              )}
              <p className="text-xs text-muted-foreground">{tr("تقرأ العروس هذه السياسة وتوافق عليها قبل أن تحوّل العربون. العربون يُحوَّل لكِ مباشرة، والمنصّة لا تستلمه ولا تُرجعه. وإذا ألغيتِ أنتِ الحجز، تُرجعين العربون كاملاً. يمكنكِ تغييرها لاحقاً من الإعدادات.")}</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-sm">
              <div className="rounded-sm border border-border bg-background p-4 space-y-2">
                <Row k={tr("الاسم")} v={f.display_name} onEdit={() => goTo(1)} />
                <Row k={tr("اسم المستخدم")} v={"@" + f.username} onEdit={() => goTo(1)} />
                <Row k={tr("المدينة")} v={f.city} onEdit={() => goTo(1)} />
                <Row k={tr("أول باقة")} v={tr("{0} — {1} د.أ", [f.pkg_label, f.pkg_price])} onEdit={() => goTo(2)} />
                <Row k={tr("CliQ / واتساب")} v={[f.cliq_alias, f.whatsapp].filter(Boolean).join(" · ") || "—"} onEdit={() => goTo(3)} />
                <Row k={tr("العربون إذا ألغت العروس")} v={f.refund_policy === "full" ? tr("يُرجَع كاملاً") : f.refund_policy === "partial" ? tr("يُرجَع {0}%", [f.refund_percent]) : tr("لا يُرجَع")} onEdit={() => goTo(3)} />
              </div>
              <div className="rounded-sm border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40 p-4 text-emerald-800 dark:text-emerald-300 text-sm">
                {tr("عند الضغط على \"نشر ملفي\" سيصبح ملفك مرئياً للعملاء ويمكنهم بدء الحجز مباشرة.")}
              </div>
            </div>
          )}

        </motion.div>
        </AnimatePresence>

          <AnimatePresence>
            {fieldErr && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 text-sm text-destructive" role="alert">
                {tx(fieldErr)}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              onClick={back}
              disabled={step === 0 || saving}
              className="text-sm px-4 py-2 border border-border rounded-sm hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />{" "}{tr("السابق")}
            </button>
            {isLast ? (
              <button
                onClick={finish}
                disabled={saving}
                className="text-sm px-6 py-2 rounded-sm bg-emerald-600 text-white hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                {tr("نشر ملفي وإنهاء الإعداد")}
              </button>
            ) : (
              <button
                onClick={next}
                disabled={saving}
                className="text-sm px-6 py-2 rounded-sm bg-charcoal text-ivory hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {tr("التالي")}{" "}<ArrowLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>
      </section>
      <Footer />
    </div>
  );
}

const inputCx = "w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1.5">{tx(label)}</div>
      {children}
    </label>
  );
}

function Row({ k, v, onEdit }: { k: string; v: string; onEdit?: () => void }) {
  return (
    <div className="group flex items-baseline justify-between gap-3">
      <span className="text-xs text-muted-foreground">{tx(k)}</span>
      <span className="flex items-center gap-2 text-sm font-medium text-end">
        {v || "—"}
        {onEdit && (
          <button type="button" onClick={onEdit} aria-label={tr("تعديل {0}", [k])} className="text-muted-foreground opacity-60 hover:text-gold group-hover:opacity-100">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </span>
    </div>
  );
}