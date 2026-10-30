import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { t as tr, tx, locale } from "@/i18n";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: tr("سياسة الإلغاء — Memoria · ميموريا") },
      { name: "description", content: tr("كيف يعمل الإلغاء على منصّة ميموريا: العربون حسب سياسة كل مصوّرة، والاشتراك غير قابل للاسترداد.") },
      { property: "og:title", content: tr("سياسة الإلغاء والاسترداد — Memoria") },
      { property: "og:description", content: tr("العربون يُدفع مباشرة للمصوّرة ويُسترد حسب سياستها المعلنة، والاشتراك غير قابل للاسترداد.") },
      { property: "og:url", content: "https://memoria-production.ahmad000haddad.workers.dev/refund-policy" },
    ],
    links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/refund-policy" }],
  }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-editorial py-12 max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">{tr("سياسة الإلغاء والاسترداد")}</div>
        <h1 className="font-serif text-4xl mb-4">{tr("سياسة الإلغاء والاسترداد")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{tr("آخر تحديث: {0}", [new Date().toLocaleDateString(locale("ar-JO"))])}</p>

        <section className="space-y-6 leading-loose">
          <Block t={tr("1. مبدأ عام")}>
            {tr("ميموريا منصّة تنظيمية لإدارة الحجوزات.")}{" "}<strong>{tr("المنصّة لا تستلم أموال الحجز ولا تحتفظ بها")}</strong>{tr("؛ العربون يُحوَّل مباشرة من العميلة إلى حساب المصوّرة (CliQ أو تحويل بنكي)، والعقد يُبرم مباشرة بينهما.")}
          </Block>
          <Block t={tr("2. إلغاء من قِبل العميلة")}>
            {tr("قبل تحويل العربون تلغين دون أي التزام. بعد التحويل")}{" "}<strong>{tr("يُطبَّق ما أعلنته المصوّرة في صفحتها")}</strong>{tr(": لا يُرجَع العربون، أو يُرجَع جزء منه، أو يُرجَع كاملاً. تظهر لكِ هذه السياسة وتوافقين عليها قبل التحويل، وتُكتب في عقد الحجز.")}
          </Block>
          <Block t={tr("3. إلغاء من قِبل المصوّرة")}>
            {tr("إذا ألغت المصوّرة حجزاً مؤكَّداً، فإعادة العربون مسؤوليتها المباشرة تجاهكِ لأن المبلغ في حسابها. دور المنصّة: توثيق الحجز وإثبات التحويل وسجلّ الرسائل، والتواصل مع المصوّرة، وتعليق ملفها أو إزالته عند الإخلال.")}
          </Block>
          <Block t={tr("4. اشتراكات المصوّرات")}>
            {tr("رسوم الاشتراك في المنصّة")}{" "}<strong>{tr("غير قابلة للاسترداد")}</strong>{" "}{tr("بعد الدفع، ويبقى الاشتراك فعّالاً حتى نهاية المدة المدفوعة.")}
          </Block>
          <Block t={tr("5. الشكاوى")}>
            {tr("لأي خلاف تواصلي معنا عبر")}{" "}<Link to="/contact" className="text-gold underline">{tr("صفحة التواصل")}</Link>{" "}{tr("مع رقم الحجز، ويردّ فريقنا خلال 48 ساعة عمل.")}
          </Block>
          <Block t={tr("6. التغييرات على هذه السياسة")}>
            {tr("يحق للمنصّة تحديث هذه السياسة، ولا تنطبق التغييرات بأثر رجعي على الحجوزات السابقة.")}
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
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}