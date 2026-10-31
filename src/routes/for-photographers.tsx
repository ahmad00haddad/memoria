import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { RevealWords, RiseIn } from "@/components/site/Reveal";
import { Calendar, DollarSign, FileSignature, MessageCircle, ListChecks, BarChart3, Bell, Share2, Camera, Image as ImageIcon, Lock, Smartphone, Globe, Sparkles, ArrowLeft, Wallet, ShieldCheck, Users } from "lucide-react";
import { useAuthState } from "@/hooks/use-auth-state";
import { t, tx } from "@/i18n";

export const Route = createFileRoute("/for-photographers")({
  head: () => ({
    meta: [
      { title: t("للمصوّرات — انضمي إلى Memoria | إدارة كاملة لأعمال التصوير") },
      { name: "description", content: t("صفحة عامة احترافية، نظام حجوزات، عقود رقمية، تذكيرات تلقائية، قوالب واتساب جاهزة، تقارير مالية، ومزامنة Google Calendar — كل ما تحتاجينه لإدارة استوديوك من مكان واحد.") },
      { property: "og:title", content: t("للمصوّرات — انضمي إلى Memoria") },
      { property: "og:description", content: t("نظام إدارة كامل لأعمال مصوّرات الأعراس.") },
    ],
    links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/for-photographers" }],
  }),
  component: ForPhotographersPage,
});

const FEATURES = [
  { icon: Globe, title: "صفحة عامة احترافية", desc: "صفحة بِرابط خاص (@username) تعرضين فيها أعمالك، باقاتك، وتقييماتك — جاهزة للمشاركة على إنستغرام والواتساب." },
  { icon: Calendar, title: "تقويم وتوفّر ذكي", desc: "احجبي الأيام غير المتاحة بنقرة. التقويم يظهر للعميل فوراً، فلا تستلمين طلبات في أيام ممتلئة." },
  { icon: ListChecks, title: "نظام حجوزات كامل", desc: "كل حجز يمرّ بمراحل واضحة: طلب → موافقتكِ خلال 24 ساعة → عربون → تأكيد → تصوير → تحرير → تسليم. لا تضيع طلبية." },
  { icon: FileSignature, title: "عقود رقمية بتوقيع إلكتروني (Pro)", desc: "قوالب عقود جاهزة بالعربية، يوقّعها العميل من الجوال، ويُحفظ مع كل توقيع تاريخه وعنوان IP." },
  { icon: Wallet, title: "إدارة عربون CliQ", desc: "العميل يحوّل العربون ويرفع الإثبات. تستلمين إشعار فوري، تراجعين وتؤكّدين بنقرة." },
  { icon: MessageCircle, title: "قوالب واتساب جاهزة (Pro)", desc: "٦ قوالب جاهزة (ترحيب، طلب عربون، تذكير، تسليم...) بمتغيّرات تلقائية {{اسم العميل}} {{التاريخ}} — توفّر ساعات." },
  { icon: BarChart3, title: "تقارير مالية شفّافة (Pro)", desc: "إيراداتك الشهرية، حسب الخدمة، حسب الحالة. تصدير CSV لمحاسبك أو سجلاتك الضريبية." },
  { icon: Camera, title: "لوحة متابعة الإنتاج (Kanban)", desc: "اسحبي كل حجز بين المراحل: بانتظار الجلسة، تصوير، اختيار، تحرير، جاهز للتسليم. سهلة من الهاتف." },
  { icon: ImageIcon, title: "معرض تسليم خاص بالعميل", desc: "ارفعي الصور النهائية في معرض محمي. العميل يحمّلها برابطه الخاص فقط — مع علامة مائية اختيارية." },
  { icon: Bell, title: "تذكيرات تلقائية بالبريد", desc: "تذكير العميل قبل الموعد، تذكيرك بمواعيد التسليم، تنبيه عند انتهاء صلاحية رابط التتبّع." },
  { icon: Share2, title: "مزامنة Google Calendar", desc: "اربطي تقويمك بنقرة: نحجب أيامك المشغولة تلقائياً، وتظهر حجوزاتك في تقويم هاتفك." },
  { icon: Users, title: "برنامج إحالة مربح", desc: "ادعي زميلة لتنضم: عند أول اشتراك مدفوع لها يُضاف ١٤ يوماً مجاناً لاشتراكك." },
  { icon: Lock, title: "خصوصية بيانات الدفع", desc: "CliQ ورقمكِ يظهران للعروس فقط بعد موافقتكِ على طلبها — لا للعموم." },
  { icon: ShieldCheck, title: "روابط تتبّع آمنة بصلاحية محدودة", desc: "كل رابط حجز للعميل صالح ٩٠ يوماً فقط، وقابل للتجديد بنقرة — حماية من تسريب الروابط القديمة." },
  { icon: Smartphone, title: "يعمل على الجوال أثناء الأعراس", desc: "كل اللوحات مصمّمة للهاتف أولاً — حدّثي حالة حجز أو ردّي على عميل وأنتِ في موقع التصوير." },
  { icon: Sparkles, title: "تجربة مجانية ١٤ يوم", desc: "ابدئي بدون بطاقة. جرّبي كل المميزات بحجوزات حقيقية. اشتركي فقط إذا أعجبكِ النظام." },
];

function ForPhotographersPage() {
  const { authed, isPhotographer } = useAuthState();
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="container-editorial py-16 sm:py-24 text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">{t("للمصوّرات")}</div>
          <h1 className="font-serif text-4xl sm:text-5xl leading-tight mb-4">
            <RevealWords lines={[t("إدارة كاملة لاستوديوكِ"), t("من مكان واحد")]} />
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("Memoria ليست فقط منصّة عرض — بل نظام إدارة متكامل صُمّم خصيصاً لمصوّرات الأعراس في الأردن. حجوزات، عقود، عرابين، تسليم صور، تقارير، وقوالب واتساب — كل ذلك بالعربية ومن هاتفكِ.")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {authed && isPhotographer ? (
              <Link to="/dashboard" className="bg-charcoal text-ivory px-6 py-3 rounded-sm hover:opacity-90 inline-flex items-center gap-2">
                {t("انتقلي إلى لوحة التحكم")}{" "}<ArrowLeft className="h-4 w-4" />
              </Link>
            ) : (
              <Link to="/photographers/join" className="bg-charcoal text-ivory px-6 py-3 rounded-sm hover:opacity-90 inline-flex items-center gap-2">
                {t("انضمّي مجاناً ١٤ يوم")}{" "}<ArrowLeft className="h-4 w-4" />
              </Link>
            )}
            <Link to="/pricing" className="border border-border px-6 py-3 rounded-sm hover:bg-secondary">{t("شاهدي خطط الاشتراك")}</Link>
          </div>
        </section>

        <section className="container-editorial pb-16">
          <div className="text-center mb-12">
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">{t("المميّزات")}</div>
            <h2 className="font-serif text-3xl sm:text-4xl">{t("١٦ ميزة قوية تُسهّل عملكِ")}</h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-xl mx-auto">{t("صُمّمت كل ميزة بناءً على احتياج حقيقي لمصوّرات يعملن فعلياً في السوق الأردني.")}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <RiseIn key={f.title} index={i}>
                <div className="group h-full rounded-sm border border-border bg-card p-6 hover:border-gold/40 hover:shadow-elegant transition">
                  <div className="grid h-11 w-11 place-items-center rounded-sm bg-gold/10 text-gold mb-4 transition-colors duration-500 group-hover:bg-gold group-hover:text-charcoal">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif text-xl mb-2">{tx(f.title)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tx(f.desc)}</p>
                </div>
                </RiseIn>
              );
            })}
          </div>
        </section>

        <section className="bg-secondary/40 py-16">
          <div className="container-editorial text-center">
            <DollarSign className="h-10 w-10 text-gold mx-auto mb-4" />
            <h2 className="font-serif text-3xl mb-3">{t("ابدئي اليوم — بدون بطاقة")}</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">{t("تجربة مجانية ١٤ يوماً. كل المميزات مفتوحة. ألغي في أي وقت دون التزام.")}</p>
            {authed && isPhotographer ? (
              <Link to="/dashboard" className="bg-gold text-charcoal px-8 py-3 rounded-sm hover:opacity-90 inline-flex items-center gap-2">
                {t("انتقلي إلى لوحة التحكم")}{" "}<ArrowLeft className="h-4 w-4" />
              </Link>
            ) : (
              <Link to="/photographers/join" className="bg-gold text-charcoal px-8 py-3 rounded-sm hover:opacity-90 inline-flex items-center gap-2">
                {t("أنشئي حسابك الآن")}{" "}<ArrowLeft className="h-4 w-4" />
              </Link>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
