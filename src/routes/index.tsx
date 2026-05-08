import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, MessageSquareOff, Receipt, ShieldCheck, Sparkles, Star } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import heroImg from "@/assets/hero-bride.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-editorial grid gap-10 lg:grid-cols-2 items-center pt-10 lg:pt-20 pb-16">
          <div className="order-2 lg:order-1 space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs tracking-wide">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              منصّة الحجوزات الأكثر فخامة لمصوّري الأعراس في الأردن
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.1]">
              من النقرة الأولى
              <br />
              إلى <span className="text-gold italic">الذكرى الأبدية</span>.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              احجز مصوّر عرسك خلال دقائق. أسعار شفافة، مواعيد متاحة لحظيًا، عربون آمن — بدون رسائل واتساب لا تنتهي.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/search"
                className="inline-flex items-center gap-2 bg-charcoal text-ivory px-6 py-3 rounded-sm shadow-elegant hover:opacity-90 transition"
              >
                ابحث عن مصوّر
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <Link
                to="/photographers/join"
                className="inline-flex items-center gap-2 border border-charcoal/80 px-6 py-3 rounded-sm hover:bg-charcoal hover:text-ivory transition"
              >
                أنا مصوّر — انضم
              </Link>
            </div>
            <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1"><Star className="h-4 w-4 fill-gold text-gold" /> ٤.٩ تقييم المصوّرين</div>
              <div className="hidden sm:block">+١٢٠ مصوّر معتمد</div>
            </div>
          </div>

          <div className="order-1 lg:order-2 relative">
            <div className="absolute -inset-4 bg-gradient-royal rounded-sm -z-10" />
            <img
              src={heroImg}
              alt="عروس في إطلالة سينمائية"
              width={1080}
              height={1600}
              className="w-full h-[480px] sm:h-[560px] object-cover rounded-sm shadow-elegant"
            />
            <div className="absolute -bottom-6 -start-6 sm:-start-10 bg-card border border-border rounded-sm p-4 shadow-soft max-w-[260px]">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">سعر فوري</div>
              <div className="font-serif text-2xl">٣٢٠ <span className="text-sm">د.أ</span></div>
              <div className="text-xs text-muted-foreground">٤ ساعات تصوير + ٥٠ صورة معدّلة</div>
            </div>
          </div>
        </div>
      </section>

      {/* Role chooser */}
      <section className="container-editorial py-16">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">ابدأ من هنا</div>
          <h2 className="font-serif text-3xl sm:text-4xl">من أنت؟</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          <RoleCard
            title="عميل / عريس"
            desc="ابحث عن مصوّرك المفضّل، شاهد المواعيد المتاحة، واحجز فورًا."
            cta="ابحث عن مصوّر"
            href="/search"
          />
          <RoleCard
            title="مصوّر محترف"
            desc="أنشئ ملفك، حدّد أسعارك واربط تقويمك — ودع النظام يدير حجوزاتك."
            cta="انضم إلى المنصة"
            href="/photographers/join"
            highlight
          />
        </div>
      </section>

      {/* How */}
      <section id="how" className="container-editorial py-16">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">سير العمل</div>
          <h2 className="font-serif text-3xl sm:text-4xl">حلّ كامل لكل مشكلة</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={MessageSquareOff} title="بدون واتساب" desc="جميع التفاصيل تُدخل عبر النموذج: الموقع، الوقت، نوع التصوير." />
          <Feature icon={Calendar} title="تقويم ذكي" desc="مزامنة Google Calendar مع فاصل ساعتين بين الجلسات لمراعاة الازدحام." />
          <Feature icon={Receipt} title="سعر فوري" desc="حاسبة ديناميكية تشمل الساعات، الإضافات، ورسوم التنقّل بالكيلومتر." />
          <Feature icon={ShieldCheck} title="عربون آمن" desc="تأكيد الحجز برفع إثبات تحويل CliQ ومصادقة المصوّر." />
        </div>
      </section>

      <Footer />
    </div>
  );
}

function RoleCard({ title, desc, cta, href, highlight }: { title: string; desc: string; cta: string; href: string; highlight?: boolean }) {
  return (
    <Link
      to={href}
      className={`group block rounded-sm border p-8 transition-all hover:shadow-elegant ${
        highlight ? "bg-charcoal text-ivory border-charcoal" : "bg-card border-border"
      }`}
    >
      <div className={`text-xs uppercase tracking-[0.25em] mb-3 ${highlight ? "text-gold" : "text-muted-foreground"}`}>
        {highlight ? "للمصوّرين" : "للعملاء"}
      </div>
      <h3 className="font-serif text-2xl mb-2">{title}</h3>
      <p className={`text-sm leading-relaxed mb-6 ${highlight ? "text-ivory/70" : "text-muted-foreground"}`}>{desc}</p>
      <div className="inline-flex items-center gap-2 text-sm border-b border-current pb-0.5 group-hover:gap-3 transition-all">
        {cta} <ArrowLeft className="h-4 w-4" />
      </div>
    </Link>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Calendar; title: string; desc: string }) {
  return (
    <div className="rounded-sm border border-border bg-card p-6 shadow-soft">
      <div className="grid h-10 w-10 place-items-center rounded-sm bg-secondary mb-4">
        <Icon className="h-5 w-5 text-gold" />
      </div>
      <div className="font-serif text-lg mb-1">{title}</div>
      <div className="text-sm text-muted-foreground leading-relaxed">{desc}</div>
    </div>
  );
}
