import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuthState } from "@/hooks/use-auth-state";
import { motion } from "framer-motion";
import { DrawFrame, EASE_OUT } from "@/components/site/Reveal";
import { t, tx } from "@/i18n";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: t("الباقات والأسعار — Memoria · ميموريا") },
      { name: "description", content: t("باقات اشتراك مرنة للمصوّرات على منصّة ميموريا — بدون عمولة على الحجوزات، وأدوات كاملة لإدارة الأعمال.") },
      { property: "og:title", content: t("الباقات والأسعار — Memoria") },
      { property: "og:description", content: t("اشتراك شهري ثابت بدون نسبة من حجوزاتك.") },
      { property: "og:url", content: "https://memoria-production.ahmad000haddad.workers.dev/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/pricing" }],
  }),
  component: PricingPage,
});

const FEATURES = [
  "ملف عام احترافي مع رابط فريد @username",
  "بطاقة أسعار تفاعلية للتصوير والفيديو",
  "حاسبة سعر فورية مع رسوم التنقّل",
  "تقويم ذكي ومنع التعارضات",
  "تدفّق العربون CliQ مع رفع إثبات",
  "رسائل داخلية وإشعارات بالبريد",
  "تتبّع ما بعد التصوير والمراجعات",
  "دعم فني سريع باللغة العربية",
];

function PricingPage() {
  const { loading: authLoading, isPhotographer } = useAuthState();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold mb-3">
            <Sparkles className="h-3.5 w-3.5" />{" "}{t("اشتراك المصوّرات")}
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl mb-4">{t("باقات اشتراك المصوّرين")}</h1>
          <p className="text-xs text-muted-foreground mb-3">{t("هذه الصفحة للمصوّرين فقط — استخدام المنصة مجاني للعملاء.")}</p>
          <p className="text-muted-foreground leading-loose">
            {t("ابدئي بـ")}{" "}<span className="text-gold font-semibold">{t("14 يومًا تجربة مجانية")}</span>{" "}{t("بدون أي بطاقة. بعدها 7 د.أ شهريًا فقط.")}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {/* Free trial card */}
          <div className="rounded-sm border border-border bg-card p-8 shadow-soft">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">{t("للبداية")}</div>
            <h3 className="font-serif text-2xl mb-1">{t("تجربة مجانية")}</h3>
            <div className="text-4xl font-serif my-4">
              0 <span className="text-xl font-sans">{t("د.أ")}</span> <span className="text-sm text-muted-foreground">{t("/ 14 يوم")}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">{t("جرّبي كل شيء قبل الالتزام. تبدأ تلقائيًا عند التسجيل.")}</p>
            <Link
              to={authLoading || isPhotographer ? "/dashboard" : "/photographers/join"}
              className="block text-center w-full border border-foreground/70 text-foreground py-3 rounded-sm hover:bg-secondary transition-colors"
            >
              {authLoading || isPhotographer ? t("افتحي لوحة التحكم") : t("ابدئي مجانًا")}
            </Link>
          </div>

          {/* Flex — monthly */}
          <div className="rounded-sm border border-border bg-card p-8 shadow-soft">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">{t("شهري")}</div>
            <h3 className="font-serif text-2xl mb-1">Flex</h3>
            <div className="text-4xl font-serif my-4">
              7 <span className="text-xl font-sans">{t("د.أ")}</span> <span className="text-sm text-muted-foreground">{t("/ شهر")}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">{t("دفعة لشهر كامل، بدون التزام طويل.")}</p>
            <Link
              to={authLoading || isPhotographer ? "/dashboard/subscription" : "/login"}
              className="block text-center w-full border border-foreground/70 text-foreground py-3 rounded-sm hover:bg-secondary transition-colors"
            >
              {t("اشتركي شهريًا")}
            </Link>
          </div>

          {/* Signature — yearly */}
          <div className="relative rounded-sm border-2 border-transparent bg-card p-8 shadow-elegant">
            {/* the gold frame draws itself, then the badge settles onto it */}
            <DrawFrame duration={1.6} />
            <motion.div
              className="absolute -top-3 start-6 bg-gold text-charcoal text-[11px] uppercase tracking-[0.25em] px-3 py-1 rounded-sm"
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 1.3, ease: EASE_OUT }}
            >
              {t("الأوفر")}
            </motion.div>
            <div className="text-xs uppercase tracking-[0.25em] text-gold mb-2">{t("سنوي")}</div>
            <h3 className="font-serif text-2xl mb-1">Signature</h3>
            <div className="text-4xl font-serif my-4">
              70 <span className="text-xl font-sans">{t("د.أ")}</span> <span className="text-sm text-muted-foreground">{t("/ سنة")}</span>
            </div>
            <div className="-mt-2 mb-4 inline-block rounded-full bg-gold/15 px-3 py-1 text-xs text-gold">
              {t("شهران مجاناً — ≈ 5.8 د.أ للشهر")}
            </div>
            <p className="text-sm text-muted-foreground mb-6">{t("سنة كاملة بدفعة واحدة، وأوفر 14 د.أ.")}</p>
            <Link
              to={authLoading || isPhotographer ? "/dashboard/subscription" : "/login"}
              className="block text-center w-full bg-primary text-primary-foreground py-3 rounded-sm shadow-soft hover:opacity-90 transition-opacity"
            >
              {t("اشتركي الآن")}
            </Link>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mt-16">
          <h2 className="font-serif text-2xl text-center mb-6">{t("يشمل الاشتراك")}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-gold mt-0.5 flex-shrink-0" />
                <span>{tx(f)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-center mt-16 text-xs text-muted-foreground">
          {t("الأسعار للمصوّرات على المنصّة فقط. العملاء يستخدمون الموقع مجانًا.")}
        </div>
      </section>
      <Footer />
    </div>
  );
}
