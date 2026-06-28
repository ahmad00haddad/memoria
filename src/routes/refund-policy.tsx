import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "سياسة الإلغاء والاسترداد — Memoria · ميموريا" },
      { name: "description", content: "كيف يعمل الإلغاء واسترداد العربون على منصّة ميموريا، حقوقكِ وحقوق المصوّرة، والمواعيد الزمنية المُعتمدة." },
      { property: "og:title", content: "سياسة الإلغاء والاسترداد — Memoria" },
      { property: "og:description", content: "سياسة واضحة لإلغاء الحجوزات واسترداد العربون." },
      { property: "og:url", content: "https://royal-lens-flow.lovable.app/refund-policy" },
    ],
    links: [{ rel: "canonical", href: "https://royal-lens-flow.lovable.app/refund-policy" }],
  }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-editorial py-12 max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">سياسة الإلغاء والاسترداد</div>
        <h1 className="font-serif text-4xl mb-4">سياسة الإلغاء والاسترداد</h1>
        <p className="text-sm text-muted-foreground mb-8">آخر تحديث: {new Date().toLocaleDateString("ar-JO")}</p>

        <section className="space-y-6 leading-loose">
          <Block t="1. مبدأ عام">
            ميموريا منصّة تنظيمية، والعقد يُبرم مباشرة بين العميلة والمصوّرة. لكلّ مصوّرة سياستها المُعلنة التي تظهر بوضوح في صفحتها وقبل تأكيد الحجز.
          </Block>
          <Block t="2. أنواع سياسات الاسترداد">
            تختار كل مصوّرة واحدة من ثلاث سياسات:
            <ul className="list-disc pr-6 mt-2 space-y-1">
              <li><strong>كامل (Full):</strong> استرداد كامل للعربون عند الإلغاء وفق المهلة المحدّدة.</li>
              <li><strong>جزئي (Partial):</strong> استرداد نسبة معلنة من العربون (مثلاً 50٪).</li>
              <li><strong>غير قابل للاسترداد (Non-refundable):</strong> العربون يثبّت الموعد ولا يُعاد.</li>
            </ul>
          </Block>
          <Block t="3. إلغاء من قِبل العميلة">
            <ul className="list-disc pr-6 space-y-1">
              <li>قبل تأكيد المصوّرة للحجز: يمكنكِ الإلغاء دون أي خصم.</li>
              <li>بعد التأكيد ودفع العربون: تُطبَّق سياسة المصوّرة المُعلنة.</li>
              <li>قبل المناسبة بأقل من 7 أيام: عادةً لا يُسترد العربون حفاظاً على حق المصوّرة في تعويض الموعد.</li>
            </ul>
          </Block>
          <Block t="4. إلغاء من قِبل المصوّرة">
            إذا ألغت المصوّرة الحجز بعد تأكيده، يحقّ لكِ استرداد كامل العربون فوراً، وقد تتدخّل المنصّة لإيجاد بديل مناسب.
          </Block>
          <Block t="5. المواعيد الزمنية لاسترداد المبالغ">
            عند استحقاق الاسترداد، تُعاد الأموال خلال <strong>7–14 يوم عمل</strong> عبر نفس طريقة الدفع الأصلية.
          </Block>
          <Block t="6. الحالات الاستثنائية (القوّة القاهرة)">
            في حال وجود ظروف قاهرة (وفاة، حادث، حالة طبية موثّقة، أو منع رسمي)، تتدخّل المنصّة كوسيط محايد لإيجاد حلّ عادل للطرفين قد يشمل تأجيل الموعد أو استرداداً استثنائياً.
          </Block>
          <Block t="7. النزاعات">
            إذا لم يُتفق على حلّ، يمكن رفع شكوى عبر <Link to="/contact" className="text-gold underline">صفحة التواصل</Link>، ويردّ فريقنا خلال 48 ساعة عمل.
          </Block>
          <Block t="8. التغييرات على هذه السياسة">
            يحق للمنصّة تحديث هذه السياسة، ولا تنطبق التغييرات بأثر رجعي على الحجوزات السابقة.
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
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}