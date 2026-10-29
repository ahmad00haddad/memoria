import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Eye, Lock, RotateCcw, Check, Languages, Palette, Type, LayoutGrid, ListOrdered, Megaphone, Wand2, Smartphone, X, Info } from "lucide-react";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { PageLoader } from "@/components/ui/loading";
import { supabase } from "@/integrations/supabase/client";
import { g, useGender } from "@/hooks/use-gender";
import { t as tr, tx } from "@/i18n";
import {
  ACCENTS, ANNOUNCE_MAX, DEFAULT_PAGE_SETTINGS, FONTS, GALLERY_COUNTS, HERO_TONES, LAYOUTS, MODES, QUOTE_MAX, RADII, THEMES,
  paletteVars, resolveMode, sanitizePageSettings, suggestFromImage, type PageSettings,
} from "@/lib/page-settings";
import { savePageSettings } from "@/lib/page-settings.functions";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({ component: SettingsPage });

type Owner = { username: string; cover_url: string | null; avatar_url: string | null; whatsapp: string | null; photos: number; reviews: number; notes: boolean };

function SettingsPage() {
  useGender();
  const nav = useNavigate();
  const saveFn = useServerFn(savePageSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [saved, setSaved] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);
  const [s, setS] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);
  const [matching, setMatching] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user.id;
      if (!uid) return nav({ to: "/login" });
      const [{ data }, { data: priv }, { count: reviews }] = await Promise.all([
        (supabase as any).from("profiles").select("username,page_settings,cover_url,avatar_url,portfolio_urls,booking_notes").eq("id", uid).maybeSingle(),
        (supabase as any).from("photographer_private").select("whatsapp").eq("user_id", uid).maybeSingle(),
        (supabase as any).from("reviews").select("id", { count: "exact", head: true }).eq("photographer_id", uid).eq("is_published", true),
      ]);
      const clean = sanitizePageSettings(data?.page_settings);
      setOwner({
        username: data?.username ?? "",
        cover_url: data?.cover_url ?? null,
        avatar_url: data?.avatar_url ?? null,
        whatsapp: priv?.whatsapp ?? null,
        photos: data?.portfolio_urls?.length ?? 0,
        reviews: reviews ?? 0,
        notes: !!data?.booking_notes,
      });
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
      toast.success(tr("تم الحفظ — صفحتك العامة تحدّثت"));
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

  const matchCover = async () => {
    const src = owner?.cover_url || owner?.avatar_url;
    if (!src) return;
    setMatching(true);
    const sug = await suggestFromImage(src);
    setMatching(false);
    if (!sug) { toast.error(tr("تعذّر قراءة ألوان الصورة")); return; }
    setS((x) => ({ ...x, theme: sug.theme, accent: sug.accent, mode: "theme" }));
    toast.success(tr("اخترنا {0} بلمسة {1} لتناسب صورة غلافك", [tx(THEMES[sug.theme].label), sug.accent === "theme" ? "" : tx(ACCENTS[sug.accent].label)]));
  };

  if (loading || !owner) return <PageLoader />;

  // تنبيهات ذكية: إعداد لن يظهر كما تتوقّع المصوّرة
  const warnGallery = s.show_gallery && owner.photos > 0 && owner.photos < s.gallery_count
    ? tr("لديك {0} صور فقط، ستظهر كلها", [owner.photos]) : s.show_gallery && owner.photos === 0 ? tr("لم تضيفي صوراً للمعرض بعد") : "";
  const warnReviews = s.show_reviews && owner.reviews === 0 ? tr("سيظهر القسم بعد أول تقييم") : "";
  const warnNotes = s.show_booking_notes && !owner.notes ? tr("لا توجد ملاحظات حجز مكتوبة في ملفك") : "";

  const previewSrc = owner.username ? `/photographers/${owner.username}?embed=1` : "";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-10 pb-32">
        <BackToDashboard />
        <div className="mt-2 mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-4xl">{tr("إعدادات صفحتك")}</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              {g(tr("كل تغيير يظهر فوراً في المعاينة ولا يُنشر حتى تضغطي حفظ. الألوان مضبوطة لتبقى النصوص واضحة دائماً."), tr("كل تغيير يظهر فوراً في المعاينة ولا يُنشر حتى تضغط حفظ. الألوان مضبوطة لتبقى النصوص واضحة دائماً."))}
            </p>
          </div>
          {owner.username && (
            <a href={`/photographers/${owner.username}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm border border-border px-4 py-2 rounded-sm hover:bg-secondary">
              <Eye className="h-4 w-4" /> {tr("فتح صفحتي")}
            </a>
          )}
        </div>

        <div className="gap-8 lg:flex lg:items-start">
          <div className="space-y-5 min-w-0 flex-1">
            <Block icon={<Palette />} title={tr("الألوان")}>
              {(owner.cover_url || owner.avatar_url) && (
                <button type="button" onClick={matchCover} disabled={matching}
                  className="mb-4 flex w-full items-center gap-3 rounded-xl border border-dashed border-gold/50 p-3 text-start hover:bg-secondary disabled:opacity-60">
                  <img src={owner.cover_url || owner.avatar_url!} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium"><Wand2 className="h-4 w-4 text-gold" /> {matching ? tr("نقرأ ألوان الصورة…") : tr("طابقي ألوان صورة غلافك")}</span>
                    <span className="block text-xs text-muted-foreground">{tr("نختار اللوحة واللمسة الأقرب لصورتك")}</span>
                  </span>
                </button>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2">
                {(Object.keys(THEMES) as PageSettings["theme"][]).map((k) => (
                  <ThemeSwatch key={k} k={k} s={s} on={s.theme === k} onPick={() => setS((x) => ({ ...x, theme: k, accent: "theme", mode: x.mode === "auto" ? "auto" : "theme" }))} />
                ))}
              </div>

              <Label className="mt-5">{tr("لون اللمسة")}</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup">
                <AccentDot label={tr("حسب اللوحة")} on={s.accent === "theme"} onPick={() => set("accent", "theme")} />
                {(Object.keys(ACCENTS) as (keyof typeof ACCENTS)[]).map((k) => (
                  <AccentDot key={k} color={`oklch(${ACCENTS[k].l} ${ACCENTS[k].c} ${ACCENTS[k].h})`} label={tx(ACCENTS[k].label)} on={s.accent === k} onPick={() => set("accent", k)} />
                ))}
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <div>
                  <Label>{tr("الوضع")}</Label>
                  <Choices value={s.mode} onChange={(v) => set("mode", v)}
                    options={[{ value: "theme", label: tr("كما في اللوحة") }, ...(Object.keys(MODES) as (keyof typeof MODES)[]).map((k) => ({ value: k, label: tx(MODES[k]) }))]} />
                </div>
                <div>
                  <Label>{tr("الغلاف العلوي")}</Label>
                  <Choices value={s.hero_tone} onChange={(v) => set("hero_tone", v)}
                    options={(Object.keys(HERO_TONES) as (keyof typeof HERO_TONES)[]).map((k) => ({ value: k, label: tx(HERO_TONES[k]) }))} />
                </div>
                <div>
                  <Label>{tr("زوايا البطاقات والأزرار")}</Label>
                  <Choices value={s.radius} onChange={(v) => set("radius", v)}
                    options={(Object.keys(RADII) as (keyof typeof RADII)[]).map((k) => ({ value: k, label: tx(RADII[k].label) }))} />
                </div>
              </div>
            </Block>

            <Block icon={<Type />} title={tr("الخطوط")} hint={tr("كل خيار زوج متناسق: خط للعناوين وخط للنص، بالعربية والإنجليزية.")}>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2">
                {(Object.keys(FONTS) as PageSettings["font"][]).map((k) => {
                  const f = FONTS[k];
                  const on = s.font === k;
                  return (
                    <button key={k} type="button" onClick={() => set("font", k)} aria-pressed={on}
                      className={`relative rounded-xl border p-4 text-start transition ${on ? "border-gold ring-2 ring-gold/40" : "border-border hover:border-gold/40"}`}>
                      <div dir="rtl" className="text-2xl leading-tight" style={{ fontFamily: f.arD, fontWeight: f.arDw }}>{f.sample}</div>
                      <div dir="ltr" className="mt-1 text-lg leading-tight text-start" style={{ fontFamily: f.enD, fontWeight: f.enDw }}>An evening to remember</div>
                      <div className="mt-2 text-xs text-muted-foreground" style={{ fontFamily: f.arB }}>{tx(f.label)}</div>
                      {on && <Check className="absolute top-2 end-2 h-4 w-4 text-gold" />}
                    </button>
                  );
                })}
              </div>
            </Block>

            <Block icon={<LayoutGrid />} title={tr("معرض الأعمال")}>
              <Label>{tr("طريقة العرض")}</Label>
              <Choices value={s.gallery_layout} onChange={(v) => set("gallery_layout", v)}
                options={(Object.keys(LAYOUTS) as (keyof typeof LAYOUTS)[]).map((k) => ({ value: k, label: tx(LAYOUTS[k].label) }))} />
              <Label className="mt-4">{tr("عدد الصور الظاهرة")}</Label>
              <Choices value={String(s.gallery_count)} onChange={(v) => set("gallery_count", Number(v) as PageSettings["gallery_count"])}
                options={GALLERY_COUNTS.map((n) => ({ value: String(n), label: String(n) }))} />
              {warnGallery && <Note>{warnGallery}</Note>}
            </Block>

            <Block icon={<ListOrdered />} title={tr("الأقسام")} hint={tr("الباقات وزر الحجز ثابتان دائماً حتى تستطيع العرائس الحجز.")}>
              <Label>{tr("الترتيب بعد الغلاف")}</Label>
              <Choices value={s.section_order} onChange={(v) => set("section_order", v)}
                options={[{ value: "packages_first", label: tr("الباقات أولاً") }, { value: "gallery_first", label: tr("الأعمال أولاً") }]} />
              <div className="mt-4 divide-y divide-border rounded-xl border border-border">
                <LockedRow label={tr("الباقات والأسعار")} />
                <LockedRow label={tr("نموذج الحجز")} />
                <Toggle label={tr("معرض الأعمال")} on={s.show_gallery} set={(v) => set("show_gallery", v)} />
                <Toggle label={tr("آراء العملاء")} hint={warnReviews} on={s.show_reviews} set={(v) => set("show_reviews", v)} />
                <Toggle label={tr("أرقام الغلاف (التقييم، الموقع، الباقات)")} on={s.show_stats} set={(v) => set("show_stats", v)} />
                <Toggle label={tr("شارات الثقة")} on={s.show_trust_badges} set={(v) => set("show_trust_badges", v)} />
                <Toggle label={tr("ملاحظات الحجز")} hint={warnNotes} on={s.show_booking_notes} set={(v) => set("show_booking_notes", v)} />
              </div>
            </Block>

            <Block icon={<Megaphone />} title={tr("نصوص قصيرة")} hint={g(tr("نص عادي فقط، بدون روابط. اتركيه فارغاً لاستخدام النص الافتراضي."), tr("نص عادي فقط، بدون روابط. اتركه فارغاً لاستخدام النص الافتراضي."))}>
              <TextField label={tr("عبارة بطاقة الغلاف")} placeholder={tr("«كل صورة قصة، وكل قصة تستحق الفخامة»")} value={s.hero_quote} max={QUOTE_MAX} onChange={(v) => set("hero_quote", v)} />
              <TextField className="mt-4" label={tr("شريط إعلان أعلى الصفحة")} placeholder={tr("مثال: مواعيد صيف ٢٠٢٧ متاحة الآن")} value={s.announcement} max={ANNOUNCE_MAX} onChange={(v) => set("announcement", v)} />
            </Block>

            <Block icon={<Languages />} title={tr("لغة الصفحة")} hint={tr("اللغة التي تفتح بها صفحتك لأول مرة. الزائرة تستطيع التبديل دائماً من الزر في الأعلى.")}>
              <Choices value={s.default_lang} onChange={(v) => set("default_lang", v)}
                options={[{ value: "auto", label: tr("تلقائي (حسب الزائرة)") }, { value: "ar", label: "العربية" }, { value: "en", label: "English" }]} />
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

          {/* معاينة حيّة للصفحة الحقيقية */}
          <aside className="hidden lg:block w-[340px] shrink-0">
            <div className="sticky top-24">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{tr("معاينة حيّة")}</span>
                {dirty && <span className="text-gold">{tr("غير محفوظة")}</span>}
              </div>
              {previewSrc && <LivePreview src={previewSrc} settings={s} />}
            </div>
          </aside>
        </div>
      </section>

      {/* الجوال: زر معاينة عائم */}
      {previewSrc && (
        <button type="button" onClick={() => setMobilePreview(true)}
          className={`lg:hidden fixed end-4 z-40 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm text-background shadow-lg ${dirty ? "bottom-24" : "bottom-6"}`}>
          <Smartphone className="h-4 w-4" /> {tr("معاينة")}
        </button>
      )}
      <AnimatePresence>
        {mobilePreview && previewSrc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="lg:hidden fixed inset-0 z-50 flex flex-col bg-background">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm">{tr("معاينة حيّة")}</span>
              <button type="button" onClick={() => setMobilePreview(false)} aria-label={tr("إغلاق")} className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"><X className="h-5 w-5" /></button>
            </div>
            <LivePreview src={previewSrc} settings={s} fill />
          </motion.div>
        )}
      </AnimatePresence>

      {/* شريط الحفظ يظهر فقط عند وجود تغييرات */}
      <AnimatePresence>
        {dirty && (
          <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
            className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="container-editorial flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{tr("لديك تغييرات غير محفوظة")}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setS(saved)} disabled={saving} className="rounded-sm border border-border px-4 py-2 text-sm hover:bg-secondary">{tr("تراجع")}</button>
                <button type="button" onClick={save} disabled={saving} className="rounded-sm bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-60">
                  {saving ? tr("جارٍ الحفظ…") : tr("حفظ ونشر")}
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

/** الصفحة العامة الحقيقية داخل إطار، تستقبل الإعدادات غير المحفوظة عبر postMessage. */
function LivePreview({ src, settings, fill = false }: { src: string; settings: PageSettings; fill?: boolean }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const send = () => ref.current?.contentWindow?.postMessage({ type: "memoria:page-settings", settings }, window.location.origin);
  useEffect(send, [settings]);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.origin === window.location.origin && e.data?.type === "memoria:preview-ready") send(); };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  });
  if (fill) return <iframe ref={ref} src={src} title="preview" className="w-full flex-1 border-0" onLoad={send} />;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card" style={{ width: 340, height: 640 }}>
      <iframe ref={ref} src={src} title="preview" onLoad={send}
        className="origin-top-left border-0 rtl:origin-top-right" style={{ width: 390, height: 735, transform: "scale(0.872)" }} />
    </div>
  );
}

/** عيّنة حقيقية من اللوحة: ورق، بطاقة، عنوان، لمسة — في الوضع الذي سيظهر. */
function ThemeSwatch({ k, s, on, onPick }: { k: PageSettings["theme"]; s: PageSettings; on: boolean; onPick: () => void }) {
  const t = THEMES[k];
  const probe = { ...s, theme: k, accent: on ? s.accent : "theme" } as PageSettings;
  const v = paletteVars(probe, resolveMode(probe, false));
  return (
    <button type="button" onClick={onPick} aria-pressed={on}
      className={`relative overflow-hidden rounded-xl border text-start transition ${on ? "border-gold ring-2 ring-gold/40" : "border-border hover:border-gold/40"}`}>
      <div className="p-2.5" style={{ background: v["--background"] }}>
        <div className="h-7 rounded-md" style={{ background: v["--charcoal"] }} />
        <div className="mt-2 rounded-md p-2" style={{ background: v["--card"], border: `1px solid ${v["--border"]}` }}>
          <div className="h-1.5 w-3/4 rounded-full" style={{ background: v["--foreground"] }} />
          <div className="mt-1.5 h-1.5 w-1/2 rounded-full" style={{ background: v["--muted-foreground"], opacity: 0.6 }} />
          <div className="mt-2 h-1.5 w-6 rounded-full" style={{ background: v["--gold"] }} />
        </div>
      </div>
      <div className="px-2.5 py-2 text-xs">{tx(t.label)}</div>
      {on && <Check className="absolute top-1.5 end-1.5 h-4 w-4 text-gold drop-shadow" />}
    </button>
  );
}

function AccentDot({ color, label, on, onPick }: { color?: string; label: string; on: boolean; onPick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onPick} title={label} aria-label={label}
      className={`grid h-9 min-w-9 place-items-center rounded-full border px-1 transition ${on ? "border-foreground" : "border-border hover:border-gold/50"}`}>
      {color ? <span className="h-6 w-6 rounded-full" style={{ background: color }} /> : <span className="px-2 text-xs">{label}</span>}
    </button>
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

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 flex items-center gap-1.5 text-xs text-gold"><Info className="h-3.5 w-3.5 shrink-0" /> {children}</p>;
}

function Choices<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={`min-h-10 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition ${on ? "border-foreground bg-secondary text-foreground" : "border-border text-muted-foreground hover:border-gold/40"}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ label, hint, on, set }: { label: string; hint?: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-sm">
        {label}
        {hint && <span className="block text-[11px] text-gold">{hint}</span>}
      </span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-gold" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${on ? "start-[22px]" : "start-0.5"}`} />
      </button>
    </div>
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
