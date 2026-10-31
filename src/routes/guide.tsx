import { createFileRoute, Link } from "@tanstack/react-router";
import { getLang, dirOf } from "@/i18n";
import {
  Search, Calendar, FileSignature, CreditCard, Camera, PackageCheck,
  UserPlus, Image as ImageIcon, DollarSign, Bell, MessageSquare, Star,
  ShieldCheck, Sparkles, ArrowLeft, CheckCircle2, ChevronRight, X,
  Smartphone, HeartHandshake, Clock, Ban, Shield, TrendingUp, Wallet,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { RevealWords, RiseIn } from "@/components/site/Reveal";
import { motion } from "framer-motion";
import { t, tx } from "@/i18n";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: t("كيف يعمل الموقع — رحلة العروس والمصوّرة | Memoria") },
      { name: "description", content: t("رحلة العروس من البحث عن مصوّرة حتى استلام الصور، ورحلة المصوّرة من التسجيل حتى تنظيم الحجوزات.") },
      { property: "og:title", content: t("كيف يعمل Memoria — رحلتك خطوة بخطوة") },
      { property: "og:description", content: t("دليل لكل خطوة في المنصّة: للعروس وللمصوّرة.") },
    ],
    links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/guide" }],
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
    title: "١. ابحثي عن المصوّرة المناسبة",
    body: "تصفّحي المصوّرات حسب المدينة والتاريخ والسعر والتقييم. شاهدي المعرض والباقات والأسعار قبل أي محادثة.",
    bullets: ["فلترة حسب المدينة والتاريخ والتقييم", "معرض صور حقيقي لكل مصوّرة", "أسعار مكتوبة بدون استفسار مسبق"],
  },
  {
    icon: Calendar,
    title: "٢. اختاري اليوم وأرسلي الطلب",
    body: "التقويم يعرض الأيام المتاحة فقط. إرسال الطلب مجاني، والتاريخ يبقى محجوزاً لكِ حتى تردّ المصوّرة خلال 24 ساعة.",
    bullets: ["الأيام غير المتاحة لا يمكن اختيارها", "اختيار الباقة يعبّئ الوقت تلقائياً", "السعر والعربون وسياسة الإلغاء واضحة قبل الإرسال"],
  },
  {
    icon: CreditCard,
    title: "٣. بعد موافقتها: حوّلي العربون عبر CliQ",
    body: "حوّلي العربون مباشرة للمصوّرة خلال 48 ساعة وارفعي صورة الإيصال من صفحة المتابعة. يتأكّد الحجز بعد أن تؤكّد المصوّرة وصول المبلغ. لا حاجة لبطاقة بنكية.",
  },
  {
    icon: FileSignature,
    title: "٤. وقّعي العقد إن أرسلته المصوّرة",
    body: "بعض المصوّرات يرسلن عقداً رقمياً يحدّد التسليم والخصوصية وسياسة العربون. توقّعينه من هاتفكِ برابط آمن.",
  },
  {
    icon: Camera,
    title: "٥. يوم العرس",
    body: "كل التفاصيل متفق عليها مسبقاً: المكان، الوقت، الباقة، الإضافات. ركّزي على فرحتكِ، والمصوّرة تعرف دورها بالضبط.",
  },
  {
    icon: PackageCheck,
    title: "٦. ادفعي المتبقي واستلمي صوركِ",
    body: "بعد العرس تحوّلين باقي المبلغ للمصوّرة، وتستلمين صوركِ في معرض خاص على صفحة المتابعة، ثم تقيّمين التجربة لتساعدي العرائس بعدكِ.",
  },
];

const photographerSteps: Step[] = [
  {
    icon: UserPlus,
    title: "١. سجّلي كمصوّرة",
    body: "أنشئي حسابكِ مجاناً. تجربة ١٤ يوماً بدون بطاقة، وفيها كل ميزات Pro.",
  },
  {
    icon: ImageIcon,
    title: "٢. جهّزي ملفكِ",
    body: "نبذة، مدينتكِ، صورة شخصية وغلاف، ورقم CliQ لاستلام العربون. يظهر ملفكِ في البحث فور إكمال الإعداد، وننصح برفع ٥ صور على الأقل من أفضل أعمالكِ.",
    bullets: ["رابط مختصر باسمكِ: /photographers/your-name", "رقمكِ لا يظهر للعموم", "تختارين سياسة العربون إذا ألغت العروس"],
  },
  {
    icon: DollarSign,
    title: "٣. حدّدي الأسعار والباقات",
    body: "أنشئي باقات (نصف يوم، يوم كامل، جاهة، فيديو) بأسعار وعربون واضح، وأضيفي أجرة تنقّل لكل كم خارج مدينتكِ.",
  },
  {
    icon: Calendar,
    title: "٤. نظّمي تقويمكِ",
    body: "احجبي الأيام التي لا تتوفّرين فيها، أو اربطي Google Calendar لتُغلق أيامكِ المشغولة تلقائياً. لا تصلكِ طلبات على يوم محجوز.",
  },
  {
    icon: Bell,
    title: "٥. وافقي على الطلبات خلال 24 ساعة",
    body: "يصلكِ إشعار فوري بالإيميل أو تيليغرام. توافقين أو تعتذرين خلال 24 ساعة، ثم تحوّل العروس العربون وتؤكّدين وصوله من تطبيق البنك. المراحل: طلب ← موافقة ← عربون ← مؤكّد ← مكتمل.",
  },
  {
    icon: MessageSquare,
    title: "٦. تواصلي داخل المنصّة",
    body: "رسائل مباشرة مع كل عروس محفوظة مع الحجز، وعقد رقمي وعروض أسعار في باقة Pro.",
  },
  {
    icon: PackageCheck,
    title: "٧. سلّمي واستلمي المتبقي",
    body: "ارفعي الصور في معرض خاص بالعروس، علّمي الحجز «تم التسليم»، وسجّلي الدفعة الأخيرة. لوحة التحكم تعرض دخلكِ وحجوزاتكِ القادمة.",
  },
  {
    icon: Star,
    title: "٨. ابني سمعتكِ",
    body: "بعد كل حجز مكتمل تصل العروس رسالة لتقييمكِ. التقييمات تظهر على صفحتكِ، وباقة Pro تمنحكِ شارة التوثيق وظهوراً أعلى في البحث.",
  },
];

function StepCard({ step, index, accent }: { step: Step; index: number; accent: "primary" | "secondary" }) {
  const Icon = step.icon;
  const ring = accent === "primary" ? "ring-primary/20 bg-primary/5" : "ring-accent/30 bg-accent/10";
  const iconBg = accent === "primary" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground";
  return (
    <div className={`relative rounded-2xl border bg-card p-6 shadow-sm ring-1 ${ring}`}>
      <div className={`absolute -top-4 start-6 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${iconBg}`}>
        {index + 1}
      </div>
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-lg bg-background p-2 ring-1 ring-border">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground">{step.title.replace(/^[٠-٩]+\.\s*/, "")}</h3>
      </div>
      <p className="text-sm leading-7 text-muted-foreground">{tx(step.body)}</p>
      {step.bullets && (
        <ul className="mt-3 space-y-1.5">
          {step.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-foreground/80">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{tx(b)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GuidePage() {
  return (
    <div className="min-h-screen bg-background" dir={dirOf(getLang())}>
      {/* الشريط العلوي المشترك — كان مفقوداً في هذه الصفحة فيتعذّر الرجوع */}
      <Header />
      {/* Hero */}
      <header className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1.5 rounded-sm border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />{" "}{t("العودة للرئيسية")}
          </Link>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />{" "}{t("دليل شامل خطوة بخطوة")}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            <RevealWords lines={[t("كيف يعمل")]} />{" "}
            <motion.span
              className="inline-block text-primary"
              initial={{ opacity: 0, y: "0.5em", filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              Memoria
            </motion.span>{t("؟")}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            {t("رحلتان واضحتان: واحدة للعروس التي تبحث عن مصوّرة تثق بها، وواحدة للمصوّرة التي تريد تنظيم عملها. اختاري رحلتكِ وابدئي.")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/search" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              {t("ابحثي عن مصوّرة")}{" "}<ArrowLeft className="h-4 w-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent">
              {t("سجّلي كمصوّرة")}{" "}<ArrowLeft className="h-4 w-4" />
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
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{t("رحلة العروس")}</h2>
            <p className="text-sm text-muted-foreground">{t("من البحث عن مصوّرة إلى استلام صور العمر")}</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {clientSteps.map((s, i) => <RiseIn key={s.title} index={i} className="h-full"><StepCard step={s} index={i} accent="primary" /></RiseIn>)}
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
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{t("رحلة المصوّرة")}</h2>
              <p className="text-sm text-muted-foreground">{t("من التسجيل إلى إدارة عمل احترافي متكامل")}</p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {photographerSteps.map((s, i) => <RiseIn key={s.title} index={i} className="h-full"><StepCard step={s} index={i} accent="secondary" /></RiseIn>)}
          </div>
        </div>
      </section>

      {/* Comparison section */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <TrendingUp className="h-3.5 w-3.5" />
            {t("لماذا Memoria أفضل؟")}
          </div>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            {t("الفرق بيننا وبين")}{" "}<span className="text-primary">{t("إنستغرام")}</span>{" "}{t("و")}<span className="text-primary">{t("واتساب")}</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {t("نحن لا نعرض صوراً فحسب — نؤسّس تجربة حجز احترافية كاملة تحمي العروسين والمصوّرين معاً.")}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {/* Header row */}
          <div className="grid grid-cols-3 border-b bg-muted/40 text-sm font-semibold text-foreground">
            <div className="border-e px-4 py-3 text-center sm:py-4">{t("النقطة")}</div>
            <div className="border-e px-4 py-3 text-center sm:py-4">Memoria</div>
            <div className="px-4 py-3 text-center sm:py-4">{t("إنستغرام / واتساب")}</div>
          </div>

          {/* Rows */}
          {[
            {
              label: t("حجز المواعيد"),
              icon: Calendar,
              us: t("تقويم حيّ لا يقبل التعارض، وردّ خلال 24 ساعة أو يُلغى الطلب تلقائياً"),
              them: t("رسائل متكررة وانتظار ردّ قد يستمر أياماً"),
            },
            {
              label: t("الأسعار والباقات"),
              icon: DollarSign,
              us: t("أسعار شفافة وباقات محددة — لا مفاجآت"),
              them: t("«تواصلي خاصّاً» أو أسعار غامضة تتغيّر"),
            },
            {
              label: t("العربون والدفع"),
              icon: Wallet,
              us: t("عربون مباشر للمصوّرة مع إيصال محفوظ في الحجز"),
              them: t("تحويل بنكي عشوائي بدون ضمان أو إيصال رسمي"),
            },
            {
              label: t("العقود الرقمية"),
              icon: FileSignature,
              us: t("عقد رقمي يحدّد التفاصيل (عند مصوّرات Pro)"),
              them: t("لا عقد — مجرد اتفاق شفهي قابل للنسيان"),
            },
            {
              label: t("حماية الطرفين"),
              icon: Shield,
              us: t("سياسة عربون معلنة توافقين عليها قبل الدفع"),
              them: t("لا حماية إذا تخلف أحد الطرفين في اللحظة الأخيرة"),
            },
            {
              label: t("التقييمات"),
              icon: Star,
              us: t("تقييمات فقط من عرائس أكملن الحجز"),
              them: t("تعليقات عامة لا يمكن التحقق من صاحبها"),
            },
            {
              label: t("تنظيم العمل"),
              icon: Clock,
              us: t("لوحة تحكم كاملة لتتبّع الحجوزات والدفعات"),
              them: t("محادثات مبعثرة تضيع بين مئات الرسائل"),
            },
          ].map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-3 items-stretch text-sm ${i % 2 === 0 ? "bg-card" : "bg-muted/20"} ${i < 6 ? "border-b" : ""}`}
            >
              <div className="flex items-center gap-2 border-e px-4 py-4 font-medium text-foreground">
                <row.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="hidden sm:inline">{tx(row.label)}</span>
                <span className="sm:hidden">{row.label.split(" ").slice(0, 2).join(" ")}</span>
              </div>
              <div className="flex items-start gap-2 border-e px-4 py-4 text-foreground/90">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{tx(row.us)}</span>
              </div>
              <div className="flex items-start gap-2 px-4 py-4 text-muted-foreground">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{tx(row.them)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: HeartHandshake, title: t("ثقة موثّقة"), body: t("كل حجز مُسجّل، وكل إيصال محفوظ، وكل اتفاق مكتوب في الحجز.") },
            { icon: Smartphone, title: t("تجربة موحّدة"), body: t("لا حاجة للتنقّل بين تطبيقات — كل شيء من البحث حتى التسليم في مكان واحد.") },
            { icon: Ban, title: t("لا مضايقات"), body: t("رقمكِ لا يظهر للعموم، وكل طلب يصلكِ بتفاصيله كاملة.") },
          ].map((card) => (
            <div key={card.title} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <card.icon className="h-5 w-5 text-primary" />
              </div>
              <h4 className="text-base font-bold text-foreground">{tx(card.title)}</h4>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{tx(card.body)}</p>
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
              <h3 className="text-xl font-bold text-foreground">{t("حماية للطرفين")}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {t("أسعار مكتوبة، تقويم لا يقبل الحجز المزدوج، سياسة عربون معلنة، إيصالات محفوظة، وتقييمات فقط من عرائس أتممن الحجز.")}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/" className="text-sm font-semibold text-primary hover:underline">{t("الصفحة الرئيسية")}</Link>
                <span className="text-muted-foreground">·</span>
                <Link to="/pricing" className="text-sm font-semibold text-primary hover:underline">{t("الاشتراك للمصوّرات")}</Link>
                <span className="text-muted-foreground">·</span>
                <Link to="/search" className="text-sm font-semibold text-primary hover:underline">{t("تصفّحي المصوّرات")}</Link>
                <span className="text-muted-foreground">·</span>
                <a href="/blog" className="text-sm font-semibold text-primary hover:underline">{t("المدوّنة")}</a>
                <span className="text-muted-foreground">·</span>
                <a href="/wedding-photographer/amman" className="text-sm font-semibold text-primary hover:underline">{t("مصورة أعراس في عمّان")}</a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}