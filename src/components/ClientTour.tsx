import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Images, CalendarCheck, ShieldCheck, X, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "client_tour_v2";

export interface TourState {
  status: "idle" | "active" | "completed" | "skipped";
  step: number;
  startedAt: string | null;
  completedAt: string | null;
  userId: string | null;
}

export function getTourState(): TourState {
  if (typeof window === "undefined") return { status: "idle", step: 0, startedAt: null, completedAt: null, userId: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { status: "idle", step: 0, startedAt: null, completedAt: null, userId: null };
}

export function saveTourState(state: TourState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event("tour-state-change"));
  } catch {}
}

export function resetTour() {
  saveTourState({ status: "idle", step: 0, startedAt: null, completedAt: null, userId: null });
}

export function startTour() {
  const current = getTourState();
  saveTourState({
    ...current,
    status: "active",
    step: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
  });
}

export function useTourState() {
  const [state, setState] = useState<TourState>(getTourState());
  useEffect(() => {
    const onStorage = () => setState(getTourState());
    window.addEventListener("tour-state-change", onStorage);
    return () => window.removeEventListener("tour-state-change", onStorage);
  }, []);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const current = getTourState();
      const uid = session?.user?.id || null;
      if (current.userId !== uid) {
        saveTourState({ ...current, userId: uid });
      }
    });
  }, []);

  return state;
}

type Step = {
  icon: typeof Search;
  title: string;
  desc: string;
  cta: string;
  to?: string;
  match: (p: string) => boolean;
};

const STEPS: Step[] = [
  {
    icon: Search,
    title: "١. ابحثي عن مصوّرتك",
    desc: "فلتري حسب المدينة والميزانية ونوع الجلسة — كل النتائج لمصوّرات موثّقة داخل الأردن.",
    cta: "افتحي صفحة البحث",
    to: "/search",
    match: (p) => p === "/search" || p === "/",
  },
  {
    icon: Images,
    title: "٢. قارني الأعمال والأسعار",
    desc: "افتحي ملف أي مصوّرة لرؤية معرض أعمالها، باقاتها، وتقييمات عميلات سابقات.",
    cta: "التالي",
    match: (p) => p.startsWith("/photographers/"),
  },
  {
    icon: CalendarCheck,
    title: "٣. اختاري التاريخ واحجزي",
    desc: "التقويم يعرض المواعيد المتاحة فعلياً. نموذج الحجز ٣ خطوات قصيرة فقط.",
    cta: "التالي",
    match: (p) => p.startsWith("/photographers/") && !p.endsWith("/book"),
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
  const state = useTourState();

  // Smart launch logic
  useEffect(() => {
    if (state.status === "idle" && pathname.startsWith("/search")) {
      startTour();
    }
  }, [pathname, state.status]);

  // Advance step based on location
  useEffect(() => {
    if (state.status !== "active") return;
    const i = STEPS.findIndex((s) => s.match(pathname));
    if (i > -1 && i > state.step) {
      saveTourState({ ...state, step: i });
    }
  }, [pathname, state]);

  const finish = (skipped = false) => {
    saveTourState({
      ...state,
      status: skipped ? "skipped" : "completed",
      completedAt: new Date().toISOString(),
    });
  };

  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  if (state.status !== "active" || hidden) return null;

  const s = STEPS[state.step];
  if (!s) return null;
  const Icon = s.icon;
  const isLast = state.step === STEPS.length - 1;

  const onCta = () => {
    if (isLast) return finish(false);
    if (s.to && pathname !== s.to) {
      saveTourState({ ...state, step: state.step + 1 });
      nav({ to: s.to });
      return;
    }
    saveTourState({ ...state, step: state.step + 1 });
  };

  return (
    <AnimatePresence>
      <motion.div
        key={state.step}
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
                <button onClick={() => finish(true)} aria-label="إغلاق الجولة" className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1 flex-1 rounded-full transition ${i <= state.step ? "bg-gold" : "bg-secondary"}`} />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <button onClick={() => finish(true)} className="text-xs text-muted-foreground hover:text-foreground">
              تخطّي الجولة
            </button>
            <button
              onClick={onCta}
              className="inline-flex items-center gap-2 rounded-sm bg-charcoal px-4 py-2 text-xs font-medium text-ivory hover:opacity-90"
            >
              {s.cta} {s.to && pathname !== s.to ? <ArrowLeft className="h-3.5 w-3.5" /> : null}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
