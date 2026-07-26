import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Camera, Heart, Shield, MapPin, Mail } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن — Memoria · ميموريا" },
      { name: "description", content: "ميموريا منصّة أردنية متخصّصة في تنظيم حجوزات مصوّرات الأعراس. تعرّفي على قصّتنا، رؤيتنا، والكيان الذي يقف خلف المنصّة." },
      { property: "og:title", content: "من نحن — Memoria · ميموريا" },
      { property: "og:description", content: "قصّة ميموريا: لماذا بدأنا، وما الذي نؤمن به." },
      { property: "og:url", content: "https://memoria-jo.lovable.app/about" },
    ],
    links: [{ rel: "canonical", href: "https://memoria-jo.lovable.app/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-editorial py-16 max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">من نحن</div>
        <h1 className="font-serif text-4xl sm:text-5xl mb-6">ذاكرة يومكِ، تُحفظ بأمان.</h1>
        <p className="text-lg text-muted-foreground leading-loose mb-12">
          ميموريا منصّة أردنية متخصّصة، أُسّست لتنظيم رحلة حجز مصوّرات الأعراس من البحث حتى التسليم —
          بعيداً عن فوضى الرسائل، الأسعار الغامضة، والمواعيد المتداخلة.
        </p>

        <section className="space-y-10">
          <Block icon={Heart} title="لماذا بدأنا">
            لأن حجز مصوّرة عرس في الأردن كان يعتمد على واتساب، توصيات متفرّقة، وأسعار غير واضحة. أردنا أن
            نمنح العروس أداة موثوقة تُريها الخيارات الحقيقية، التوفّر الفعلي، والسياسات بوضوح — وأن نمنح
            المصوّرة لوحة عمل احترافية تختصر يومها.
          </Block>

          <Block icon={Shield} title="ما نؤمن به">
            الثقة قبل الإبهار. كل وعد على المنصّة يقابله إثبات أو سياسة أو منطق حقيقي. لا نعرض ادعاءات
            غير قابلة للإثبات، ولا تقييمات وهمية، ولا أرقاماً تجميلية.
          </Block>

          <Block icon={Camera} title="ما نقدّمه">
            دليل مصوّرات موثّقات، نظام حجز متعدد الخطوات، عقود رقمية، تتبّع للحجز، وقوالب رسائل بالعربية.
            المنصّة <strong>مجّانية تماماً للعميلة</strong>، والمصوّرات يشتركن باشتراك شهري ثابت.
          </Block>
        </section>

        <section className="mt-16 rounded-2xl border border-border/60 bg-card p-8">
          <h2 className="font-serif text-2xl mb-6">الكيان والتواصل</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3"><MapPin className="h-4 w-4 mt-1 text-gold" /><span>عمّان، المملكة الأردنية الهاشمية</span></li>
            <li className="flex items-start gap-3"><Mail className="h-4 w-4 mt-1 text-gold" /><a href="mailto:ahmad000haddad@gmail.com" className="hover:text-gold">ahmad000haddad@gmail.com</a></li>
          </ul>
          <div className="mt-6 flex gap-3">
            <Link to="/contact" className="text-sm rounded-md border border-border/60 px-4 py-2 hover:bg-secondary">تواصلي معنا</Link>
            <Link to="/for-photographers" className="text-sm rounded-md bg-primary text-primary-foreground px-4 py-2 hover:opacity-90">للمصوّرات</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Block({ icon: Icon, title, children }: { icon: typeof Heart; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 grid h-10 w-10 place-items-center rounded-md bg-secondary"><Icon className="h-4 w-4 text-gold" /></div>
      <div>
        <h3 className="font-serif text-xl mb-2">{title}</h3>
        <p className="text-muted-foreground leading-loose">{children}</p>
      </div>
    </div>
  );
}