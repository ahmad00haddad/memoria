import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { RevealWords, RiseIn } from "@/components/site/Reveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { t, tx } from "@/i18n";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: t("الأسئلة الشائعة — Memoria · ميموريا") },
      { name: "description", content: t("إجابات لأكثر الأسئلة شيوعاً حول الحجز، الدفع، الإلغاء، التقييمات، والاشتراكات على منصّة ميموريا.") },
      { property: "og:title", content: t("الأسئلة الشائعة — Memoria") },
      { property: "og:description", content: t("كل ما تحتاجين معرفته قبل الحجز أو الانضمام.") },
      { property: "og:url", content: "https://memoria-production.ahmad000haddad.workers.dev/faq" },
    ],
    links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/faq" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [...clientQ, ...photographerQ].map((q) => ({
          "@type": "Question",
          name: q.q,
          acceptedAnswer: { "@type": "Answer", text: q.a },
        })),
      }),
    }],
  }),
  component: FaqPage,
});

const clientQ = [
  { q: "هل استخدام المنصّة مجّاني للعميلة؟", a: "نعم، تماماً. لا نأخذ أي رسوم منكِ. المصوّرات يدفعن اشتراكاً ثابتاً للوصول إلى أدوات الإدارة." },
  { q: "كيف أتأكد أن المصوّرة موثوقة؟", a: "شارة «موثّقة» تظهر فقط للمصوّرات اللواتي راجع فريقنا هويتهنّ وأعمالهنّ ولديهنّ اشتراك Pro فعّال. والتقييمات لا تُكتب إلا من حجوزات مكتملة." },
  { q: "كيف يتم دفع العربون؟", a: "بعد موافقة المصوّرة على طلبكِ، تحوّلين العربون لها مباشرة عبر CliQ خلال 48 ساعة وترفعين صورة الإيصال. يتثبّت الحجز بعد أن تؤكّد المصوّرة وصول المبلغ لحسابها." },
  { q: "ماذا لو ألغيت الحجز؟", a: "قبل تحويل العربون تلغين دون أي التزام. بعد التحويل يُطبَّق ما أعلنته المصوّرة في صفحتها: لا يُرجَع، أو يُرجَع جزء منه، أو كاملاً. ترين هذه السياسة وتوافقين عليها قبل التحويل. وإذا ألغت المصوّرة، تُرجع لكِ العربون كاملاً." },
  { q: "ماذا لو لم ترد المصوّرة؟", a: "عندها 24 ساعة لتوافق أو تعتذر. إذا لم تردّ يُلغى الطلب تلقائياً ويصلكِ إشعار، ولا تكونين قد دفعتِ شيئاً. يمكنكِ عندها طلب حجز مع مصوّرة أخرى." },
  { q: "هل تظهر صوري على المنصّة؟", a: "تختارين عند الحجز بين «صور قابلة للنشر» أو «خصوصية تامة». في الحالة الثانية، لا يحق لأي طرف نشر صوركِ." },
];

const photographerQ = [
  { q: "كم تكلفة الانضمام؟", a: "١٤ يوماً تجربة مجانية بكل ميزات Pro، ثم اشتراك ثابت شهري أو سنوي بباقة Basic أو Pro — التفاصيل في صفحة الباقات." },
  { q: "هل المنصّة تأخذ نسبة من كل حجز؟", a: "لا. نعتمد على الاشتراك فقط — كل ما تحصلين عليه من العربون والمبلغ الكامل ملككِ." },
  { q: "كم وقت إنشاء الملف؟", a: "حوالي 10–15 دقيقة عبر معالج Onboarding المُوجَّه. يمكنك حفظ التقدّم والعودة لاحقاً." },
  { q: "متى يُنشر ملفي؟", a: "فور إكمال خطوات الإعداد (البيانات الأساسية وباقة واحدة على الأقل) يظهر ملفكِ في البحث. ننصح برفع ٥ صور على الأقل من أعمالكِ قبل مشاركة الرابط." },
  { q: "كيف تُدار التقييمات؟", a: "كل تقييم جديد يدخل قائمة المراجعة قبل النشر لمنع المحتوى المسيء أو غير الحقيقي." },
];

function FaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-editorial py-16 max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">{t("الأسئلة الشائعة")}</div>
        <h1 className="font-serif text-4xl sm:text-5xl mb-4"><RevealWords lines={[t("إجابات سريعة وواضحة")]} /></h1>
        <p className="text-muted-foreground mb-10">{t("إن لم تجدي إجابة لسؤالك هنا،")}{" "}<Link to="/contact" className="text-gold underline">{t("تواصلي معنا")}</Link>.</p>

        <h2 className="font-serif text-2xl mb-4">{t("للعميلات")}</h2>
        <Accordion type="single" collapsible className="mb-10">
          {clientQ.map((q, i) => (
            <RiseIn key={i} cols={1}><AccordionItem value={`c-${i}`}>
              <AccordionTrigger className="text-start">{tx(q.q)}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-loose">{tx(q.a)}</AccordionContent>
            </AccordionItem></RiseIn>
          ))}
        </Accordion>

        <h2 className="font-serif text-2xl mb-4">{t("للمصوّرات")}</h2>
        <Accordion type="single" collapsible>
          {photographerQ.map((q, i) => (
            <RiseIn key={i} cols={1}><AccordionItem value={`p-${i}`}>
              <AccordionTrigger className="text-start">{tx(q.q)}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-loose">{tx(q.a)}</AccordionContent>
            </AccordionItem></RiseIn>
          ))}
        </Accordion>
      </main>
      <Footer />
    </div>
  );
}