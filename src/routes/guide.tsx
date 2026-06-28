import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search, Calendar, FileSignature, CreditCard, Camera, PackageCheck,
  UserPlus, Image as ImageIcon, DollarSign, Bell, MessageSquare, Star,
  ShieldCheck, Sparkles, ArrowLeft, CheckCircle2, ChevronRight, X,
  Smartphone, HeartHandshake, Clock, Ban, Shield, TrendingUp, Wallet,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "كيف يعمل الموقع — رحلة العميل والمصور | Memoria" },
      { name: "description", content: "اكتشف رحلة العميل من البحث عن مصور حتى استلام الصور، ورحلة المصور من التسجيل حتى تنظيم الحجوزات والعقود الرقمية." },
      { property: "og:title", content: "كيف يعمل Memoria — رحلتك خطوة بخطوة" },
      { property: "og:description", content: "دليل شامل لكل خطوة في المنصة: للزبون وللمصور." },
    ],
  }),
  component: GuidePage,
});

type Step = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  bullets?: string[];
};

const clientSteps: Step[] = [
  {
    icon: Search,
    title: "١. ابحث عن المصور المناسب",
    body: "تصفّح المصورين حسب المدينة والتخصص (أعراس، خطوبة، جاهة، حنّاء، فيديو سينمائي). شاهد المعرض والباقات والأسعار قبل التواصل.",
    bullets: ["فلترة حسب المدينة والتقييم", "معرض صور حقيقي لكل مصور", "أسعار شفافة بدون استفسار مسبق"],
  },
  {
    icon: Calendar,
    title: "٢. اختر اليوم من التقويم",
    body: "تقويم بصري يعرض الأيام المتاحة بوضوح. الأيام المحجوزة أو المحجوبة لا يمكن اختيارها — لا مفاجآت ولا انتظار رد.",
    bullets: ["أيام محجوبة باللون الأحمر", "اختيار الباقة يعبّئ الوقت تلقائياً", "تأكيد فوري بالسعر والعربون"],
  },
  {
    icon: FileSignature,
    title: "٣. وقّع العقد الرقمي",
    body: "عقد واضح يحدّد عدد الصور، تاريخ التسليم، رسوم التمديد، حقوق النشر، وسياسة الإلغاء. توقيع إلكتروني برابط آمن.",
  },
  {
    icon: CreditCard,
    title: "٤. ادفع العربون عبر CliQ",
    body: "ارفع إثبات التحويل، يؤكّد المصور خلال ساعات، وحجزك مضمون. لا حاجة لبطاقة بنكية.",
  },
  {
    icon: Camera,
    title: "٥. يوم العرس",
    body: "كل التفاصيل متفق عليها مسبقاً: الموقع، الوقت، الباقة، الإضافات. تركّز على فرحتك والمصور يعرف دوره بالضبط.",
  },
  {
    icon: PackageCheck,
    title: "٦. استلام الصور وتقييم التجربة",
    body: "تنبيه عند جاهزية الصور خلال المدة المتفق عليها. ادفع الباقي، استلم، وقيّم المصور لتساعد العائلات الأخرى.",
  },
];

const photographerSteps: Step[] = [
  {
    icon: UserPlus,
    title: "١. سجّل كمصور",
    body: "أنشئ حسابك مجاناً. تجربة ١٤ يوم بدون أي رسوم — كل الميزات مفتوحة.",
  },
  {
    icon: ImageIcon,
    title: "٢. عبّئ ملفك الشخصي",
    body: "صورة شخصية، صورة غلاف، معدّاتك، مدينتك، رقم واتساب، ورابط إنستغرام. ارفع ٦ صور على الأقل من أفضل أعمالك.",
    bullets: ["نبذة بالعربي تعرّف الزبون عليك", "رابط مختصر باسمك: /photographers/your-name", "اظهر في نتائج البحث فوراً"],
  },
  {
    icon: DollarSign,
    title: "٣. حدّد الأسعار والباقات",
    body: "أنشئ باقات (نصف يوم، يوم كامل، جاهة، فيديو) بأسعار وعربون واضح. أضف رسم تنقّل لكل كم خارج مدينتك.",
  },
  {
    icon: Calendar,
    title: "٤. نظّم تقويمك",
    body: "احجب الأيام التي لا تتوفّر بها بضغطة واحدة. الزبائن لا يستطيعون حجز هذه الأيام نهائياً — توفّر عليك مكالمات الاعتذار.",
  },
  {
    icon: Bell,
    title: "٥. استقبل طلبات الحجز",
    body: "إشعار فوري عند كل طلب. راجع التفاصيل، أكّد أو ارفض، وأرسل العقد الرقمي بنقرة. تتبّع حالة كل حجز (عرض سعر → عربون → مؤكّد → مكتمل).",
  },
  {
    icon: MessageSquare,
    title: "٦. تواصل داخل المنصة",
    body: "رسائل مباشرة مع كل زبون موثّقة بالحجز. لا تشتّت في واتساب، وكل اتفاق مسجّل.",
  },
  {
    icon: PackageCheck,
    title: "٧. سلّم وحصّل الدفعة النهائية",
    body: "علّم الحجز كـ\"تم التسليم\"، سجّل الدفعة الأخيرة، وانتقل للمشروع التالي. لوحة تحكّم تعرض دخلك الشهري والحجوزات القادمة.",
  },
  {
    icon: Star,
    title: "٨. اِبنِ سمعتك",
    body: "كل تقييم ٤+ نجوم يرفعك في نتائج البحث. المصورون المتميزون يظهرون في القسم المميّز على الصفحة الرئيسية.",
  },
];

function StepCard({ step, index, accent }: { step: Step; index: number; accent: "primary" | "secondary" }) {
  const Icon = step.icon;
  const ring = accent === "primary" ? "ring-primary/20 bg-primary/5" : "ring-accent/30 bg-accent/10";
  const iconBg = accent === "primary" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground";
  return (
    <div className={`relative rounded-2xl border bg-card p-6 shadow-sm ring-1 ${ring}`}>
      <div className={`absolute -top-4 right-6 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${iconBg}`}>
        {index + 1}
      </div>
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-lg bg-background p-2 ring-1 ring-border">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground">{step.title.replace(/^[٠-٩]+\.\s*/, "")}</h3>
      </div>
      <p className="text-sm leading-7 text-muted-foreground">{step.body}</p>
      {step.bullets && (
        <ul className="mt-3 space-y-1.5">
          {step.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-foreground/80">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GuidePage() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* الشريط العلوي المشترك — كان مفقوداً في هذه الصفحة فيتعذّر الرجوع */}
      <Header />
      {/* Hero */}
      <header className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1.5 rounded-sm border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" /> العودة للرئيسية
          </Link>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> دليل شامل خطوة بخطوة
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            كيف يعمل <span className="text-primary">Memoria</span>؟
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            رحلتان واضحتان: واحدة للعروسين الباحثين عن مصوّر يثقون به، وواحدة للمصوّرين الذين يريدون
            تنظيم عملهم وزيادة حجوزاتهم. اختر رحلتك وابدأ.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/search" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              ابحث عن مصوّر <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent">
              سجّل كمصوّر <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Client journey */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Search className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">رحلة العميل</h2>
            <p className="text-sm text-muted-foreground">من البحث عن مصوّر إلى استلام صور العمر</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {clientSteps.map((s, i) => <StepCard key={s.title} step={s} index={i} accent="primary" />)}
        </div>
      </section>

      {/* Photographer journey */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-xl bg-accent/20 p-2.5">
              <Camera className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">رحلة المصوّر</h2>
              <p className="text-sm text-muted-foreground">من التسجيل إلى إدارة عمل احترافي متكامل</p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {photographerSteps.map((s, i) => <StepCard key={s.title} step={s} index={i} accent="secondary" />)}
          </div>
        </div>
      </section>

      {/* Comparison section */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <TrendingUp className="h-3.5 w-3.5" />
            لماذا Memoria أفضل؟
          </div>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            الفرق بيننا وبين <span className="text-primary">إنستغرام</span> و<span className="text-primary">واتساب</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            نحن لا نعرض صوراً فحسب — نؤسّس تجربة حجز احترافية كاملة تحمي العروسين والمصوّرين معاً.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {/* Header row */}
          <div className="grid grid-cols-3 border-b bg-muted/40 text-sm font-semibold text-foreground">
            <div className="border-l px-4 py-3 text-center sm:py-4">النقطة</div>
            <div className="border-l px-4 py-3 text-center sm:py-4">Memoria</div>
            <div className="px-4 py-3 text-center sm:py-4">إنستغرام / واتساب</div>
          </div>

          {/* Rows */}
          {[
            {
              label: "حجز المواعيد",
              icon: Calendar,
              us: "تقويم حيّ لا يقبل التعارض — تاريخك محجوز فوراً",
              them: "رسائل متكررة وانتظار ردّ قد يستمر أياماً",
            },
            {
              label: "الأسعار والباقات",
              icon: DollarSign,
              us: "أسعار شفافة وباقات محددة — لا مفاجآت",
              them: "«تواصلي خاصّاً» أو أسعار غامضة تتغيّر",
            },
            {
              label: "العربون والدفع",
              icon: Wallet,
              us: "عربون موثّق بدفعة آمنة وإثبات إلكتروني",
              them: "تحويل بنكي عشوائي بدون ضمان أو إيصال رسمي",
            },
            {
              label: "العقود الرقمية",
              icon: FileSignature,
              us: "عقد موقّع إلكترونياً يحدّد كل التفاصيل",
              them: "لا عقد — مجرد اتفاق شفهي قابل للنسيان",
            },
            {
              label: "حماية الطرفين",
              icon: Shield,
              us: "سياسة إلغاء واسترجاع واضحة تحمي الجميع",
              them: "لا حماية إذا تخلف أحد الطرفين في اللحظة الأخيرة",
            },
            {
              label: "التقييمات",
              icon: Star,
              us: "تقييمات حقيقية فقط من زبائن أكملوا الحجز",
              them: "تعليقات عامة لا يمكن التحقق من صاحبها",
            },
            {
              label: "تنظيم العمل",
              icon: Clock,
              us: "لوحة تحكم كاملة لتتبّع الحجوزات والدفعات",
              them: "محادثات مبعثرة تضيع بين مئات الرسائل",
            },
          ].map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-3 items-stretch text-sm ${i % 2 === 0 ? "bg-card" : "bg-muted/20"} ${i < 6 ? "border-b" : ""}`}
            >
              <div className="flex items-center gap-2 border-l px-4 py-4 font-medium text-foreground">
                <row.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="hidden sm:inline">{row.label}</span>
                <span className="sm:hidden">{row.label.split(" ").slice(0, 2).join(" ")}</span>
              </div>
              <div className="flex items-start gap-2 border-l px-4 py-4 text-foreground/90">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{row.us}</span>
              </div>
              <div className="flex items-start gap-2 px-4 py-4 text-muted-foreground">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{row.them}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: HeartHandshake, title: "ثقة موثّقة", body: "كل حجز مُسجّل، وكل دفعة مُوثّقة، وكل عقد مُوقّع إلكترونياً." },
            { icon: Smartphone, title: "تجربة موحّدة", body: "لا حاجة للتنقّل بين تطبيقات — كل شيء من البحث حتى التسليم في مكان واحد." },
            { icon: Ban, title: "لا مضايقات", body: "لا رسائل عشوائية ولا اتصالات مفاجئة — فقط حجوزات جادّة من عائلات حقيقية." },
          ].map((card) => (
            <div key={card.title} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <card.icon className="h-5 w-5 text-primary" />
              </div>
              <h4 className="text-base font-bold text-foreground">{card.title}</h4>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust footer */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="rounded-2xl border bg-card p-6 sm:p-10">
          <div className="flex items-start gap-4">
            <ShieldCheck className="h-8 w-8 shrink-0 text-primary" />
            <div>
              <h3 className="text-xl font-bold text-foreground">حماية للطرفين</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                عقود رقمية موقّعة، أسعار شفافة، تقويم لا يقبل الحجز المزدوج، إثبات دفع موثّق،
                وتقييمات حقيقية فقط من زبائن أتمّوا الحجز. كل ما يجعل تجربة التصوير في الأردن
                مهنية وآمنة.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/" className="text-sm font-semibold text-primary hover:underline">الصفحة الرئيسية</Link>
                <span className="text-muted-foreground">·</span>
                <Link to="/pricing" className="text-sm font-semibold text-primary hover:underline">الاشتراك للمصورين</Link>
                <span className="text-muted-foreground">·</span>
                <Link to="/search" className="text-sm font-semibold text-primary hover:underline">تصفح المصورين</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}