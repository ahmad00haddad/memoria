import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { listPublishedCities } from "@/lib/search.functions";
import { ArrowLeft, Calendar, Camera, MessageSquareOff, Receipt, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import heroImg from "@/assets/hero-bride.jpg";
import { useAuthState } from "@/hooks/use-auth-state";
import { fadeUp, scaleIn, staggerContainer, float, cardHover, viewportOnce } from "@/lib/animations";
import { ScrollReveal } from "@/components/ScrollReveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Memoria · ميموريا — منصّة تصوير المناسبات في الأردن" },
      { name: "description", content: "احجزي مصوّرة أعراس ومناسبات موثّقة في الأردن. باقات واضحة، عربون CliQ مباشر، وتقييمات من حجوزات مكتملة فقط." },
      { property: "og:title", content: "Memoria · ميموريا — تصوير المناسبات" },
      { property: "og:description", content: "منصّة لحجز مصوّرات المناسبات بثقة — أسعار شفافة، عربون مباشر، وتقييمات موثّقة." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://memoria-production.ahmad000haddad.workers.dev/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Memoria · ميموريا" },
      { name: "twitter:description", content: "احجزي مصوّرة مناسباتك بثقة." },
      { property: "og:image", content: "https://memoria-production.ahmad000haddad.workers.dev/og-default.png" },
      { name: "twitter:image", content: "https://memoria-production.ahmad000haddad.workers.dev/og-default.png" },
    ],
    links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/" }],
  }),
  component: Landing,
});

// ─── اختيار الدور عند أول زيارة ────────────────────────────────────────────
export const VISITOR_ROLE_KEY = "memoria_visitor_role";

function RoleGate({ onSelect }: { onSelect: (role: "client" | "photographer" | "guest") => void }) {
  return (
    <motion.div
      key="role-gate"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 sm:p-10"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="grid h-12 w-12 place-items-center rounded-sm bg-gradient-gold">
          <Camera className="h-6 w-6 text-charcoal" />
        </div>
        <div>
          <div className="font-serif text-xl tracking-wide">Memoria <span className="text-muted-foreground text-base">ميموريا</span></div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">ذاكرة يومكِ · الأردن</div>
        </div>
      </div>

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-10"
      >
        <h1 className="font-serif text-4xl sm:text-5xl mb-3">أهلاً بكِ 👋</h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
          أخبرينا من أنتِ حتى نُوجّهكِ مباشرةً لما يناسبكِ — بدون ضياع
        </p>
      </motion.div>

      {/* Role cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="grid sm:grid-cols-2 gap-4 w-full max-w-2xl"
      >
        {/* Client */}
        <button
          onClick={() => onSelect("client")}
          className="group flex flex-col items-start p-7 rounded-sm border-2 border-border bg-card hover:border-gold/60 hover:bg-gold/5 hover:shadow-elegant transition-all text-right"
        >
          <div className="text-4xl mb-4">🌸</div>
          <div className="font-serif text-2xl mb-2">عروس أو أهل الزفاف</div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">
            ابحثي عن مصوّرتكِ المفضّلة، شاهدي المواعيد المتاحة، واحجزي فوراً بدون واتساب.
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-gold font-medium">
            ابحثي الآن <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Photographer */}
        <button
          onClick={() => onSelect("photographer")}
          className="group flex flex-col items-start p-7 rounded-sm border-2 border-charcoal bg-charcoal text-ivory hover:opacity-95 hover:shadow-elegant transition-all text-right"
        >
          <div className="text-4xl mb-4">📷</div>
          <div className="font-serif text-2xl mb-2">مصوّرة محترفة</div>
          <p className="text-sm text-ivory/70 leading-relaxed mb-6 flex-1">
            أنشئي ملفكِ، حدّدي أسعاركِ، واستقبلي حجوزاتكِ — تجربة مجانية ١٤ يوماً بدون بطاقة.
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-gold font-medium">
            انضمّي مجاناً <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </button>
      </motion.div>

      {/* Skip */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={() => onSelect("guest")}
        className="mt-8 text-xs text-muted-foreground hover:text-foreground underline transition-colors"
      >
        تخطّي — سأستكشف بنفسي
      </motion.button>
    </motion.div>
  );
}

function Landing() {
  const [featured, setFeatured] = useState<any[]>([]);
  const [featuredStatus, setFeaturedStatus] = useState<"loading" | "ok" | "error">("loading");
  const [featuredReload, setFeaturedReload] = useState(0);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [showRoleGate, setShowRoleGate] = useState(false);
  const { loading: authLoading, authed, isPhotographer, userId } = useAuthState();
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;

    setFeaturedStatus("loading");
    supabase
      .from("profiles")
      .select("username,display_name,city,cover_url,avatar_url")
      .eq("is_published", true)
      .eq("is_featured", true)
      .limit(4)
      .then(
        ({ data, error }) => {
          if (!active) return;
          if (error) {
            setFeaturedStatus("error");
            return;
          }
          setFeatured(data ?? []);
          setFeaturedStatus("ok");
        },
        () => {
          if (active) setFeaturedStatus("error");
        },
      );

    const loadTrialState = async () => {
      if (!active || !userId || !isPhotographer) {
        setTrialDaysLeft(null);
        return;
      }

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status,trial_ends_at,current_period_end")
        .eq("photographer_id", userId)
        .maybeSingle();

      if (!active) return;
      if (!sub) {
        setTrialDaysLeft(null);
        return;
      }

      const targetDate = sub.status === "trial" ? sub.trial_ends_at : sub.current_period_end;
      if (!targetDate) {
        setTrialDaysLeft(0);
        return;
      }

      setTrialDaysLeft(Math.max(0, Math.ceil((new Date(targetDate).getTime() - Date.now()) / 86400000)));
    };

    void loadTrialState();

    return () => {
      active = false;
    };
  }, [isPhotographer, userId, featuredReload]);

  const [visitorRole, setVisitorRole] = useState<"client" | "photographer" | "guest" | null>(null);
  const [heroDate, setHeroDate] = useState("");
  const [heroCity, setHeroCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const runCities = useServerFn(listPublishedCities);
  useEffect(() => { runCities({}).then((c: any) => setCities(c ?? [])).catch(() => {}); /* eslint-disable-next-line */ }, []);
  const [resume, setResume] = useState<{ label: string; city?: string; date?: string } | null>(null);
  useEffect(() => {
    try {
      const ls = JSON.parse(localStorage.getItem("memoria_last_search") || "null");
      if (ls && (ls.city || ls.date)) {
        const date = ls.date && ls.date >= new Date().toISOString().slice(0, 10) ? ls.date : undefined;
        const label = [ls.city, date && new Date(date).toLocaleDateString("ar-JO", { day: "numeric", month: "long" })].filter(Boolean).join(" · ");
        if (label) setResume({ label, city: ls.city || undefined, date });
      }
    } catch { /* ignore */ }
  }, []);
  const goSearch = (city?: string, date?: string) => {
    const search: Record<string, string> = {};
    if (city) search.city = city;
    if (date) search.date = date;
    navigate({ to: "/search", search: search as any });
  };

  // ── Role gate: أظهر شاشة الاختيار عند أول زيارة لغير المسجّلين ──
  useEffect(() => {
    try {
      const r = localStorage.getItem(VISITOR_ROLE_KEY) as "client" | "photographer" | "guest" | null;
      setVisitorRole(r);
      if (!authLoading && !authed && !r) {
        setShowRoleGate(true);
      }
    } catch {}
  }, [authLoading, authed]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("memoria-role-gate", { detail: showRoleGate }));
  }, [showRoleGate]);

  const handleRoleSelect = (role: "client" | "photographer" | "guest") => {
    try { localStorage.setItem(VISITOR_ROLE_KEY, role); } catch {}
    setShowRoleGate(false);
    
    if (role === "photographer") {
      setTimeout(() => navigate({ to: "/photographers/join" }), 250);
    } else if (role === "client") {
      setTimeout(() => navigate({ to: "/search" }), 250);
    }
    // if guest, just close the gate and stay on landing page
  };

  return (
    <>
      <AnimatePresence>
        {showRoleGate && <RoleGate onSelect={handleRoleSelect} />}
      </AnimatePresence>
      <div className="min-h-screen bg-background">
        <Header />


      {/* Hero — invitation-card composition: arch-framed portrait, calligraphic accent */}
      <section className="relative overflow-hidden grain-overlay">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[70%] bg-[radial-gradient(60%_60%_at_70%_20%,color-mix(in_oklab,var(--gold)_14%,transparent),transparent_70%)]" />
        <div className="container-editorial relative pt-10 lg:pt-16 pb-24 lg:pb-32">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex items-center gap-4 text-muted-foreground mb-10 lg:mb-14"
          >
            <span className="eyebrow">Memoria</span>
            <span className="h-px flex-1 max-w-24 bg-gold/40" />
            <span className="text-xs">عمّان · الأردن</span>
            <span className="hidden sm:inline font-serif italic text-sm text-muted-foreground/70" dir="ltr">Wedding photography, booked beautifully</span>
          </motion.div>

          <div className="grid gap-14 lg:grid-cols-12 items-end">
            <motion.div
              className="order-2 lg:order-1 lg:col-span-7 space-y-8"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.p variants={fadeUp} className="eyebrow">
                منصّة الحجوزات الأكثر فخامة لمصوّري الأعراس في الأردن
              </motion.p>
              <motion.h1
                variants={fadeUp}
                className="font-serif text-[2.9rem] sm:text-7xl lg:text-[5.6rem] !leading-[1.15]"
              >
                من النقرة الأولى
                <span className="block font-script text-gold text-[3.4rem] sm:text-[5.2rem] lg:text-[6.6rem] !leading-[1.05] -mt-1 lg:-me-10">
                  إلى الذكرى الأبدية
                </span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-md leading-loose">
                {visitorRole === "photographer" || isPhotographer
                  ? "ارتقِ بعملكِ الاحترافي. استقبلي حجوزاتكِ، ديري مواعيدكِ، واحصلي على عربونكِ بأمان."
                  : "احجزي مصوّرة عرسك خلال دقائق. أسعار شفافة، مواعيد متاحة لحظيًا، وعربون آمن."}
              </motion.p>
              {visitorRole !== "photographer" && !isPhotographer && (
                <motion.form
                  variants={fadeUp}
                  onSubmit={(e) => { e.preventDefault(); goSearch(heroCity, heroDate); }}
                  className="flex max-w-xl flex-col gap-2 rounded-2xl border border-border bg-card/90 p-2 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:rounded-full"
                >
                  <label className="flex flex-1 items-center gap-2 rounded-full px-4 py-2 focus-within:bg-secondary/60">
                    <span className="text-xs text-muted-foreground shrink-0">المدينة</span>
                    <select value={heroCity} onChange={(e) => setHeroCity(e.target.value)} className="w-full bg-transparent text-sm text-foreground outline-none [&>option]:bg-background [&>option]:text-foreground">
                      <option value="">كل المدن</option>
                      {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <span className="hidden h-6 w-px bg-border sm:block" />
                  <label className="flex flex-1 items-center gap-2 rounded-full px-4 py-2 focus-within:bg-secondary/60">
                    <span className="text-xs text-muted-foreground shrink-0">تاريخ العرس</span>
                    <input type="date" value={heroDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setHeroDate(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
                  </label>
                  <button type="submit" className="group inline-flex items-center justify-center gap-2 rounded-full bg-charcoal px-6 py-3 text-sm text-ivory transition-all hover:gap-3 active:scale-[0.98] dark:bg-gold dark:text-charcoal">
                    {heroDate ? "المتاحات" : "ابحثي"} <ArrowLeft className="h-4 w-4" />
                  </button>
                </motion.form>
              )}
              {resume && visitorRole !== "photographer" && !isPhotographer && (
                <motion.div variants={fadeUp} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>تابعي بحثك:</span>
                  <button onClick={() => goSearch(resume.city, resume.date)} className="rounded-full border border-dashed border-border px-3 py-1 hover:border-gold/50 hover:text-foreground">{resume.label}</button>
                </motion.div>
              )}
              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-x-8 gap-y-4">
                {authLoading || authed ? (
                  <Link
                    to="/dashboard"
                    className={visitorRole === "client" ? "hidden" : "inline-flex items-center gap-2 bg-charcoal text-ivory px-7 py-3.5 rounded-full transition hover:opacity-90 active:scale-[0.98] dark:bg-gold dark:text-charcoal"}
                  >
                    لوحتي
                  </Link>
                ) : visitorRole !== "client" ? (
                  <Link
                    to="/photographers/join"
                    className="text-sm border-b border-current/40 pb-1 hover:border-gold hover:text-gold transition-colors"
                  >
                    مصوّرة؟ انضمي مجاناً
                  </Link>
                ) : null}
              </motion.div>
              {isPhotographer && trialDaysLeft !== null && (
                <motion.div variants={fadeUp} className="border-s-2 border-gold ps-4 py-1 text-sm text-foreground max-w-md">
                  {trialDaysLeft > 0
                    ? `متبقّي ${trialDaysLeft} يومًا من التجربة المجانية لحسابك.`
                    : "انتهت التجربة المجانية، ويجب تفعيل الاشتراك للاستمرار في استقبال الحجوزات."}
                </motion.div>
              )}
              <motion.div variants={fadeUp} className="flex items-center gap-6 pt-2 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 fill-gold text-gold" /> تقييمات حقيقية من عملاء سابقات</div>
                <span className="hidden sm:block h-3 w-px bg-border" />
                <div className="hidden sm:block">حجز فوري بدون واتساب</div>
              </motion.div>
            </motion.div>

            <motion.div
              className="order-1 lg:order-2 lg:col-span-5 relative mx-auto w-full max-w-[420px] lg:max-w-none"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
            >
              {/* thin offset arch outline behind the photo */}
              <div aria-hidden className="absolute inset-0 translate-x-3 -translate-y-3 lg:translate-x-5 lg:-translate-y-5 rounded-t-full border border-gold/50" />
              <div className="relative overflow-hidden rounded-t-full group shadow-elegant">
                <img
                  src={heroImg}
                  alt="عروس في إطلالة سينمائية"
                  width={598}
                  height={1420}
                  className="w-full aspect-[3/4.2] object-cover object-top will-change-transform transition-transform duration-[1600ms] ease-out group-hover:scale-[1.04]"
                />
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-charcoal/40 to-transparent" />
              </div>
              <span aria-hidden className="hidden lg:block absolute top-1/2 -end-14 -translate-y-1/2 rotate-90 origin-center whitespace-nowrap font-serif italic text-sm tracking-[0.3em] text-muted-foreground/60" dir="ltr">
                est. 2026 — Amman
              </span>
              <motion.div
                animate={float}
                className="absolute -bottom-8 -start-4 sm:-start-12 bg-card/95 backdrop-blur border border-gold/25 rounded-2xl p-5 shadow-soft max-w-[250px]"
              >
                <div className="flex items-center justify-between mb-1.5 gap-3">
                  <div className="text-xs text-muted-foreground">سعر فوري</div>
                  <span className="text-[10px] text-gold border border-gold/30 px-1.5 py-0.5 rounded-sm">مثال تقديري</span>
                </div>
                <div className="font-serif text-3xl tabular-nums">~٣٢٠ <span className="text-sm text-muted-foreground">د.أ</span></div>
                <div className="text-xs text-muted-foreground leading-relaxed mt-1">٤ ساعات تصوير + ٥٠ صورة معدّلة — الأسعار تختلف حسب المصوّر</div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <Flourish />

      {/* Role chooser */}
      {(!visitorRole || visitorRole === "guest" || isPhotographer) && (
        <ScrollReveal delay={0.05}>
        <motion.section
          className="container-editorial py-20"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <div className="grid gap-10 lg:grid-cols-12 items-end mb-10">
            <div className="lg:col-span-5">
              <div className="eyebrow mb-3">ابدأ من هنا</div>
              <h2 className="font-serif text-4xl sm:text-5xl">من أنت؟</h2>
            </div>
            <p className="lg:col-span-6 lg:col-start-7 text-muted-foreground leading-loose max-w-md">
              مكان واحد يجمع العروس بمصوّرتها — من أول نظرة على المعرض حتى استلام الصور.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-12">
            <div className="md:col-span-5">
              <RoleCard
                index="٠١"
                title="العروس وأهل الزفاف"
                desc="ابحثي عن مصوّرتكِ المفضّلة، شاهدي المواعيد المتاحة، واحجزي فورًا."
                cta="ابحثي عن مصوّرة"
                href="/search"
              />
            </div>
            <div className="md:col-span-7 md:mt-12">
              {!authLoading && !isPhotographer ? (
                <RoleCard
                  index="٠٢"
                  title="مصوّرة محترفة"
                  desc="أنشئي ملفكِ، حدّدي أسعاركِ واربطي تقويمكِ — ودعي النظام يدير حجوزاتكِ."
                  cta="انضمي إلى المنصة"
                  href="/photographers/join"
                  highlight
                />
              ) : (
                <RoleCard
                  index="٠٢"
                  title="حسابك جاهز"
                  desc="أنتِ مسجّلة بالفعل. انتقلي مباشرة إلى لوحة التحكم لإدارة الباقات والحجوزات والاشتراك."
                  cta="افتحي لوحة التحكم"
                  href="/dashboard"
                  highlight
                />
              )}
            </div>
          </div>
        </motion.section>
        </ScrollReveal>
      )}

      {/* How — editorial numbered list with a sticky heading */}
      <ScrollReveal delay={0.1}>
      <motion.section
        id="how"
        className="container-editorial py-20 lg:py-28"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <div className="eyebrow mb-3">سير العمل</div>
              <h2 className="font-serif text-4xl sm:text-5xl mb-4">حلّ كامل<br /><span className="font-script text-gold">لكل مشكلة</span></h2>
              <p className="text-muted-foreground leading-loose max-w-xs">كل ما كان يضيع في محادثات الواتساب، صار في مكانه الصحيح.</p>
            </div>
          </div>
          <ol className="lg:col-span-7 lg:col-start-6 divide-y divide-border border-y border-border">
            <Feature n="01" icon={MessageSquareOff} title="بدون واتساب" desc="جميع التفاصيل تُدخل عبر النموذج: الموقع، الوقت، نوع التصوير." />
            <Feature n="02" icon={Calendar} title="تقويم ذكي" desc="مزامنة Google Calendar مع فاصل ساعتين بين الجلسات لمراعاة الازدحام." />
            <Feature n="03" icon={Receipt} title="سعر فوري" desc="حاسبة ديناميكية تشمل الساعات، الإضافات، ورسوم التنقّل بالكيلومتر." />
            <Feature n="04" icon={ShieldCheck} title="عربون آمن" desc="تأكيد الحجز برفع إثبات تحويل CliQ ومصادقة المصوّر." />
          </ol>
        </div>
      </motion.section>
      </ScrollReveal>

      {/* Testimonials — one lead quote, two supporting, staggered */}
      {(visitorRole !== "photographer" && !isPhotographer) && (
        <ScrollReveal delay={0.1}>
        <motion.section
          className="relative bg-charcoal text-ivory py-20 lg:py-28 overflow-hidden grain-overlay"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <span aria-hidden className="pointer-events-none absolute -top-10 start-6 font-serif text-[16rem] leading-none text-gold/10 select-none">”</span>
          <div className="container-editorial relative">
            <div className="eyebrow mb-3">تجارب حقيقية</div>
            <h2 className="font-serif text-4xl sm:text-5xl text-ivory mb-14">آراء العرائس</h2>
            <div className="grid gap-12 lg:grid-cols-12">
              <motion.figure variants={fadeUp} className="lg:col-span-7">
                <blockquote className="font-serif text-2xl sm:text-3xl leading-[1.7] text-ivory">
                  تجربة رائعة من البداية للنهاية. أسعار واضحة وبدون مفاجآت، والمصورة كانت لطيفة جداً وصورها خيالية. أنقذتني من ضياع الأوقات والبحث العشوائي.
                </blockquote>
                <figcaption className="mt-8 flex items-center gap-4">
                  <span className="h-px w-10 bg-gold" />
                  <span className="font-script text-2xl text-gold">سارة الأحمد</span>
                </figcaption>
              </motion.figure>
              <div className="lg:col-span-4 lg:col-start-9 space-y-10 lg:pt-24">
                <Quote name="دانة وليد" text="أكثر شيء عجبني هو وضوح التفاصيل وحساب العربون مباشرة بدون إحراج، وكل شيء كان منظم ويوم عرسي كان مثالي بدون أي تأخير." />
                <Quote name="لين المجالي" text="ميزة التوفر الفوري خلتني أقدر أرتب أموري خلال ساعات، بدل ما أنتظر أيام عشان أسمع رد المصورات. الصور وصلتني أسرع من المتوقع، شكراً ميموريا." />
              </div>
            </div>
          </div>
        </motion.section>
        </ScrollReveal>
      )}

      {(featuredStatus !== "ok" || featured.length > 0) && (visitorRole !== "photographer" && !isPhotographer) && (
        <ScrollReveal delay={0.1}>
        <motion.section
          className="container-editorial py-20 lg:py-28"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <div className="flex items-end justify-between gap-6 mb-12 flex-wrap">
            <div>
              <div className="eyebrow mb-3">المميّزون</div>
              <h2 className="font-serif text-4xl sm:text-5xl">مصوّرون بأعلى التقييمات</h2>
            </div>
            <Link to="/search" className="text-sm border-b border-current/40 pb-1 hover:text-gold hover:border-gold transition-colors">
              كل المصوّرات
            </Link>
          </div>
          {featuredStatus === "loading" && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={i % 2 ? "lg:mt-16" : ""}>
                  <div className="aspect-[3/4] animate-pulse bg-muted rounded-t-full" />
                  <div className="pt-4 space-y-2">
                    <div className="h-4 w-2/3 animate-pulse rounded-sm bg-muted" />
                    <div className="h-3 w-1/3 animate-pulse rounded-sm bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {featuredStatus === "error" && (
            <div className="mx-auto max-w-md border-y border-border py-10 text-center">
              <p className="text-sm text-muted-foreground">
                تعذّر تحميل قائمة المصوّرات الآن. تحقّقي من الاتصال وحاولي مجدداً.
              </p>
              <button
                onClick={() => setFeaturedReload((n) => n + 1)}
                className="mt-4 inline-flex items-center justify-center rounded-full bg-charcoal px-6 py-2.5 text-sm font-medium text-ivory transition hover:opacity-90 active:scale-[0.98]"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {featuredStatus === "ok" && (
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p, i) => (
              <motion.div key={p.username} variants={fadeUp} className={i % 2 ? "lg:mt-16" : ""}>
                <Link to="/photographers/$username" params={{ username: p.username }} className="group block">
                  <div className="aspect-[3/4] bg-gradient-royal overflow-hidden rounded-t-full">
                    {p.cover_url && <img src={p.cover_url} alt={p.display_name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />}
                  </div>
                  <div className="pt-4 flex items-baseline justify-between gap-3">
                    <div className="font-serif text-xl group-hover:text-gold transition-colors">{p.display_name}</div>
                    {p.city && <div className="text-xs text-muted-foreground">{p.city}</div>}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          )}
        </motion.section>
        </ScrollReveal>
      )}

      <Footer />
      </div>
    </>
  );
}

function Flourish() {
  return (
    <div aria-hidden className="container-editorial flex items-center gap-4 text-gold/60">
      <span className="h-px flex-1 bg-gradient-to-l from-gold/40 to-transparent" />
      <svg width="44" height="14" viewBox="0 0 44 14" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M1 7h12M31 7h12M22 1c-3 3-3 9 0 12M22 1c3 3 3 9 0 12M15 7a3 3 0 1 0 6 0M23 7a3 3 0 1 0 6 0" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
    </div>
  );
}

function Quote({ name, text }: { name: string; text: string }) {
  return (
    <motion.figure variants={fadeUp} className="border-s border-ivory/15 ps-6">
      <blockquote className="text-sm leading-loose text-ivory/80">{text}</blockquote>
      <figcaption className="mt-4 font-script text-lg text-gold">{name}</figcaption>
    </motion.figure>
  );
}

function RoleCard({ index, title, desc, cta, href, highlight }: { index: string; title: string; desc: string; cta: string; href: string; highlight?: boolean }) {
  return (
    <motion.div variants={fadeUp} className="h-full">
      <Link
        to={href}
        className={`group relative flex h-full flex-col overflow-hidden rounded-2xl p-8 sm:p-10 transition-all duration-500 hover:shadow-elegant ${
          highlight ? "bg-charcoal text-ivory grain-overlay" : "bg-card border border-border"
        }`}
      >
        <span aria-hidden className={`absolute -top-6 end-4 font-serif text-[8rem] leading-none select-none ${highlight ? "text-ivory/[0.06]" : "text-foreground/[0.05]"}`}>{index}</span>
        <div className={`eyebrow mb-6 ${highlight ? "" : "!text-muted-foreground"}`}>
          {highlight ? "للمصوّرين" : "للعملاء"}
        </div>
        <h3 className="font-serif text-3xl mb-3">{title}</h3>
        <p className={`text-sm leading-loose mb-10 max-w-sm ${highlight ? "text-ivory/70" : "text-muted-foreground"}`}>{desc}</p>
        <div className="mt-auto inline-flex items-center gap-2 text-sm self-start border-b border-current/40 pb-1 transition-all duration-300 group-hover:gap-3 group-hover:border-gold group-hover:text-gold">
          {cta} <ArrowLeft className="h-4 w-4" />
        </div>
      </Link>
    </motion.div>
  );
}

function Feature({ n, icon: Icon, title, desc }: { n: string; icon: typeof Calendar; title: string; desc: string }) {
  return (
    <motion.li variants={fadeUp} className="group grid grid-cols-[auto_1fr_auto] items-start gap-6 py-8">
      <span className="font-serif text-4xl text-gold/70 tabular-nums leading-none pt-1 transition-colors group-hover:text-gold" dir="ltr">{n}</span>
      <div>
        <h3 className="font-serif text-2xl mb-2">{title}</h3>
        <p className="text-muted-foreground leading-loose max-w-md">{desc}</p>
      </div>
      <Icon className="h-5 w-5 text-muted-foreground/50 mt-2 transition-colors group-hover:text-gold" strokeWidth={1.25} />
    </motion.li>
  );
}
