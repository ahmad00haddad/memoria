import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Camera, DollarSign, Wallet, MessageCircle, Eye, Sparkles, ArrowLeft, X } from "lucide-react";

const STORAGE_KEY = "onboarding_v1_dismissed";

const STEPS = [
  { icon: Sparkles, title: "أهلاً بكِ في Memoria 👋", desc: "هذه الجولة السريعة تأخذ دقيقتين لتعرفي من أين تبدئين. يمكنك تخطيها وفتح القائمة لاحقاً من لوحة التحكم.", to: null, cta: "ابدئي" },
  { icon: Camera, title: "١. أكملي ملفك الشخصي", desc: "الصورة، النبذة، المدينة، المعدّات. هذا أول ما يراه العميل عند فتح صفحتك.", to: "/dashboard/profile", cta: "افتحي الملف الآن" },
  { icon: DollarSign, title: "٢. أضيفي باقات الأسعار", desc: "بدون باقات لن يرى العميل أسعاركِ ولن يستطيع طلب حجز واضح.", to: "/dashboard/pricing", cta: "إضافة باقة" },
  { icon: Wallet, title: "٣. أدخلي وسائل الدفع والتواصل", desc: "CliQ alias ورقم واتساب — تظهر للعميل بعد تأكيد الحجز فقط لحماية خصوصيتك.", to: "/dashboard/profile", cta: "إضافة CliQ والواتساب" },
  { icon: MessageCircle, title: "٤. قوالب واتساب جاهزة", desc: "٦ قوالب جاهزة (ترحيب، طلب عربون، تأكيد، تذكير، تسليم، تقييم) ترسلينها بنقرة.", to: "/dashboard/whatsapp-templates", cta: "عرض القوالب" },
  { icon: Eye, title: "٥. فعّلي ظهور صفحتك", desc: "آخر خطوة: انشري ملفك العام ليبدأ العملاء بالعثور عليكِ والحجز.", to: "/dashboard/profile", cta: "فعّلي النشر" },
];

export function OnboardingWizard({ shouldShow }: { shouldShow: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!shouldShow) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    setOpen(true);
  }, [shouldShow]);

  const dismiss = () => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  // إغلاق مؤقت (لإعادة الظهور لاحقاً) — يُستخدم عند الضغط على زر "افتح الصفحة"
  const closeOnly = () => setOpen(false);

  const s = STEPS[step];
  const Icon = s.icon;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-w-2xl mx-auto p-0 max-h-[90vh] overflow-y-auto">
        <div className="p-6 sm:p-8">
          <SheetHeader className="space-y-3 text-start">
            <div className="flex items-center justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gold/15">
                <Icon className="h-6 w-6 text-gold" />
              </div>
              <button onClick={dismiss} className="text-muted-foreground hover:text-foreground p-1" aria-label="إغلاق">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SheetTitle className="font-serif text-2xl">{s.title}</SheetTitle>
            <SheetDescription className="text-sm leading-relaxed">{s.desc}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex items-center gap-2">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full transition ${i <= step ? "bg-gold" : "bg-secondary"}`} />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 justify-between">
            <button onClick={dismiss} className="text-xs text-muted-foreground hover:text-foreground">تخطّي الجولة</button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button onClick={() => setStep(step - 1)} className="text-sm px-4 py-2 border border-border rounded-sm hover:bg-secondary">السابق</button>
              )}
              {s.to ? (
                <Link to={s.to} onClick={closeOnly} className="text-sm px-4 py-2 rounded-sm bg-charcoal text-ivory hover:opacity-90 inline-flex items-center gap-2">
                  {s.cta} <ArrowLeft className="h-4 w-4" />
                </Link>
              ) : null}
              {step < STEPS.length - 1 ? (
                <button onClick={() => setStep(step + 1)} className="text-sm px-4 py-2 rounded-sm bg-gold text-charcoal hover:opacity-90 inline-flex items-center gap-2">
                  التالي <ArrowLeft className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={dismiss} className="text-sm px-4 py-2 rounded-sm bg-emerald-600 text-white hover:opacity-90">إنهاء</button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
