import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Images, CalendarCheck, ShieldCheck, X, ArrowLeft } from "lucide-react";

const STORAGE_KEY = "client_tour_v1";

type Step = {
  icon: typeof Search;
  title: string;
  desc: string;
  cta: string;
  to?: string;
  /** المسار الذي تُعرض فيه هذه الخطوة تلقائياً */
  match: (p: string) => boolean;
};

const STEPS: Step[] = [
  {
    icon: Search,
    title: "١. ابحثي عن مصوّرتك",
    desc: "فلتري حسب المدينة والميزانية ونوع الجلسة — كل النتائج لمصوّرات موثّقة داخل الأردن.",
    cta: "افتحي صفحة البحث",
    to: "/search",
    match: (p) => p === "/",
  },
  {
    icon: Images,
    title: "٢. قارني الأعمال والأسعار",
    desc: "افتحي ملف أي مصوّرة لرؤية معرض أعمالها، باقاتها، وتقييمات عميلات سابقات.",
    cta: "التالي",
    match: (p) => p.startsWith("/search"),
  },
  {
    icon: CalendarCheck,
    title: "٣. اختاري التاريخ واحجزي",
    desc: "التقويم يعرض المواعيد المتاحة فعلياً. نموذج الحجز ٣ خطوات قصيرة فقط.",
    cta: "التالي",
    match: (p) => p.startsWith("/photographers/"),
  },
  {
    icon: ShieldCheck,
    title: "٤. عربون موثّق ومتابعة",
    desc: "بعد التأكيد تحصلين على رابط متابعة خاص لحالة الحجز، العقد، وتسليم الصور.",
    cta: "فهمت، لنبدأ",
    match: () => false,
  },
];

const HIDDEN_PREFIXES = ["/dashboard", "/admin", "/onboarding", "/login", "/reset-password", "/forgot-password", "/notifications", "/app"];

export function ClientTour() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    setActive(true);
  }, []);

  // تتقدّم الجولة تلقائياً مع انتقال العميلة بين الشاشات
  useEffect(() => {
    if (!active) return;
    const i = STEPS.findIndex((s) => s.match(pathname));
    if (i > -1) setStep((cur) => (i > cur ? i : cur));
  }, [pathname, active]);

  const finish = () => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, "1");
    setActive(false);
  };

  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  if (!active || hidden) return null;

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  const onCta = () => {
    if (isLast) return finish();
    if (s.to) {
      setStep(step + 1);
      nav({ to: s.to });
      return;
    }
    setStep(step + 1);
  };

  return (
    <AnimatePresence>
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md sm:bottom-6"
        role="dialog"
        aria-label="جولة تعريفية سريعة"
      >
        <div className="rounded-sm border border-border bg-card p-4 shadow-soft backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/15">
              <Icon className="h-5 w-5 text-gold" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-serif text-base leading-snug text-foreground">{s.title}</h2>
                <button onClick={finish} aria-label="إغلاق الجولة" className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1 flex-1 rounded-full transition ${i <= step ? "bg-gold" : "bg-secondary"}`} />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <button onClick={finish} className="text-xs text-muted-foreground hover:text-foreground">
              تخطّي الجولة
            </button>
            <button
              onClick={onCta}
              className="inline-flex items-center gap-2 rounded-sm bg-charcoal px-4 py-2 text-xs font-medium text-ivory hover:opacity-90"
            >
              {s.cta} <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
