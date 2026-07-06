import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, MessageSquareOff, Receipt, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
      { property: "og:url", content: "https://memoria-jo.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Memoria · ميموريا" },
      { name: "twitter:description", content: "احجزي مصوّرة مناسباتك بثقة." },
    ],
    links: [{ rel: "canonical", href: "https://memoria-jo.lovable.app/" }],
  }),
  component: Landing,
});

function Landing() {
  const [featured, setFeatured] = useState<any[]>([]);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const { loading: authLoading, isPhotographer, userId } = useAuthState();
  useEffect(() => {
    let active = true;

    supabase
      .from("profiles")
      .select("username,display_name,city,cover_url,avatar_url")
      .eq("is_published", true)
      .eq("is_featured", true)
      .limit(4)
      .then(({ data }) => {
        if (active) setFeatured(data ?? []);
      });

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
  }, [isPhotographer, userId]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-editorial grid gap-10 lg:grid-cols-2 items-center pt-10 lg:pt-20 pb-16">
          <motion.div
            className="order-2 lg:order-1 space-y-7"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-card px-3 py-1 text-xs tracking-wide">
              <motion.span
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="text-gold"
              >
                ✦
              </motion.span>
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              منصّة الحجوزات الأكثر فخامة لمصوّري الأعراس في الأردن
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-serif text-5xl sm:text-7xl lg:text-8xl leading-[1.05] tracking-tight"
            >
              من النقرة الأولى
              <br />
              إلى <span className="text-gold italic">الذكرى الأبدية</span>.
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              احجز مصوّر عرسك خلال دقائق. أسعار شفافة، مواعيد متاحة لحظيًا، عربون آمن — بدون رسائل واتساب لا تنتهي.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <Link
                to="/search"
                className="inline-flex items-center gap-2 bg-charcoal text-ivory px-6 py-3 rounded-sm shadow-elegant hover:opacity-90 transition"
              >
                ابحث عن مصوّر
                <ArrowLeft className="h-4 w-4" />
              </Link>
              {authLoading || isPhotographer ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 border border-charcoal/80 px-6 py-3 rounded-sm hover:bg-charcoal hover:text-ivory transition"
                >
                  ادخل إلى لوحتي
                </Link>
              ) : (
                <Link
                  to="/photographers/join"
                  className="inline-flex items-center gap-2 border border-charcoal/80 px-6 py-3 rounded-sm hover:bg-charcoal hover:text-ivory transition"
                >
                  أنا مصوّر — انضم
                </Link>
              )}
            </motion.div>
            {isPhotographer && trialDaysLeft !== null && (
              <motion.div variants={fadeUp} className="rounded-sm border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-foreground max-w-xl">
                {trialDaysLeft > 0
                  ? `متبقّي ${trialDaysLeft} يومًا من التجربة المجانية لحسابك.`
                  : "انتهت التجربة المجانية، ويجب تفعيل الاشتراك للاستمرار في استقبال الحجوزات."}
              </motion.div>
            )}
            <motion.div variants={fadeUp} className="flex items-center gap-4 pt-4 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1"><Star className="h-4 w-4 fill-gold text-gold" /> تقييمات حقيقية من عملاء سابقات</div>
              <div className="hidden sm:block">حجز فوري بدون واتساب</div>
            </motion.div>
          </motion.div>

          <motion.div
            className="order-1 lg:order-2 relative"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
          >
            <div className="absolute -inset-4 bg-gradient-royal rounded-sm -z-10" />
            <div className="overflow-hidden rounded-sm group">
              <img
                src={heroImg}
                alt="عروس في إطلالة سينمائية"
                width={1080}
                height={1600}
                className="w-full h-[480px] sm:h-[560px] object-cover rounded-sm shadow-elegant will-change-transform transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
              />
            </div>
            <motion.div
              animate={float}
              className="absolute -bottom-6 -start-6 sm:-start-10 bg-card border border-border rounded-sm p-4 shadow-soft max-w-[260px]"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">سعر فوري</div>
                <span className="text-[9px] uppercase tracking-[0.15em] bg-gold/15 text-gold px-1.5 py-0.5 rounded-sm">مثال تقديري</span>
              </div>
              <div className="font-serif text-2xl text-muted-foreground/80">~٣٢٠ <span className="text-sm">د.أ</span></div>
              <div className="text-xs text-muted-foreground">٤ ساعات تصوير + ٥٠ صورة معدّلة — الأسعار تختلف حسب المصوّر</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Role chooser */}
      <ScrollReveal delay={0.05}>
      <motion.section
        className="container-editorial py-16"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">ابدأ من هنا</div>
          <h2 className="font-serif text-3xl sm:text-4xl">من أنت؟</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          <RoleCard
            title="العروس وأهل الزفاف"
            desc="ابحثي عن مصوّرتكِ المفضّلة، شاهدي المواعيد المتاحة، واحجزي فورًا."
            cta="ابحثي عن مصوّرة"
            href="/search"
          />
          {!authLoading && !isPhotographer ? (
            <RoleCard
              title="مصوّرة محترفة"
              desc="أنشئي ملفكِ، حدّدي أسعاركِ واربطي تقويمكِ — ودعي النظام يدير حجوزاتكِ."
              cta="انضمي إلى المنصة"
              href="/photographers/join"
              highlight
            />
          ) : (
            <RoleCard
              title="حسابك جاهز"
              desc="أنتِ مسجّلة بالفعل. انتقلي مباشرة إلى لوحة التحكم لإدارة الباقات والحجوزات والاشتراك."
              cta="افتحي لوحة التحكم"
              href="/dashboard"
              highlight
            />
          )}
        </div>
      </motion.section>
      </ScrollReveal>

      {/* How */}
      <ScrollReveal delay={0.1}>
      <motion.section
        id="how"
        className="container-editorial py-16"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">سير العمل</div>
          <h2 className="font-serif text-3xl sm:text-4xl">حلّ كامل لكل مشكلة</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={MessageSquareOff} title="بدون واتساب" desc="جميع التفاصيل تُدخل عبر النموذج: الموقع، الوقت، نوع التصوير." />
          <Feature icon={Calendar} title="تقويم ذكي" desc="مزامنة Google Calendar مع فاصل ساعتين بين الجلسات لمراعاة الازدحام." />
          <Feature icon={Receipt} title="سعر فوري" desc="حاسبة ديناميكية تشمل الساعات، الإضافات، ورسوم التنقّل بالكيلومتر." />
          <Feature icon={ShieldCheck} title="عربون آمن" desc="تأكيد الحجز برفع إثبات تحويل CliQ ومصادقة المصوّر." />
        </div>
      </motion.section>
      </ScrollReveal>

      {featured.length > 0 && (
        <ScrollReveal delay={0.1}>
        <motion.section
          className="container-editorial py-16"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <div className="text-center mb-10">
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">⭐ المميّزون</div>
            <h2 className="font-serif text-3xl sm:text-4xl">مصوّرون بأعلى التقييمات</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <motion.div key={p.username} variants={fadeUp} whileHover={cardHover}>
                <Link to="/photographers/$username" params={{ username: p.username }}
                  className="group block rounded-sm overflow-hidden border border-border bg-card shadow-soft hover:shadow-elegant transition">
                  <div className="aspect-[4/3] bg-gradient-royal overflow-hidden">
                    {p.cover_url && <img src={p.cover_url} alt={p.display_name} className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />}
                  </div>
                  <div className="p-4">
                    <div className="font-serif text-lg">{p.display_name}</div>
                    {p.city && <div className="text-xs text-muted-foreground">{p.city}</div>}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
        </ScrollReveal>
      )}

      <Footer />
    </div>
  );
}

function RoleCard({ title, desc, cta, href, highlight }: { title: string; desc: string; cta: string; href: string; highlight?: boolean }) {
  return (
    <motion.div variants={fadeUp} whileHover={cardHover}>
      <Link
        to={href}
        className={`group block rounded-sm border p-8 transition-all hover:shadow-elegant ${
          highlight ? "bg-charcoal text-ivory border-charcoal" : "bg-card border-border"
        }`}
      >
        <div className={`text-xs uppercase tracking-[0.25em] mb-3 ${highlight ? "text-gold" : "text-muted-foreground"}`}>
          {highlight ? "للمصوّرين" : "للعملاء"}
        </div>
        <h3 className="font-serif text-2xl mb-2">{title}</h3>
        <p className={`text-sm leading-relaxed mb-6 ${highlight ? "text-ivory/70" : "text-muted-foreground"}`}>{desc}</p>
        <div className="inline-flex items-center gap-2 text-sm border-b border-current pb-0.5 group-hover:gap-3 transition-all">
          {cta} <ArrowLeft className="h-4 w-4" />
        </div>
      </Link>
    </motion.div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Calendar; title: string; desc: string }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={cardHover}
      className="rounded-sm border border-border bg-card p-6 shadow-soft hover:shadow-elegant transition-shadow"
    >
      <motion.div whileHover={{ rotate: 6, scale: 1.1 }} className="grid h-10 w-10 place-items-center rounded-sm bg-secondary mb-4">
        <Icon className="h-5 w-5 text-gold" />
      </motion.div>
      <div className="font-serif text-lg mb-1">{title}</div>
      <div className="text-sm text-muted-foreground leading-relaxed">{desc}</div>
    </motion.div>
  );
}
