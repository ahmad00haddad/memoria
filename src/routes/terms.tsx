import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { t as tr, tx, locale } from "@/i18n";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: tr("الشروط والأحكام — Memoria") },
      { name: "description", content: tr("شروط استخدام منصة Memoria لحجوزات مصوّرات الأعراس في الأردن: الحجز، العربون، الإلغاء، والتسليم.") },
    ],
    links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-editorial py-12 max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">{tr("الشروط والأحكام")}</div>
        <h1 className="font-serif text-4xl mb-4">{tr("الشروط والأحكام")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{tr("آخر تحديث: {0}", [new Date().toLocaleDateString(locale("ar-JO"))])}</p>

        <section className="space-y-6 leading-loose">
          <Block t={tr("1. طبيعة المنصة")}>
            {tr("Memoria منصة تنظيمية تربط العميلات بمصوّرات الأعراس في الأردن. المنصة ليست طرفاً في عقد التصوير نفسه؛ العقد يُبرم مباشرة بين العميلة والمصوّرة.")}
          </Block>
          <Block t={tr("2. الحجز والعربون")}>
            {tr("للمصوّرة 24 ساعة من وصول الطلب لتقبله أو ترفضه، وإلا يُلغى تلقائياً. بعد قبولها تحوّل العميلة العربون خلال 48 ساعة وترفع إثبات التحويل. يُعتبر الحجز مؤكَّداً فقط بعد أن تؤكّد المصوّرة وصول العربون لحسابها.")}
          </Block>
          <Block t={tr("3. الإلغاء والمدفوعات")}>
            {tr("العربون يُحوَّل مباشرة لحساب المصوّرة ولا يمرّ عبر المنصّة. إذا ألغت العميلة بعد التحويل يُطبَّق ما أعلنته المصوّرة في صفحتها (لا يُرجَع، أو جزء منه، أو كاملاً)، وتوافق العميلة عليه قبل التحويل. إذا ألغت المصوّرة تُرجع العربون كاملاً. رسوم اشتراك المصوّرات غير قابلة للاسترداد. التفاصيل في سياسة الإلغاء.")}
          </Block>
          <Block t={tr("4. التسليم")}>
            {tr("تلتزم المصوّرة بمدة التسليم المتفق عليها في العقد. في حال التأخير غير المبرَّر يمكن تقديم شكوى، وللمنصة حق تعليق ملف المصوّرة.")}
          </Block>
          <Block t={tr("5. حقوق الصور والخصوصية")}>
            {tr("حقوق الملكية الفكرية للصور تعود للمصوّرة، أما حق الاستخدام الشخصي فيعود للعميلة. النشر التسويقي مشروط باختيار العميلة \"صور قابلة للنشر\" عند الحجز.")}
          </Block>
          <Block t={tr("6. سلوك المستخدم")}>
            {tr("يُمنع منعاً باتاً استخدام المنصة لأي أغراض غير مشروعة، نشر محتوى مسيء، أو محاولة التحايل لتجاوز رسوم المنصة.")}
          </Block>
          <Block t={tr("7. المسؤولية")}>
            {tr("تبذل المنصة أقصى جهدها للتحقق من المصوّرات، لكنها لا تتحمل مسؤولية مباشرة عن جودة الخدمة. في حال أي نزاع، نعمل كوسيط محايد لإيجاد حل عادل.")}
          </Block>
          <Block t={tr("8. التعديل على الشروط")}>
            {tr("يحق للمنصة تحديث هذه الشروط في أي وقت، وسيتم إخطار المستخدمين بالتغييرات الجوهرية.")}
          </Block>
          <Block t={tr("9. القانون المُطبَّق")}>
            {tr("تخضع هذه الشروط لأحكام القانون الأردني، وتختص محاكم عمّان بالنظر في أي نزاع.")}
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
      <h2 className="font-serif text-xl mb-2">{tx(t)}</h2>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}