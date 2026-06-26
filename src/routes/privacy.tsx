import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — EliteCapture" },
      { name: "description", content: "كيف نجمع بياناتك ونستخدمها ونحميها على منصة EliteCapture لحجوزات مصوّرات الأعراس في الأردن." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-editorial py-12 max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">سياسة الخصوصية</div>
        <h1 className="font-serif text-4xl mb-4">خصوصيتكِ أمانة</h1>
        <p className="text-sm text-muted-foreground mb-8">آخر تحديث: {new Date().toLocaleDateString("ar-JO")}</p>

        <section className="prose prose-sm dark:prose-invert max-w-none space-y-6 leading-loose">
          <Block t="1. البيانات التي نجمعها">
            عند إرسال طلب حجز نجمع: الاسم، رقم الهاتف، البريد الإلكتروني، تاريخ المناسبة، موقعها، تفاصيل الباقة، وملاحظاتكِ. عند رفع إثبات الدفع نخزّن الصورة في تخزين آمن مرتبط بحجزكِ فقط.
          </Block>
          <Block t="2. كيف نستخدم البيانات">
            تُستخدم البيانات حصراً لمعالجة الحجز، التواصل بينكِ وبين المصوّرة، إصدار العقد والفواتير، وإرسال إشعارات التذكير. لا نبيع بياناتكِ ولا نشاركها مع أي طرف ثالث لأغراض تسويقية.
          </Block>
          <Block t="3. مستوى الخصوصية للصور">
            تختارين عند الحجز إما "صور قابلة للنشر" (يحق للمصوّرة استخدام لقطات للترويج) أو "خصوصية تامة" (لا تُنشر صوركِ في أي مكان). يلتزم النظام بهذا الخيار تقنياً وقانونياً.
          </Block>
          <Block t="4. المدفوعات">
            عند الدفع الإلكتروني نعتمد على بوابات دفع موثوقة (Stripe). لا نخزّن أرقام البطاقات على خوادمنا.
          </Block>
          <Block t="5. الاحتفاظ بالبيانات">
            نحتفظ ببيانات الحجز لمدة لا تتجاوز سنتين بعد تاريخ المناسبة لأغراض المحاسبة والمراجعة، ثم تُحذف نهائياً. يمكنكِ طلب الحذف المبكر عبر التواصل معنا.
          </Block>
          <Block t="6. حقوقكِ">
            لكِ الحق في الاطلاع على بياناتكِ، تصحيحها، أو طلب حذفها في أي وقت. تواصلي معنا عبر البريد المسجّل على المنصة.
          </Block>
          <Block t="7. الأمان">
            نستخدم تشفير HTTPS، صلاحيات قاعدة بيانات صارمة (Row-Level Security)، وروابط تتبع موقّتة لحماية وصول كل طرف لبياناته فقط.
          </Block>
          <Block t="8. الكوكيز">
            نستخدم كوكيز تقنية لتسجيل الدخول وحفظ التفضيلات فقط — لا كوكيز إعلانية ولا تتبع لجهات خارجية.
          </Block>
          <Block t="9. التواصل">
            لأي استفسار حول الخصوصية: راسلينا عبر صفحة الدعم.
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