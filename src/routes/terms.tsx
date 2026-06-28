import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "الشروط والأحكام — Memoria" },
      { name: "description", content: "شروط استخدام منصة Memoria لحجوزات مصوّرات الأعراس في الأردن: الحجز، العربون، الإلغاء، والتسليم." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-editorial py-12 max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">الشروط والأحكام</div>
        <h1 className="font-serif text-4xl mb-4">الشروط والأحكام</h1>
        <p className="text-sm text-muted-foreground mb-8">آخر تحديث: {new Date().toLocaleDateString("ar-JO")}</p>

        <section className="space-y-6 leading-loose">
          <Block t="1. طبيعة المنصة">
            Memoria منصة تنظيمية تربط العميلات بمصوّرات الأعراس في الأردن. المنصة ليست طرفاً في عقد التصوير نفسه؛ العقد يُبرم مباشرة بين العميلة والمصوّرة.
          </Block>
          <Block t="2. الحجز والعربون">
            يُعتبر الحجز مؤكَّداً فقط بعد تحويل العربون المتفق عليه ورفع إثبات الدفع. يحق للمصوّرة قبول أو رفض الطلب خلال 48 ساعة من استلامه.
          </Block>
          <Block t="3. الإلغاء والاسترجاع">
            تختلف سياسة الاسترجاع حسب كل مصوّرة (كامل/جزئي/غير قابل للاسترجاع) وتُعرض بوضوح قبل الحجز. عند الإلغاء يتم تطبيق السياسة المعلنة وتُعاد الأموال المؤهَّلة خلال 7–14 يوم عمل.
          </Block>
          <Block t="4. التسليم">
            تلتزم المصوّرة بمدة التسليم المتفق عليها في العقد. في حال التأخير غير المبرَّر، للمنصة الحق في التدخل والتوسط.
          </Block>
          <Block t="5. حقوق الصور والخصوصية">
            حقوق الملكية الفكرية للصور تعود للمصوّرة، أما حق الاستخدام الشخصي فيعود للعميلة. النشر التسويقي مشروط باختيار العميلة "صور قابلة للنشر" عند الحجز.
          </Block>
          <Block t="6. سلوك المستخدم">
            يُمنع منعاً باتاً استخدام المنصة لأي أغراض غير مشروعة، نشر محتوى مسيء، أو محاولة التحايل لتجاوز رسوم المنصة.
          </Block>
          <Block t="7. المسؤولية">
            تبذل المنصة أقصى جهدها للتحقق من المصوّرات، لكنها لا تتحمل مسؤولية مباشرة عن جودة الخدمة. في حال أي نزاع، نعمل كوسيط محايد لإيجاد حل عادل.
          </Block>
          <Block t="8. التعديل على الشروط">
            يحق للمنصة تحديث هذه الشروط في أي وقت، وسيتم إخطار المستخدمين بالتغييرات الجوهرية.
          </Block>
          <Block t="9. القانون المُطبَّق">
            تخضع هذه الشروط لأحكام القانون الأردني، وتختص محاكم عمّان بالنظر في أي نزاع.
          </Block>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Block({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-serif text-xl mb-2">{t}</h2>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}