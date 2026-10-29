import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Eye, Lock, RotateCcw, Check, Languages, Palette, Type, LayoutGrid, ListOrdered, Megaphone } from "lucide-react";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { PageLoader } from "@/components/ui/loading";
import { supabase } from "@/integrations/supabase/client";
import { g, useGender } from "@/hooks/use-gender";
import { t as tr, tx } from "@/i18n";
import {
  ANNOUNCE_MAX, DEFAULT_PAGE_SETTINGS, FONTS, GALLERY_COUNTS, LAYOUTS, QUOTE_MAX, THEMES,
  sanitizePageSettings, type PageSettings,
} from "@/lib/page-settings";
import { savePageSettings } from "@/lib/page-settings.functions";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({ component: SettingsPage });

function SettingsPage() {
  useGender();
  const nav = useNavigate();
  const saveFn = useServerFn(savePageSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [saved, setSaved] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);
  const [s, setS] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user.id;
      if (!uid) return nav({ to: "/login" });
      const { data } = await (supabase as any).from("profiles").select("username,page_settings").eq("id", uid).maybeSingle();
      const clean = sanitizePageSettings(data?.page_settings);
      setUsername(data?.username ?? "");
      setSaved(clean);
      setS(clean);
      setLoading(false);
    })();
  }, []);

  const dirty = useMemo(() => JSON.stringify(s) !== JSON.stringify(saved), [s, saved]);
  const set = <K extends keyof PageSettings>(k: K, v: PageSettings[K]) => setS((x) => ({ ...x, [k]: v }));

  // تنبيه قبل مغادرة الصفحة بتغييرات غير محفوظة
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await saveFn({ data: { settings: s } });
      setSaved(res.settings);
      setS(res.settings);
      toast.success(tr("تم حفظ الإعدادات — صفحتك العامة تحدّثت"));
    } catch (e: any) {
      toast.error(e?.message || tr("تعذّر الحفظ، حاولي مرة أخرى"));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (!confirm(g(tr("إرجاع كل الإعدادات للوضع الافتراضي؟ (لن يُحفظ حتى تضغطي حفظ)"), tr("إرجاع كل الإعدادات للوضع الافتراضي؟ (لن يُحفظ حتى تضغط حفظ)")))) return;
    setS(DEFAULT_PAGE_SETTINGS);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 pb-32 max-w-3xl">
        <BackToDashboard />
        <div className="mt-2 mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">{tr("صفحتك العامة")}</div>
            <h1 className="font-serif text-4xl">{tr("الإعدادات")}</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {g(tr("اختاري شكل صفحتك وما يظهر فيها. كل الخيارات آمنة ويمكن إرجاعها بأي وقت."), tr("اختر شكل صفحتك وما يظهر فيها. كل الخيارات آمنة ويمكن إرجاعها بأي وقت."))}
            </p>
          </div>
          {username && (
            <a href={`/photographers/${username}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm border border-border px-4 py-2 rounded-sm hover:bg-secondary">
              <Eye className="h-4 w-4" /> {tr("معاينة صفحتي")}
            </a>
          )}
        </div>

        <div className="space-y-5">
          <Block icon={<Languages />} title={tr("لغة الصفحة")} hint={tr("اللغة التي تفتح بها صفحتك لأول مرة. الزائرة تستطيع التبديل دائماً من الزر في الأعلى.")}>
            <Choices
              value={s.default_lang}
              onChange={(v) => set("default_lang", v)}
              options={[
                { value: "auto", label: tr("تلقائي (حسب الزائرة)") },
                { value: "ar", label: "العربية" },
                { value: "en", label: "English" },
              ]}
            />
          </Block>

          <Block icon={<Palette />} title={tr("ألوان الصفحة")} hint={tr("ثيمات جاهزة ومتناسقة، مختارة لتبقى النصوص واضحة.")}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(THEMES) as (keyof typeof THEMES)[]).map((k) => {
                const t = THEMES[k];
                const on = s.theme === k;
                return (
                  <button key={k} type="button" onClick={() => set("theme", k)} aria-pressed={on}
                    className={`relative rounded-xl border p-3 text-start transition ${on ? "border-gold ring-2 ring-gold/40" : "border-border hover:border-gold/40"}`}>
                    <div className="flex h-10 overflow-hidden rounded-md">
                      <span className="flex-[2]" style={{ background: t.charcoal }} />
                      <span className="flex-1" style={{ background: t.gold }} />
                      <span className="flex-1 bg-ivory" />
                    </div>
                    <div className="mt-2 text-sm">{tx(t.label)}</div>
                    {on && <Check className="absolute top-2 end-2 h-4 w-4 text-gold" />}
                  </button>
                );
              })}
            </div>
          </Block>

          <Block icon={<Type />} title={tr("خط العناوين")}>
            <Choices
              value={s.font}
              onChange={(v) => set("font", v)}
              options={(Object.keys(FONTS) as (keyof typeof FONTS)[]).map((k) => ({ value: k, label: tx(FONTS[k].label), hint: tx(FONTS[k].hint) }))}
            />
          </Block>

          <Block icon={<LayoutGrid />} title={tr("معرض الأعمال")}>
            <Label>{tr("طريقة العرض")}</Label>
            <Choices
              value={s.gallery_layout}
              onChange={(v) => set("gallery_layout", v)}
              options={(Object.keys(LAYOUTS) as (keyof typeof LAYOUTS)[]).map((k) => ({ value: k, label: tx(LAYOUTS[k].label) }))}
            />
            <Label className="mt-4">{tr("عدد الصور الظاهرة")}</Label>
            <Choices
              value={String(s.gallery_count)}
              onChange={(v) => set("gallery_count", Number(v) as PageSettings["gallery_count"])}
              options={GALLERY_COUNTS.map((n) => ({ value: String(n), label: String(n) }))}
            />
          </Block>

          <Block icon={<ListOrdered />} title={tr("الأقسام")} hint={tr("الباقات وزر الحجز ثابتان دائماً حتى تستطيع العرائس الحجز.")}>
            <Label>{tr("الترتيب بعد الواجهة")}</Label>
            <Choices
              value={s.section_order}
              onChange={(v) => set("section_order", v)}
              options={[
                { value: "packages_first", label: tr("الباقات أولاً") },
                { value: "gallery_first", label: tr("الأعمال أولاً") },
              ]}
            />
            <div className="mt-4 divide-y divide-border rounded-xl border border-border">
              <LockedRow label={tr("الباقات والأسعار")} />
              <LockedRow label={tr("نموذج الحجز")} />
              <Toggle label={tr("معرض الأعمال")} on={s.show_gallery} set={(v) => set("show_gallery", v)} />
              <Toggle label={tr("آراء العملاء")} hint={tr("تظهر فقط عند وجود تقييمات")} on={s.show_reviews} set={(v) => set("show_reviews", v)} />
              <Toggle label={tr("أرقام الواجهة (التقييم، الموقع، الباقات)")} on={s.show_stats} set={(v) => set("show_stats", v)} />
              <Toggle label={tr("شارات الثقة")} on={s.show_trust_badges} set={(v) => set("show_trust_badges", v)} />
              <Toggle label={tr("ملاحظات الحجز")} on={s.show_booking_notes} set={(v) => set("show_booking_notes", v)} />
              <Toggle label={tr("زر واتساب")} on={s.show_whatsapp} set={(v) => set("show_whatsapp", v)} />
            </div>
          </Block>

          <Block icon={<Megaphone />} title={tr("نصوص قصيرة")} hint={tr("نص عادي فقط — بدون روابط. اتركيه فارغاً لاستخدام النص الافتراضي.")}>
            <TextField
              label={tr("عبارة بطاقة الغلاف")}
              placeholder={tr("«كل صورة قصة، وكل قصة تستحق الفخامة»")}
              value={s.hero_quote}
              max={QUOTE_MAX}
              onChange={(v) => set("hero_quote", v)}
            />
            <TextField
              className="mt-4"
              label={tr("شريط إعلان أعلى الصفحة")}
              placeholder={tr("مثال: مواعيد صيف ٢٠٢٧ متاحة الآن")}
              value={s.announcement}
              max={ANNOUNCE_MAX}
              onChange={(v) => set("announcement", v)}
            />
          </Block>

          <div className="pt-2 text-center">
            <button type="button" onClick={reset} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-4 w-4" /> {tr("إرجاع الإعدادات الافتراضية")}
            </button>
            <p className="mt-3 text-xs text-muted-foreground">
              {tr("الصور والنبذة وبيانات الدفع تُعدَّل من")} <Link to="/dashboard/profile" className="underline">{tr("ملفي")}</Link>
            </p>
          </div>
        </div>
      </section>

      {/* شريط الحفظ يظهر فقط عند وجود تغييرات */}
      <AnimatePresence>
        {dirty && (
          <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
            className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{tr("لديك تغييرات غير محفوظة")}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setS(saved)} disabled={saving} className="rounded-sm border border-border px-4 py-2 text-sm hover:bg-secondary">{tr("تراجع")}</button>
                <button type="button" onClick={save} disabled={saving} className="rounded-sm bg-gold px-5 py-2 text-sm font-medium text-gold-foreground disabled:opacity-60">
                  {saving ? tr("جارٍ الحفظ…") : tr("حفظ")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />
    </div>
  );
}

function Block({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-gold [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        <h2 className="font-serif text-xl">{title}</h2>
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-2 text-xs text-muted-foreground ${className}`}>{children}</div>;
}

function Choices<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; hint?: string }[] }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={`min-h-10 rounded-full border px-4 py-1.5 text-sm transition ${on ? "border-gold bg-gold/10 text-foreground" : "border-border text-muted-foreground hover:border-gold/40"}`}>
            {o.label}
            {o.hint && <span className="block text-[11px] text-muted-foreground">{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ label, hint, on, set }: { label: string; hint?: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
      <span className="text-sm">
        {label}
        {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      <button type="button" role="switch" aria-checked={on} onClick={() => set(!on)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-gold" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "start-[22px]" : "start-0.5"}`} />
      </button>
    </label>
  );
}

function LockedRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-muted-foreground">
      <span>{label}</span>
      <span className="inline-flex items-center gap-1 text-[11px]"><Lock className="h-3.5 w-3.5" /> {tr("ظاهر دائماً")}</span>
    </div>
  );
}

function TextField({ label, placeholder, value, max, onChange, className = "" }: { label: string; placeholder: string; value: string; max: number; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{value.length}/{max}</span>
      </div>
      <input value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value.replace(/[\r\n]/g, ""))}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold/60 focus:outline-none" />
    </div>
  );
}
