import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { t as tr, tx, locale } from "@/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: tr("سياسة الخصوصية — Memoria") },
      { name: "description", content: tr("كيف نجمع بياناتك ونستخدمها ونحميها على منصة Memoria لحجوزات مصوّرات الأعراس في الأردن.") },
    ],
    links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-editorial py-12 max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">{tr("سياسة الخصوصية")}</div>
        <h1 className="font-serif text-4xl mb-4">{tr("خصوصيتكِ أمانة")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{tr("آخر تحديث: {0}", [new Date("2026-10-27").toLocaleDateString(locale("ar-JO"))])}</p>

        <section className="prose prose-sm dark:prose-invert max-w-none space-y-6 leading-loose">
          <Block t={tr("1. البيانات التي نجمعها")}>
            {tr("عند إرسال طلب حجز نجمع: الاسم، رقم الهاتف، البريد الإلكتروني، تاريخ المناسبة، موقعها، تفاصيل الباقة، وملاحظاتكِ. عند رفع إثبات الدفع نخزّن الصورة في تخزين آمن مرتبط بحجزكِ فقط.")}
          </Block>
          <Block t={tr("2. كيف نستخدم البيانات")}>
            {tr("تُستخدم البيانات حصراً لمعالجة الحجز، التواصل بينكِ وبين المصوّرة، إصدار العقد والفواتير، وإرسال إشعارات التذكير. لا نبيع بياناتكِ ولا نشاركها مع أي طرف ثالث لأغراض تسويقية.")}
          </Block>
          <Block t={tr("3. مستوى الخصوصية للصور")}>
            {tr("تختارين عند الحجز إما \"صور قابلة للنشر\" (يحق للمصوّرة استخدام لقطات للترويج) أو \"خصوصية تامة\" (لا تُنشر صوركِ في أي مكان). يلتزم النظام بهذا الخيار تقنياً وقانونياً.")}
          </Block>
          <Block t={tr("4. المدفوعات")}>
            {tr("العربون يُحوَّل مباشرة للمصوّرة عبر CliQ أو التحويل البنكي، ونخزّن فقط صورة إثبات التحويل. اشتراكات المصوّرات تُدفع عبر بوابات دفع خارجية، ولا نخزّن أرقام البطاقات على خوادمنا.")}
          </Block>
          <Block t={tr("5. الاحتفاظ بالبيانات")}>
            {tr("نحتفظ ببيانات الحجز لمدة لا تتجاوز سنتين بعد تاريخ المناسبة لأغراض المحاسبة والمراجعة، ثم تُحذف نهائياً. يمكنكِ طلب الحذف المبكر عبر التواصل معنا.")}
          </Block>
          <Block t={tr("6. حقوقكِ")}>
            {tr("لكِ الحق في الاطلاع على بياناتكِ، تصحيحها، أو طلب حذفها في أي وقت. تواصلي معنا عبر البريد المسجّل على المنصة.")}
          </Block>
          <Block t={tr("7. الأمان")}>
            {tr("نستخدم تشفير HTTPS، صلاحيات قاعدة بيانات صارمة (Row-Level Security)، وروابط تتبع موقّتة لحماية وصول كل طرف لبياناته فقط.")}
          </Block>
          <Block t={tr("8. الكوكيز")}>
            {tr("نستخدم كوكيز تقنية لتسجيل الدخول وحفظ التفضيلات فقط — لا كوكيز إعلانية ولا تتبع لجهات خارجية.")}
          </Block>
          <Block t={tr("9. التواصل")}>
            {tr("لأي استفسار حول الخصوصية: راسلينا عبر صفحة الدعم.")}
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