import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Search, Shield, Star, Calendar, MessageCircle, Camera, Lock, Eye, CheckCircle2, Heart, FileCheck, Bell, Receipt, ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/for-clients")({
  head: () => ({
    meta: [
      { title: "للعملاء — لماذا Memoria؟ | حجز مصوّرات الأعراس بثقة" },
      { name: "description", content: "اعثري على مصوّرة عرسك من بين مصوّرات مُتحقَّق منهنّ، شاهدي أعمالهنّ وأسعارهنّ، واحجزي بأمان مع تتبّع كامل لطلبكِ من الموافقة حتى تسليم الصور." },
      { property: "og:title", content: "للعملاء — لماذا Memoria؟" },
      { property: "og:description", content: "حجز مصوّرات الأعراس في الأردن بشفافية وأمان كامل." },
    ],
  }),
  component: ForClientsPage,
});

const FEATURES = [
  { icon: Shield, title: "مصوّرات مُتحقَّق منهنّ", desc: "كل مصوّرة على المنصة مُراجَعة من فريقنا قبل النشر. ملف غير مكتمل أو غير موثّق لا يظهر في البحث أبداً." },
  { icon: Search, title: "ابحثي بسهولة", desc: "فلترة دقيقة حسب المدينة، نوع المناسبة، السعر، التقييم، التوفّر في تاريخ معيّن — حتى لا تضيّعي وقتك." },
  { icon: Star, title: "تقييمات حقيقية", desc: "كل تقييم على المنصة من عميلة سبق حجزها فعلاً — لا تقييمات مزيّفة أو مدفوعة." },
  { icon: Calendar, title: "اعرفي التوفّر فوراً", desc: "تقويم كل مصوّرة يظهر الأيام المحجوزة. لا حاجة للسؤال «هل أنتِ متاحة بتاريخ كذا؟»." },
  { icon: MessageCircle, title: "تواصل مباشر داخل الموقع", desc: "حادثي المصوّرة، أرفقي صور مرجعية، واتفقي على التفاصيل — كل شيء محفوظ في مكان واحد." },
  { icon: Lock, title: "خصوصية مدفوعاتك", desc: "بيانات الـ CliQ ورقم الواتساب الخاص بالمصوّرة تظهر لكِ فقط بعد تأكيد الحجز — لا تُنشر للعموم." },
  { icon: FileCheck, title: "عقد رقمي رسمي", desc: "وقّعي العقد إلكترونياً قبل الحجز. يحمي حقوقكِ ويوضّح التفاصيل: التاريخ، عدد الساعات، طريقة التسليم." },
  { icon: Eye, title: "تتبّع كامل لحجزكِ", desc: "صفحة تتبّع خاصة بكِ ترين فيها مرحلة الحجز: بانتظار العربون، مؤكّد، يوم التصوير، قيد التحرير، جاهز للتسليم." },
  { icon: Bell, title: "تذكيرات تلقائية", desc: "تنبيهات للموعد، للعربون، ولاستلام الصور — حتى لا تنسي شيئاً." },
  { icon: Receipt, title: "إثبات عربون آمن", desc: "ارفعي إثبات تحويل العربون مباشرة من رابط التتبع. المصوّرة ترى الإشعار فوراً وتؤكّد." },
  { icon: Camera, title: "معرض تسليم خاص", desc: "صور عرسكِ تصلكِ في معرض إلكتروني خاص ومحمي — تستطيعين تحميلها أو مشاركتها." },
  { icon: Heart, title: "دعم بشري بالعربية", desc: "فريقنا متاح للرد على استفساراتكِ بالعربية إذا واجهتِ أي مشكلة في الحجز أو الدفع." },
];

function ForClientsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="container-editorial py-16 sm:py-24 text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">للعميلة</div>
          <h1 className="font-serif text-4xl sm:text-5xl leading-tight mb-4">احجزي مصوّرة عرسكِ <br className="hidden sm:block" /> بثقة وأمان كامل</h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Memoria منصّة متخصّصة في مصوّرات الأعراس في الأردن. اخترنا لكِ أفضل المصوّرات، تحقّقنا منهنّ، ووفّرنا أدوات حماية وتتبّع لكل خطوة من خطوات حجزكِ.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/search" className="bg-charcoal text-ivory px-6 py-3 rounded-sm hover:opacity-90 inline-flex items-center gap-2">
              ابدئي البحث الآن <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link to="/guide" className="border border-border px-6 py-3 rounded-sm hover:bg-secondary">كيف يعمل الحجز؟</Link>
          </div>
        </section>

        <section className="container-editorial pb-16">
          <div className="text-center mb-12">
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">لماذا نحن</div>
            <h2 className="font-serif text-3xl sm:text-4xl">١٢ سبباً لاختيار Memoria</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-sm border border-border bg-card p-6 hover:border-gold/40 hover:shadow-elegant transition">
                  <div className="grid h-11 w-11 place-items-center rounded-sm bg-gold/10 text-gold mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif text-xl mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-secondary/40 py-16">
          <div className="container-editorial text-center">
            <Sparkles className="h-10 w-10 text-gold mx-auto mb-4" />
            <h2 className="font-serif text-3xl mb-3">جاهزة لتجدي مصوّرتك؟</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">آلاف اللحظات تستحق التوثيق. ابدئي البحث الآن وقارني بين أفضل المصوّرات.</p>
            <Link to="/search" className="bg-gold text-charcoal px-8 py-3 rounded-sm hover:opacity-90 inline-flex items-center gap-2">
              ابحثي عن مصوّرة <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
