import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "سياسة الإلغاء — Memoria · ميموريا" },
      { name: "description", content: "العربون والاشتراك غير قابلين للاسترداد. كيف يعمل الإلغاء على منصّة ميموريا ومن المسؤول عن ماذا." },
      { property: "og:title", content: "سياسة الإلغاء والاسترداد — Memoria" },
      { property: "og:description", content: "العربون والاشتراك غير قابلين للاسترداد، والدفع مباشر للمصوّرة." },
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
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">سياسة الإلغاء والاسترداد</div>
        <h1 className="font-serif text-4xl mb-4">سياسة الإلغاء والاسترداد</h1>
        <p className="text-sm text-muted-foreground mb-8">آخر تحديث: {new Date().toLocaleDateString("ar-JO")}</p>

        <section className="space-y-6 leading-loose">
          <Block t="1. مبدأ عام">
            ميموريا منصّة تنظيمية لإدارة الحجوزات. <strong>المنصّة لا تستلم أموال الحجز ولا تحتفظ بها</strong>؛ العربون يُحوَّل مباشرة من العميلة إلى حساب المصوّرة (CliQ أو تحويل بنكي)، والعقد يُبرم مباشرة بينهما.
          </Block>
          <Block t="2. العربون غير قابل للاسترداد">
            العربون يثبّت الموعد ويحجز اليوم باسمكِ، لذلك <strong>لا يُسترد في حال الإلغاء من قِبل العميلة</strong>. يمكنكِ الإلغاء دون أي التزام قبل تحويل العربون.
          </Block>
          <Block t="3. إلغاء من قِبل المصوّرة">
            إذا ألغت المصوّرة حجزاً مؤكَّداً، فإعادة العربون مسؤوليتها المباشرة تجاهكِ لأن المبلغ في حسابها. دور المنصّة: توثيق الحجز وإثبات التحويل وسجلّ الرسائل، والتواصل مع المصوّرة، وتعليق ملفها أو إزالته عند الإخلال.
          </Block>
          <Block t="4. اشتراكات المصوّرات">
            رسوم الاشتراك في المنصّة <strong>غير قابلة للاسترداد</strong> بعد الدفع، ويبقى الاشتراك فعّالاً حتى نهاية المدة المدفوعة.
          </Block>
          <Block t="5. الشكاوى">
            لأي خلاف تواصلي معنا عبر <Link to="/contact" className="text-gold underline">صفحة التواصل</Link> مع رقم الحجز، ويردّ فريقنا خلال 48 ساعة عمل.
          </Block>
          <Block t="6. التغييرات على هذه السياسة">
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