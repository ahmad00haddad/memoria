import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuthState } from "@/hooks/use-auth-state";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "الباقات والأسعار — Memoria · ميموريا" },
      { name: "description", content: "باقات اشتراك مرنة للمصوّرات على منصّة ميموريا — بدون عمولة على الحجوزات، وأدوات كاملة لإدارة الأعمال." },
      { property: "og:title", content: "الباقات والأسعار — Memoria" },
      { property: "og:description", content: "اشتراك شهري ثابت بدون نسبة من حجوزاتك." },
      { property: "og:url", content: "https://memoria-jo.lovable.app/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://memoria-jo.lovable.app/pricing" }],
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
            <Sparkles className="h-3.5 w-3.5" /> اشتراك المصوّرات
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl mb-4">باقات اشتراك المصوّرين</h1>
          <p className="text-xs text-muted-foreground mb-3">هذه الصفحة للمصوّرين فقط — استخدام المنصة مجاني للعملاء.</p>
          <p className="text-muted-foreground leading-loose">
            ابدئي بـ <span className="text-gold font-semibold">14 يومًا تجربة مجانية</span> بدون أي بطاقة. بعدها 7 د.أ شهريًا فقط.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          {/* Free trial card */}
          <div className="rounded-sm border border-border bg-card p-8 shadow-soft">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">للبداية</div>
            <h3 className="font-serif text-2xl mb-1">تجربة مجانية</h3>
            <div className="text-4xl font-serif my-4">
              0 <span className="text-xl font-sans">د.أ</span> <span className="text-sm text-muted-foreground">/ 14 يوم</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">جرّبي كل شيء قبل الالتزام. تبدأ تلقائيًا عند التسجيل.</p>
            <Link
              to={authLoading || isPhotographer ? "/dashboard" : "/photographers/join"}
              className="block text-center w-full border border-charcoal text-charcoal py-3 rounded-sm hover:bg-secondary transition-colors"
            >
              {authLoading || isPhotographer ? "افتحي لوحة التحكم" : "ابدئي مجانًا"}
            </Link>
          </div>

          {/* Pro plan */}
          <div className="relative rounded-sm border-2 border-gold bg-card p-8 shadow-elegant">
            <div className="absolute -top-3 right-6 bg-gold text-charcoal text-[11px] uppercase tracking-[0.25em] px-3 py-1 rounded-sm">
              الأكثر طلبًا
            </div>
            <div className="text-xs uppercase tracking-[0.25em] text-gold mb-2">احترافي</div>
            <h3 className="font-serif text-2xl mb-1">Elite Pro</h3>
            <div className="text-4xl font-serif my-4">
              7 <span className="text-xl font-sans">د.أ</span> <span className="text-sm text-muted-foreground">/ شهريًا</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">كل ما تحتاجينه لإدارة احترافية كاملة. ادفعي عبر CliQ أو بطاقة دولية.</p>
            <Link
              to={authLoading || isPhotographer ? "/dashboard/subscription" : "/login"}
              className="block text-center w-full bg-charcoal text-ivory py-3 rounded-sm shadow-soft hover:opacity-90 transition-opacity"
            >
              اشتركي الآن
            </Link>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mt-16">
          <h2 className="font-serif text-2xl text-center mb-6">يشمل الاشتراك</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-gold mt-0.5 flex-shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-center mt-16 text-xs text-muted-foreground">
          الأسعار للمصوّرات على المنصّة فقط. العملاء يستخدمون الموقع مجانًا.
        </div>
      </section>
      <Footer />
    </div>
  );
}
