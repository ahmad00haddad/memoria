import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "الأسئلة الشائعة — Memoria · ميموريا" },
      { name: "description", content: "إجابات لأكثر الأسئلة شيوعاً حول الحجز، الدفع، الإلغاء، التقييمات، والاشتراكات على منصّة ميموريا." },
      { property: "og:title", content: "الأسئلة الشائعة — Memoria" },
      { property: "og:description", content: "كل ما تحتاجين معرفته قبل الحجز أو الانضمام." },
      { property: "og:url", content: "https://memoria-jo.lovable.app/faq" },
    ],
    links: [{ rel: "canonical", href: "https://memoria-jo.lovable.app/faq" }],
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
  { q: "هل استخدام المنصّة مجّاني للعميلة؟", a: "نعم، تماماً. لا نأخذ أي رسوم منكِ. المصوّرات يدفعن اشتراكاً شهرياً للوصول إلى أدوات الإدارة." },
  { q: "كيف أتأكد أن المصوّرة موثوقة؟", a: "نعرض بادج «تم التحقق» فقط للمصوّرات اللواتي اجتزن مراجعة الهوية والأعمال. كما تظهر التقييمات من حجوزات مكتملة فقط." },
  { q: "كيف يتم دفع العربون؟", a: "العربون يُدفع مباشرة للمصوّرة عبر CliQ أو طرق الدفع التي تعتمدها هي، أو إلكترونياً عبر بوابة الدفع عند تفعيلها. الموعد يُثبَّت فقط بعد تأكيد استلام العربون." },
  { q: "ماذا لو ألغيت الحجز؟", a: "كل مصوّرة تحدّد سياسة الإلغاء/الاسترداد الخاصة بها (كامل/جزئي/غير قابل للاسترداد)، وتُعرض السياسة بوضوح قبل تأكيد الحجز." },
  { q: "ماذا لو لم ترد المصوّرة؟", a: "إذا لم نتلقَّ ردّاً خلال 48 ساعة، يُعتبر الطلب منتهياً ولا يُحتسب العربون. يمكنكِ بسهولة طلب حجز مع مصوّرة أخرى." },
  { q: "هل تظهر صوري على المنصّة؟", a: "تختارين عند الحجز بين «صور قابلة للنشر» أو «خصوصية تامة». في الحالة الثانية، لا يحق لأي طرف نشر صوركِ." },
];

const photographerQ = [
  { q: "كم تكلفة الانضمام؟", a: "نقدّم فترة تجريبية مجانية، ثم اشتراك شهري ثابت — تفاصيل الباقات في صفحة باقات المصوّرين." },
  { q: "هل المنصّة تأخذ نسبة من كل حجز؟", a: "لا. نعتمد على الاشتراك الشهري فقط — كل ما تحصلين عليه من العربون والمبلغ الكامل ملككِ." },
  { q: "كم وقت إنشاء الملف؟", a: "حوالي 10–15 دقيقة عبر معالج Onboarding المُوجَّه. يمكنك حفظ التقدّم والعودة لاحقاً." },
  { q: "متى يُنشر ملفي؟", a: "بعد إكمال البيانات الأساسية ورفع نموذج أعمال، يدخل الملف مرحلة المراجعة، ثم يُنشر خلال 24–48 ساعة." },
  { q: "كيف تُدار التقييمات؟", a: "كل تقييم جديد يدخل قائمة المراجعة قبل النشر لمنع المحتوى المسيء أو غير الحقيقي." },
];

function FaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-editorial py-16 max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">الأسئلة الشائعة</div>
        <h1 className="font-serif text-4xl sm:text-5xl mb-4">إجابات سريعة وواضحة</h1>
        <p className="text-muted-foreground mb-10">إن لم تجدي إجابة لسؤالك هنا، <Link to="/contact" className="text-gold underline">تواصلي معنا</Link>.</p>

        <h2 className="font-serif text-2xl mb-4">للعميلات</h2>
        <Accordion type="single" collapsible className="mb-10">
          {clientQ.map((q, i) => (
            <AccordionItem key={i} value={`c-${i}`}>
              <AccordionTrigger className="text-right">{q.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-loose">{q.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <h2 className="font-serif text-2xl mb-4">للمصوّرات</h2>
        <Accordion type="single" collapsible>
          {photographerQ.map((q, i) => (
            <AccordionItem key={i} value={`p-${i}`}>
              <AccordionTrigger className="text-right">{q.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-loose">{q.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
      <Footer />
    </div>
  );
}