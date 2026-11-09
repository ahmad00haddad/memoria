import { friendlyError } from "@/lib/friendlyErrors";
import { g } from "@/hooks/use-gender";
import { Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Check, X, CircleCheck, Star, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { parseFeatures, serializeFeatures, type Feature, type FeatureKind } from "@/lib/packageFeatures";
import { hapticVibrate } from "@/lib/utils";
import { t, tx } from "@/i18n";
import { usePlan } from "@/hooks/use-plan";
import { BasicLimitNote } from "@/components/dashboard/BasicLimitNote";
import { BASIC_LIMITS } from "@/lib/plans";
import { missingDisclosures } from "@/components/PackageFacts";

export const Route = createFileRoute("/_authenticated/dashboard/pricing")({ component: PricingMgr });

type Rule = {
  _key?: string;
  id?: string; service: "photography" | "cinematic_video" | "photo_video"; package: "hourly" | "full_day" | "addon";
  label: string; price: number; per_photo_price?: number | null; description?: string | null;
  subtitle?: string | null; cta_label?: string | null;
  // إفصاحات إلزامية للباقة الأساسية (تراها العروس قبل الطلب وتُجمَّد مع الحجز)
  hours?: number | string | null; deliverable_count?: number | string | null; delivery_days?: number | string | null;
  shooter?: "me" | "me_team" | "team" | null; overtime_fee?: number | string | null; excludes?: string | null;
  unedited_included?: boolean | null; revision_rounds?: number | string | null;
  is_visible?: boolean | null;
};

const numOrNull = (v: unknown) => (v === null || v === undefined || String(v).trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));

const KIND_ORDER: FeatureKind[] = ["regular", "exclusive", "fast"];
const KIND_META_ = (): Record<FeatureKind, { icon: typeof Star; title: string }> => ({
  regular: { icon: CircleCheck, title: g(t("ميزة عادية — اضغطي للتغيير"), t("ميزة عادية — اضغط للتغيير")) },
  exclusive: { icon: Star, title: g(t("ميزة حصرية — اضغطي للتغيير"), t("ميزة حصرية — اضغط للتغيير")) },
  fast: { icon: Zap, title: g(t("تسليم سريع — اضغطي للتغيير"), t("تسليم سريع — اضغط للتغيير")) },
});

function PricingMgr() {
  const { isBasic } = usePlan();
  const nav = useNavigate();
  const [uid, setUid] = useState("");
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string>("[]");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [deposit, setDeposit] = useState<{ percent: number; fixed: number | null }>({ percent: 25, fixed: null });
  const keyOf = (r: Rule) => r.id ?? r._key ?? "";
  // الباقات المحفوظة تظهر مطوية (اسم + سعر)؛ تُفتح واحدة للتعديل. الجديدة مفتوحة دائماً.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const snapshot = (rs: Rule[]) => JSON.stringify(rs.map(({ _key, ...r }) => ({ ...r, price: Number(r.price) || 0, per_photo_price: Number(r.per_photo_price) || 0, description: r.description ?? "", subtitle: r.subtitle ?? "", cta_label: r.cta_label ?? "" })));
  const withKeys = (rs: Rule[]) => rs.map((r) => ({ ...r, _key: r.id ?? Math.random().toString(36).slice(2) }));

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return nav({ to: "/login" });
        setUid(session.user.id);
        const [{ data, error }, { data: prof }] = await Promise.all([
          supabase.from("pricing_rules").select("*").eq("photographer_id", session.user.id).order("price"),
          supabase.from("profiles").select("deposit_percent,fixed_deposit").eq("id", session.user.id).maybeSingle(),
        ]);
        if (error) throw error;
        setRules(withKeys((data ?? []) as Rule[]));
        setSaved(snapshot((data ?? []) as Rule[]));
        if (prof) setDeposit({ percent: Number((prof as any).deposit_percent ?? 25), fixed: (prof as any).fixed_deposit ? Number((prof as any).fixed_deposit) : null });
      } catch (error: any) {
        setLoadError(error?.message || t("تعذّر تحميل الأسعار الآن."));
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  
  const injectMarketTemplates = () => {
    const templates: Rule[] = [
      { service: "photography", package: "hourly", label: t("الباقة الأساسية (4 ساعات)"), price: 150, per_photo_price: 0, subtitle: t("مثالية للخطبة والحفلات العائلية الصغيرة"), description: t("تغطية 4 ساعات 100 صورة معدلة تسليم فلاش ميموري") },
      { service: "photography", package: "full_day", label: t("الباقة الذهبية (يوم كامل)"), price: 250, per_photo_price: 0, subtitle: t("يوم الزفاف كاملاً من التحضيرات حتى نهاية الحفل"), description: t("تغطية كاملة من الصالون للقاعة ألبوم مطبوع 10 صفحات") },
      { service: "photo_video", package: "full_day", label: t("باقة VIP (تصوير + فيديو)"), price: 400, per_photo_price: 0, subtitle: t("التجربة المتكاملة صوراً وفيديو"), description: t("تغطية فريقين تصوير فيديو سينمائي ألبوم حراري فاخر") }
    ];
    setRules([...rules, ...withKeys(templates)]);
    toast.success(g(t("أضفنا ٣ باقات مقترحة — عدّلي الأسعار ثم احفظي."), t("أضفنا ٣ باقات مقترحة — عدّل الأسعار ثم احفظ.")));
  };

  const add = () => {
    setRules([...withKeys([{ service: "photography", package: "hourly", label: "", price: 0 }]), ...rules]);
    if (typeof window !== "undefined") requestAnimationFrame(() => document.getElementById("pricing-list")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const duplicate = (i: number) => {
    const { id, _key, ...rest } = rules[i];
    const copy = withKeys([{ ...rest, label: t("{0} (نسخة)", [rest.label]) }]);
    const a = [...rules];
    a.splice(i + 1, 0, ...copy);
    setRules(a);
  };
  const upd = (i: number, k: keyof Rule, v: any) => { const a = [...rules]; (a[i] as any)[k] = v; setRules(a); };
  // حذف مع مهلة تراجع؛ الحذف من قاعدة البيانات بعد انتهاء المهلة فقط
  const del = (i: number) => {
    const r = rules[i];
    const before = rules;
    setRules(rules.filter((_, idx) => idx !== i));
    if (!r.id) return;
    let settled = false;
    const commit = async () => {
      if (settled) return;
      settled = true;
      const { error } = await supabase.from("pricing_rules").delete().eq("id", r.id!);
      if (error) {
        setRules((cur) => (cur.some((x) => x.id === r.id) ? cur : [...cur, r]));
        toast.error(error.code === "23503"
          ? g(t("لا يمكن حذف باقة مرتبطة بحجوزات سابقة — عدّلي اسمها أو سعرها بدلاً من ذلك."), t("لا يمكن حذف باقة مرتبطة بحجوزات سابقة — عدّل اسمها أو سعرها بدلاً من ذلك."))
          : error.message);
        return;
      }
      setSaved((sv) => JSON.stringify(JSON.parse(sv).filter((x: any) => x.id !== r.id)));
    };
    toast(t("حُذفت «{0}»", [r.label || "الباقة"]), {
      duration: 5000,
      action: { label: t("تراجع"), onClick: () => { settled = true; setRules(before); } },
      onAutoClose: commit,
      onDismiss: commit,
    });
  };
  const save = async () => {
    const filled = rules.filter((r) => r.label?.trim() || Number(r.price) > 0);
    const bad = filled.find((r) => !r.label?.trim() || !(Number(r.price) > 0));
    if (bad) { hapticVibrate("error"); return toast.error(t("كل باقة تحتاج اسماً وسعراً أكبر من صفر.")); }
    // الإفصاح الإلزامي: لا تُحفظ باقة أساسية تنقصها معلومة تراها العروس قبل الطلب
    if (isBasic && filled.filter((r) => r.package !== "addon" && r.is_visible !== false).length > BASIC_LIMITS.packages) {
      hapticVibrate("error");
      return toast.error(g(t("باقة Basic تُظهر {0} باقات فقط — أخفي الباقي بزر «ظاهرة للعرائس» أو رقّي لـPro.", [BASIC_LIMITS.packages]), t("باقة Basic تُظهر {0} باقات فقط — أخفِ الباقي بزر «ظاهرة للعرائس» أو رقِّ لـPro.", [BASIC_LIMITS.packages])), { duration: 7000 });
    }
    const incomplete = filled.map((r) => ({ r, miss: missingDisclosures(r as any) })).find((x) => x.miss.length);
    if (incomplete) {
      hapticVibrate("error");
      setOpenKey(keyOf(incomplete.r));
      return toast.error(t("أكملي تفاصيل «{0}»: {1}", [incomplete.r.label, incomplete.miss.join("، ")]), { duration: 7000 });
    }
    setSaving(true);
    for (const r of filled) {
      const { _key, ...clean } = r;
      const payload = {
        ...clean,
        label: r.label.trim(),
        photographer_id: uid,
        price: Number(r.price),
        per_photo_price: r.per_photo_price ? Math.max(0, Number(r.per_photo_price)) : 0,
        subtitle: r.subtitle?.trim() || null,
        cta_label: r.cta_label?.trim() || null,
        hours: numOrNull(r.hours),
        deliverable_count: numOrNull(r.deliverable_count),
        delivery_days: numOrNull(r.delivery_days),
        shooter: r.package === "addon" ? null : (r.shooter || null),
        overtime_fee: numOrNull(r.overtime_fee),
        excludes: r.excludes?.trim() || null,
        unedited_included: !!r.unedited_included,
        revision_rounds: numOrNull(r.revision_rounds),
        is_visible: r.is_visible !== false,
      };
      const write = (p: any) => r.id
        ? supabase.from("pricing_rules").update(p).eq("id", r.id)
        : supabase.from("pricing_rules").insert(p);
      let { error } = await write(payload);
      // Database not migrated yet (subtitle/cta_label missing): still save the rest
      if (error && /subtitle|cta_label/.test(error.message)) {
        const { subtitle, cta_label, ...rest } = payload;
        ({ error } = await write(rest));
      }
      if (error) { setSaving(false); return toast.error(t("تعذّر حفظ \"{0}\": {1}", [payload.label, friendlyError(error.message)])); }
    }
    const { data } = await supabase.from("pricing_rules").select("*").eq("photographer_id", uid).order("price");
    setRules(withKeys((data ?? []) as Rule[]));
    setSaved(snapshot((data ?? []) as Rule[]));
    setSaving(false);
    setJustSaved(true);
    hapticVibrate("success");
    setTimeout(() => setJustSaved(false), 1800);
    toast.success(t("حُفظت الباقات — تظهر الآن في ملفك العام"));
  };

  if (loading) return <PageLoader />;
  if (loadError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <section className="container-editorial py-12 max-w-3xl">
          <BackToDashboard />
          <div className="rounded-sm border border-destructive/30 bg-card p-6 shadow-soft mt-4">
            <h1 className="font-serif text-3xl mb-2">{t("تعذّر فتح صفحة الأسعار")}</h1>
            <p className="text-sm text-muted-foreground mb-4">{friendlyError(loadError)}</p>
            <button onClick={() => window.location.reload()} className="bg-charcoal text-ivory px-5 py-2 rounded-sm hover:opacity-90 active:scale-95 transition-transform duration-200">{t("إعادة المحاولة")}</button>
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
        <BackToDashboard />
        <h1 className="font-serif text-4xl mt-2 mb-2">{t("إدارة الأسعار")}</h1>
        <p className="text-sm text-muted-foreground mb-3">{t("باقات التصوير والفيديو والإضافات كما تظهر للعرائس في ملفك العام.")}</p>
        {isBasic && (
          <BasicLimitNote used={rules.filter((r) => r.id && r.package !== "addon").length} max={BASIC_LIMITS.packages} what={t("باقات")} />
        )}
        {isBasic && rules.filter((r) => r.package !== "addon" && r.is_visible !== false).length > BASIC_LIMITS.packages && (
          <div className="mb-6 rounded-2xl border border-amber-400/60 bg-amber-50/50 p-4 text-sm dark:border-amber-800/60 dark:bg-amber-950/20">
            <strong className="block">{t("باقة Basic تُظهر {0} باقات فقط للعرائس", [BASIC_LIMITS.packages])}</strong>
            {g(t("عندكِ باقات أكثر من الحد. اختاري أي {0} تظهر بزر «ظاهرة للعرائس» على كل باقة، والباقي يبقى محفوظاً عندكِ. لو ما اخترتِ، تظهر الأرخص.", [BASIC_LIMITS.packages]), t("عندك باقات أكثر من الحد. اختر أي {0} تظهر بزر «ظاهرة للعرائس» على كل باقة، والباقي يبقى محفوظاً عندك. لو ما اخترت، تظهر الأرخص.", [BASIC_LIMITS.packages]))}
          </div>
        )}
        {rules.length > 0 && rules.length < 3 && (
          <p className="mb-6 flex items-center gap-2 text-xs text-muted-foreground"><Lightbulb className="h-3.5 w-3.5 text-gold" />{" "}{t("ثلاث باقات (أساسية، متوسطة، فاخرة) تسهّل على العروس الاختيار.")}</p>
        )}

        {rules.length === 0 && (
            <div className="rounded-sm border border-gold/40 bg-gold/5 p-6 shadow-soft mb-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer pointer-events-none" />
              <h2 className="font-serif text-2xl mb-2 flex items-center gap-2">
                <Lightbulb className="h-6 w-6 text-gold" />
                {g(t("هل أنتِ مستعجلة؟"), t("هل أنت مستعجل؟"))}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {g(t("لا داعي للتفكير طويلاً! استخدمي الباقات القياسية المعتمدة في السوق الأردني بضغطة زر واحدة، ثم قومي بتعديل الأسعار بما يناسبك."), t("لا داعي للتفكير طويلاً! استخدم الباقات القياسية المعتمدة في السوق الأردني بضغطة زر واحدة، ثم قم بتعديل الأسعار بما يناسبك."))}
              </p>
              <button 
                onClick={injectMarketTemplates}
                className="bg-gold text-white px-6 py-2.5 rounded-sm hover:shadow-elegant hover:-translate-y-0.5 active:scale-95 transition-all duration-300 font-medium"
              >
                {t("استخدام الباقات القياسية الآن 🪄")}
              </button>
            </div>
          )}
          {rules.length === 0 && false && (
          <div className="rounded-sm border border-border bg-card p-6 shadow-soft mb-6">
            <h2 className="font-serif text-2xl mb-2">{g(t("ابدئي بأول باقة"), t("ابدأ بأول باقة"))}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {g(t("العميل لن يستطيع فهم خدمتك أو الحجز بشكل واضح إذا لم يجد باقات جاهزة. أضيفي على الأقل باقة تصوير وباقة يوم كامل، ثم احفظيها لتظهر مباشرة في ملفك العام."), t("العميل لن يستطيع فهم خدمتك أو الحجز بشكل واضح إذا لم يجد باقات جاهزة. أضف على الأقل باقة تصوير وباقة يوم كامل، ثم احفظها لتظهر مباشرة في ملفك العام."))}
            </p>
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-sm border border-border bg-background p-4">
                <div className="font-medium mb-1">{t("تصوير 4 ساعات")}</div>
                <div className="text-muted-foreground">{t("مناسب للحفلات القصيرة أو الخطبة.")}</div>
              </div>
              <div className="rounded-sm border border-border bg-background p-4">
                <div className="font-medium mb-1">{t("يوم زفاف كامل")}</div>
                <div className="text-muted-foreground">{t("من التحضيرات حتى نهاية الحفل.")}</div>
              </div>
              <div className="rounded-sm border border-border bg-background p-4">
                <div className="font-medium mb-1">{t("إضافة فيديو أو ألبوم")}</div>
                <div className="text-muted-foreground">{t("خيار إضافي يرفع قيمة الطلب.")}</div>
              </div>
            </div>
          </div>
        )}

        <button data-tour="add-package" onClick={add} className="mb-6 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-base font-medium text-white shadow-elegant transition hover:opacity-90 active:scale-[0.98]">
          <Plus className="h-5 w-5" />
          {t("إضافة باقة جديدة")}
        </button>

        <div id="pricing-list" className="grid grid-cols-1 scroll-mt-20 gap-3 md:grid-cols-2 md:gap-5">
          <AnimatePresence initial={false}>
          {rules.map((r, i) => {
            const price = Number(r.price) || 0;
            const dep = deposit.fixed ?? Math.round((price * deposit.percent) / 100);
            const odd = price > 0 && (price < 30 || price > 5000);
            const k = keyOf(r);
            const isOpen = !r.id || rules.length <= 2 || openKey === k;
            if (!isOpen) {
              const svc = r.service === "cinematic_video" ? t("فيديو سينمائي") : r.service === "photo_video" ? t("صور + فيديو") : t("تصوير فوتوغرافي");
              const kind = r.package === "addon" ? t("إضافة") : r.package === "full_day" ? t("يوم كامل") : t("بالساعة");
              const incomplete = r.package !== "addon" && missingDisclosures(r as any).length > 0;
              return (
                <motion.button
                  key={k}
                  layout
                  type="button"
                  onClick={() => setOpenKey(k)}
                  className="flex w-full min-w-0 items-center gap-3 rounded-2xl bg-card p-4 text-start ring-1 ring-border/70 transition-shadow hover:ring-gold/40 active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-serif text-lg">{r.label ? tx(r.label) : t("باقة بلا اسم")}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>{svc} · {kind}</span>
                      {r.is_visible === false && <span>· {t("مخفية")}</span>}
                      {incomplete && <span className="text-amber-600">· {t("ناقصة")}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 font-serif text-xl tabular-nums">{price} <span className="text-xs">{t("د.أ")}</span></div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </motion.button>
              );
            }
            return (
            <motion.div
              key={keyOf(r)}
              layout
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="group relative min-w-0 rounded-2xl bg-card p-5 ring-1 ring-gold/40 transition-shadow sm:p-6"
            >
              {r.id && rules.length > 2 && (
                <button type="button" onClick={() => setOpenKey(null)} className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <ChevronUp className="h-3.5 w-3.5" />{" "}{t("طيّ الباقة")}
                </button>
              )}
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex gap-2">
                  <select aria-label={t("نوع الخدمة")} value={r.service} onChange={(e) => upd(i, "service", e.target.value)} className="rounded-full bg-secondary px-3 py-1.5 text-xs outline-none ring-1 ring-transparent focus:ring-gold/50">
                    <option value="photography">{t("تصوير فوتوغرافي")}</option>
                    <option value="cinematic_video">{t("فيديو سينمائي")}</option>
                    <option value="photo_video">{t("صور + فيديو")}</option>
                  </select>
                  <select aria-label={t("نوع الباقة")} value={r.package} onChange={(e) => upd(i, "package", e.target.value)} className="rounded-full bg-secondary px-3 py-1.5 text-xs outline-none ring-1 ring-transparent focus:ring-gold/50">
                    <option value="hourly">{t("بالساعة")}</option>
                    <option value="full_day">{t("يوم كامل")}</option>
                    <option value="addon">{t("إضافة")}</option>
                  </select>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => duplicate(i)} aria-label={t("نسخ الباقة")} title={t("نسخ الباقة")} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={() => del(i)} aria-label={t("حذف الباقة")} title={t("حذف الباقة")} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <label className="block text-xs text-muted-foreground mb-1">{t("اسم الباقة")}</label>
              <input placeholder={t("مثال: باقة ٤ ساعات")} value={r.label} onChange={(e) => upd(i, "label", e.target.value)} className="w-full bg-transparent font-serif text-2xl border-b border-border pb-2 mb-3 outline-none transition-colors focus:border-gold placeholder:text-muted-foreground/50" />
              <input maxLength={120} aria-label={t("وصف قصير تحت الاسم")} placeholder={t("سطر قصير تحت الاسم، مثال: مثالية للحفلات العائلية الأنيقة")} value={r.subtitle ?? ""} onChange={(e) => upd(i, "subtitle", e.target.value)} className="w-full bg-transparent text-sm text-muted-foreground border-b border-border/60 pb-2 mb-5 outline-none transition-colors focus:border-gold placeholder:text-muted-foreground/50" />

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t("السعر (د.أ)")}</label>
                  <input type="number" min="0" inputMode="decimal" placeholder="0" value={r.price} onChange={(e) => upd(i, "price", e.target.value)} className={`w-full bg-transparent font-serif text-3xl tabular-nums border-b pb-1 outline-none transition-colors focus:border-gold ${odd ? "border-amber-500" : "border-border"}`} />
                  {odd ? (
                    <span className="mt-1 block text-[11px] text-amber-700 dark:text-amber-400">{t("هل السعر صحيح؟")}</span>
                  ) : r.package !== "addon" && price > 0 ? (
                    <span className="mt-1 block text-[11px] text-muted-foreground tabular-nums">{t("العربون {0} د.أ", [dep])}</span>
                  ) : null}
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t("سعر الصورة الإضافية")}</label>
                  <input type="number" min="0" inputMode="decimal" placeholder={t("اختياري")} value={r.per_photo_price ?? ""} onChange={(e) => upd(i, "per_photo_price", e.target.value)} className="w-full bg-transparent font-serif text-3xl tabular-nums border-b border-border pb-1 outline-none transition-colors focus:border-gold placeholder:text-base placeholder:font-sans placeholder:text-muted-foreground/50" />
                </div>
              </div>

              {r.package !== "addon" && (
                <label className="mb-4 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={r.is_visible !== false} onChange={(e) => upd(i, "is_visible", e.target.checked)} className="h-4 w-4" />
                  {t("ظاهرة للعرائس")}
                  {r.is_visible === false && <span className="text-xs text-muted-foreground">{t("— مخفية، محفوظة عندكِ فقط")}</span>}
                </label>
              )}
              {r.package !== "addon" && <DisclosureFields r={r} set={(k, v) => upd(i, k, v)} />}

              <label className="block text-xs text-muted-foreground mb-1">{t("ماذا تشمل الباقة؟")}{" "}<span className="text-muted-foreground/70">{t("— ميزة في كل سطر، والأرقام تظهر بالخط العريض تلقائياً")}</span></label>
              <FeatureEditor value={r.description ?? ""} onChange={(v) => upd(i, "description", v)} />

              <label className="block text-xs text-muted-foreground mt-5 mb-1">{t("نص زر الحجز")}{" "}<span className="text-muted-foreground/70">{t("(اختياري)")}</span></label>
              <input maxLength={40} placeholder={t("احجزي هذه الباقة")} value={r.cta_label ?? ""} onChange={(e) => upd(i, "cta_label", e.target.value)} className="w-full rounded-xl bg-secondary/60 px-3 py-2 text-sm outline-none ring-1 ring-transparent transition focus:ring-gold/50 placeholder:text-muted-foreground/50" />
            </motion.div>
            );
          })}
          </AnimatePresence>

          <button onClick={add} className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border text-muted-foreground transition-colors hover:border-gold/60 hover:text-gold">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary"><Plus className="h-5 w-5" /></span>
            <span className="text-sm">{t("إضافة باقة جديدة")}</span>
          </button>
        </div>

        <AnimatePresence>
          {(snapshot(rules) !== saved || justSaved) && (
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
              className="sticky bottom-20 sm:bottom-6 z-20 mt-8 flex justify-end"
            >
              <button onClick={save} disabled={saving || justSaved} className="inline-flex items-center gap-2 rounded-full bg-charcoal px-8 py-3 text-ivory shadow-elegant transition hover:opacity-90 active:scale-[0.98] disabled:opacity-80 dark:bg-gold dark:text-charcoal">
                {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-ivory/30 border-t-ivory dark:border-charcoal/30 dark:border-t-charcoal" />}
                {justSaved && <Check className="h-4 w-4" />}
                {saving ? t("نحفظ…") : justSaved ? t("حُفظت") : t("حفظ التغييرات")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      <Footer />
    </div>
  );
}
function FeatureEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Local rows so a freshly added empty row survives until it's typed in
  const [rows, setRows] = useState<Feature[]>(() => {
    const fs = parseFeatures(value);
    return fs.length ? fs : [{ kind: "regular", text: "" }];
  });
  const commit = (next: Feature[]) => { setRows(next); onChange(serializeFeatures(next)); };
  const set = (i: number, patch: Partial<Feature>) => commit(rows.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const insertAfter = (i: number) => {
    setRows([...rows.slice(0, i + 1), { kind: "regular", text: "" }, ...rows.slice(i + 1)]);
    requestAnimationFrame(() => (document.activeElement?.closest("[data-features]")?.querySelectorAll("input")[i + 1] as HTMLInputElement | undefined)?.focus());
  };
  return (
    <div className="space-y-1.5" data-features>
      {rows.map((f, i) => {
        const { icon: Icon, title } = KIND_META_()[f.kind];
        return (
          <div key={i} className="flex items-center gap-2 rounded-xl bg-secondary/60 px-2 py-1 ring-1 ring-transparent focus-within:ring-gold/50">
            <button type="button" title={tx(title)} aria-label={tx(title)}
              onClick={() => set(i, { kind: KIND_ORDER[(KIND_ORDER.indexOf(f.kind) + 1) % KIND_ORDER.length] })}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-gold transition-colors hover:bg-background">
              <Icon className={`h-4 w-4 ${f.kind === "exclusive" ? "fill-gold" : ""}`} />
            </button>
            <input value={f.text} maxLength={90} placeholder={t("مثال: تغطية 6 ساعات")}
              onChange={(e) => set(i, { text: e.target.value.replace(/^[★⚡]\s*/, "") })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertAfter(i); } }}
              className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground/50" />
            {rows.length > 1 && (
              <button type="button" aria-label={t("حذف الميزة")} onClick={() => commit(rows.filter((_, j) => j !== i))}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}
      <button type="button" onClick={() => setRows([...rows, { kind: "regular", text: "" }])} className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-gold">
        <Plus className="h-3.5 w-3.5" />{" "}{t("إضافة ميزة")}
      </button>
      <p className="px-2 text-[11px] text-muted-foreground/80">{g(t("اضغطي الأيقونة لتغيير نوع الميزة: ✓ عادية · ★ حصرية · ⚡ تسليم سريع"), t("اضغط الأيقونة لتغيير نوع الميزة: ✓ عادية · ★ حصرية · ⚡ تسليم سريع"))}</p>
    </div>
  );
}

// «من يصوّر فعلياً» إلزامي (أهم ما تسأل عنه العروس)؛ الباقي اختياري ومطوي حتى لا
// تثقل التعبئة. مدة التسليم لا تُكتب هنا: تُحسب من تسليماتها الفعلية وتظهر كمعدّل.
function DisclosureFields({ r, set }: { r: Rule; set: (k: keyof Rule, v: any) => void }) {
  const video = r.service === "cinematic_video";
  const box = "w-full rounded-xl bg-secondary/60 px-3 py-2 text-sm tabular-nums outline-none ring-1 ring-transparent transition focus:ring-gold/50 placeholder:text-muted-foreground/50";
  // دالة لا مكوّن: مكوّن داخلي يُعاد إنشاؤه مع كل رسم فيفقد الحقل التركيز بعد كل حرف
  const num = (k: keyof Rule, label: string, ph: string) => (
    <label key={String(k)} className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{tx(label)}</span>
      <input type="number" min="0" inputMode="decimal" value={(r[k] as any) ?? ""} placeholder={ph} onChange={(e) => set(k, e.target.value)} className={box} />
    </label>
  );
  const optionalFilled = [r.hours, r.deliverable_count, r.overtime_fee, r.revision_rounds, r.excludes].some((v) => v !== null && v !== undefined && String(v).trim() !== "") || !!r.unedited_included;
  return (
    <div className="mb-5 space-y-3">
      <label className={`block rounded-2xl border p-4 ${r.shooter ? "border-border" : "border-amber-400/70 bg-amber-50/40 dark:border-amber-800/60 dark:bg-amber-950/10"}`}>
        <span className="mb-1 block text-sm font-medium">{t("من يصوّر فعلياً؟ *")}</span>
        <span className="mb-2 block text-xs text-muted-foreground">{g(t("أهم ما تسأل عنه العروس. «أنا بنفسي» لا يظهر لها (هو المتوقّع)؛ الخياران الآخران يظهران على الباقة."), t("أهم ما تسأل عنه العروس. «أنا بنفسي» لا يظهر لها (هو المتوقّع)؛ الخياران الآخران يظهران على الباقة."))}</span>
        <select value={r.shooter ?? ""} onChange={(e) => set("shooter", e.target.value || null)} className={box}>
          <option value="">{g(t("اختاري"), t("اختر"))}</option>
          <option value="me">{t("أنا بنفسي")}</option>
          <option value="me_team">{t("أنا مع فريقي")}</option>
          <option value="team">{t("فريقي بدوني (أنا لن أحضر)")}</option>
        </select>
      </label>

      <details className="group rounded-2xl border border-border p-4" open={optionalFilled}>
        <summary className="cursor-pointer list-none text-sm">
          {t("تفاصيل إضافية")}{" "}<span className="text-xs text-muted-foreground">{t("(اختياري — اكتبي ما يناسبكِ فقط)")}</span>
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {num("hours", t("ساعات التصوير"), t("مفتوحة"))}
          {num("deliverable_count", video ? t("مدة الفيلم (دقائق)") : t("عدد الصور المعدّلة"), t("اختياري"))}
          {num("overtime_fee", t("الساعة الإضافية (د.أ)"), t("اختياري"))}
          {num("revision_rounds", t("جولات تعديل مجانية"), t("اختياري"))}
        </div>
        {!video && (
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!r.unedited_included} onChange={(e) => set("unedited_included", e.target.checked)} className="h-4 w-4" />
            {t("أسلّم كل الصور الصالحة غير المعدّلة أيضاً")}
          </label>
        )}
        <label className="mt-3 block">
          <span className="mb-1 block text-xs text-muted-foreground">{t("ما لا تشمله الباقة")}</span>
          <input value={r.excludes ?? ""} maxLength={300} onChange={(e) => set("excludes", e.target.value)} placeholder={t("مثلاً: الألبوم، الدرون")} className={box} />
        </label>
      </details>
    </div>
  );
}
