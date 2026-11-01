import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { g } from "@/hooks/use-gender";
import { t as tr, tx } from "@/i18n";

// ============================================================================
// جولة المصوّرة — خطوات قصيرة جداً، كل خطوة تأخذها للصفحة الصحيحة، تُبرز الزر
// المطلوب (data-tour="…")، وتُعلَّم ✓ وحدها عندما تُنجَز فعلاً.
// ============================================================================

const KEY = "photographer_tour_v1";
type TourStatus = "idle" | "active" | "done" | "hidden";
type State = { status: TourStatus; step: number; min: boolean };
const EMPTY: State = { status: "idle", step: 0, min: false };

function read(): State {
  if (typeof window === "undefined") return EMPTY;
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return EMPTY; }
}
function write(s: State) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); window.dispatchEvent(new Event("photographer-tour")); } catch { /* ignore */ }
}

/** يشغّل الجولة من أولها (زر «أعيدي الجولة» في الفوتر والإعدادات). */
export function startPhotographerTour() {
  write({ status: "active", step: 0, min: false });
}

type Progress = { photo: boolean; name: boolean; cliq: boolean; pkg: boolean; published: boolean; telegram: boolean };

type Step = {
  page: string;
  target?: string;
  section?: string; // قسم مطوي في صفحة الملف يجب فتحه
  title: string;
  lines: string[];
  done?: (p: Progress) => boolean;
};

// الجمل قصيرة ومباشرة: فعل واحد في كل سطر
function steps(): Step[] {
  const G = (f: string, m: string) => g(tr(f), tr(m));
  return [
    {
      page: "/dashboard",
      title: G("أهلاً بكِ في ميموريا 👋", "أهلاً بك في ميموريا 👋"),
      lines: [
        G("سنمشي معاً خطوة بخطوة، ١٠ خطوات قصيرة.", "سنمشي معاً خطوة بخطوة، ١٠ خطوات قصيرة."),
        G("في كل خطوة نأخذكِ للمكان الصحيح ونلوّن لكِ الزر المطلوب.", "في كل خطوة نأخذك للمكان الصحيح ونلوّن لك الزر المطلوب."),
        G("في النهاية تكون صفحتكِ جاهزة لاستقبال الحجوزات.", "في النهاية تكون صفحتك جاهزة لاستقبال الحجوزات."),
      ],
    },
    {
      page: "/dashboard/profile", target: "photos", section: "sec-photos",
      title: G("١. صورتكِ", "١. صورتك"),
      lines: [
        G("اضغطي على «الصورة الشخصية» واختاري صورة واضحة لكِ أو لشعاركِ.", "اضغط على «الصورة الشخصية» واختر صورة واضحة لك أو لشعارك."),
        G("ثم اضغطي «صورة الغلاف» واختاري أجمل صورة من شغلكِ.", "ثم اضغط «صورة الغلاف» واختر أجمل صورة من شغلك."),
        G("هذا أول ما تراه العروس.", "هذا أول ما تراه العروس."),
      ],
      done: (p) => p.photo,
    },
    {
      page: "/dashboard/profile", target: "basics", section: "sec-basics",
      title: G("٢. اسمكِ ومدينتكِ", "٢. اسمك ومدينتك"),
      lines: [
        G("اكتبي اسمكِ كما تحبين أن تراه العرائس.", "اكتب اسمك كما تحب أن تراه العرائس."),
        G("اختاري مدينتكِ.", "اختر مدينتك."),
        G("اكتبي جملتين عن أسلوبكِ في التصوير.", "اكتب جملتين عن أسلوبك في التصوير."),
      ],
      done: (p) => p.name,
    },
    {
      page: "/dashboard/profile", target: "cliq", section: "sec-contact",
      title: G("٣. أين يصلكِ العربون؟", "٣. أين يصلك العربون؟"),
      lines: [
        G("اكتبي CliQ alias الخاص بكِ (الاسم الذي تستقبلين عليه التحويلات).", "اكتب CliQ alias الخاص بك (الاسم الذي تستقبل عليه التحويلات)."),
        G("لا يراه أحد إلا العروس التي توافقين على طلبها.", "لا يراه أحد إلا العروس التي توافق على طلبها."),
        G("ثم اضغطي زر «حفظ» الذهبي.", "ثم اضغط زر «حفظ» الذهبي."),
      ],
      done: (p) => p.cliq,
    },
    {
      page: "/dashboard/pricing", target: "add-package",
      title: G("٤. أول باقة وسعرها", "٤. أول باقة وسعرها"),
      lines: [
        G("اضغطي «إضافة باقة جديدة».", "اضغط «إضافة باقة جديدة»."),
        G("اكتبي اسم الباقة (مثلاً: تغطية عرس كاملة) وسعرها.", "اكتب اسم الباقة (مثلاً: تغطية عرس كاملة) وسعرها."),
        G("بدون باقة لا تستطيع العروس أن تحجز.", "بدون باقة لا تستطيع العروس أن تحجز."),
      ],
      done: (p) => p.pkg,
    },
    {
      page: "/dashboard/settings", target: "policy",
      title: G("٥. ماذا لو ألغت العروس؟", "٥. ماذا لو ألغت العروس؟"),
      lines: [
        G("اختاري ماذا يحدث للعربون: لا يُرجَع، أو يُرجَع جزء، أو كاملاً.", "اختر ماذا يحدث للعربون: لا يُرجَع، أو يُرجَع جزء، أو كاملاً."),
        G("العروس ترى اختياركِ وتوافق عليه قبل أن تحوّل.", "العروس ترى اختيارك وتوافق عليه قبل أن تحوّل."),
        G("ثم اضغطي «حفظ».", "ثم اضغط «حفظ»."),
      ],
    },
    {
      page: "/dashboard/profile", target: "publish",
      title: G("٦. انشري صفحتكِ", "٦. انشر صفحتك"),
      lines: [
        G("اضغطي الزر حتى يصير أخضر ومكتوب عليه «منشور للعرائس».", "اضغط الزر حتى يصير أخضر ومكتوب عليه «منشور للعرائس»."),
        G("ثم اضغطي «حفظ».", "ثم اضغط «حفظ»."),
        G("الآن تراكِ العرائس في البحث.", "الآن تراك العرائس في البحث."),
      ],
      done: (p) => p.published,
    },
    {
      page: "/dashboard", target: "notify",
      title: G("٧. خلّي الطلبات تصل لجوالكِ", "٧. خلّي الطلبات تصل لجوالك"),
      lines: [
        G("اربطي تيليغرام بضغطة واحدة، فيصلكِ كل طلب فوراً.", "اربط تيليغرام بضغطة واحدة، فيصلك كل طلب فوراً."),
        G("مهم جداً: عندكِ 24 ساعة لتوافقي على كل طلب، وإلا يُلغى وحده.", "مهم جداً: عندك 24 ساعة لتوافق على كل طلب، وإلا يُلغى وحده."),
      ],
      done: (p) => p.telegram,
    },
    {
      page: "/dashboard/calendar", target: "google",
      title: G("٨. أغلقي أيامكِ المشغولة", "٨. أغلق أيامك المشغولة"),
      lines: [
        G("إن كانت مواعيدكِ على تقويم Google، اضغطي «الربط مع Google».", "إن كانت مواعيدك على تقويم Google، اضغط «الربط مع Google»."),
        G("أو اضغطي على أي يوم في التقويم لتغلقيه.", "أو اضغط على أي يوم في التقويم لتغلقه."),
        G("هكذا لا يصلكِ طلب على يوم مشغول.", "هكذا لا يصلك طلب على يوم مشغول."),
      ],
    },
    {
      page: "/dashboard/bookings",
      title: G("٩. وصلكِ طلب؟ هذا ما تفعلينه", "٩. وصلك طلب؟ هذا ما تفعله"),
      lines: [
        G("افتحي الطلب من الإشعار.", "افتح الطلب من الإشعار."),
        G("وافقي أو اعتذري خلال 24 ساعة.", "وافق أو اعتذر خلال 24 ساعة."),
        G("العروس تحوّل العربون على CliQ خلال 48 ساعة.", "العروس تحوّل العربون على CliQ خلال 48 ساعة."),
        G("افتحي تطبيق البنك وتأكّدي أن المبلغ وصل، ثم اضغطي «تثبيت الحجز».", "افتح تطبيق البنك وتأكّد أن المبلغ وصل، ثم اضغط «تثبيت الحجز»."),
        G("بعد العرس: استلمي باقي المبلغ وسلّمي الصور.", "بعد العرس: استلم باقي المبلغ وسلّم الصور."),
      ],
    },
    {
      page: "/dashboard", target: "share",
      title: G("١٠. شاركي رابطكِ 🎉", "١٠. شارك رابطك 🎉"),
      lines: [
        G("اضغطي «نسخ رابط ملفي».", "اضغط «نسخ رابط ملفي»."),
        G("ضعيه في البايو على إنستغرام.", "ضعه في البايو على إنستغرام."),
        G("انتهينا! صفحتكِ جاهزة لاستقبال الحجوزات.", "انتهينا! صفحتك جاهزة لاستقبال الحجوزات."),
      ],
    },
  ];
}

async function loadProgress(): Promise<Progress | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const uid = session.user.id;
  const [{ data: prof }, { data: priv }, { count }] = await Promise.all([
    supabase.from("profiles").select("display_name, city, avatar_url, cover_url, is_published").eq("id", uid).maybeSingle(),
    (supabase as any).from("photographer_private").select("cliq_alias, telegram_chat_id").eq("user_id", uid).maybeSingle(),
    supabase.from("pricing_rules").select("id", { count: "exact", head: true }).eq("photographer_id", uid).neq("package", "addon"),
  ]);
  const p: any = prof ?? {};
  return {
    photo: !!p.avatar_url && !!p.cover_url,
    name: !!p.display_name && !!p.city,
    cliq: !!(priv as any)?.cliq_alias,
    pkg: (count ?? 0) > 0,
    published: !!p.is_published,
    telegram: !!(priv as any)?.telegram_chat_id,
  };
}

export function PhotographerTour() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const [st, setSt] = useState<State>(EMPTY);
  const [prog, setProg] = useState<Progress | null>(null);

  useEffect(() => {
    setSt(read());
    const on = () => setSt(read());
    window.addEventListener("photographer-tour", on);
    return () => window.removeEventListener("photographer-tour", on);
  }, []);

  const inDashboard = pathname.startsWith("/dashboard");

  // أول دخول للوحة: تبدأ الجولة وحدها مرة واحدة
  useEffect(() => {
    if (inDashboard && st.status === "idle" && pathname === "/dashboard") write({ status: "active", step: 0, min: false });
  }, [inDashboard, st.status, pathname]);

  // التقدّم الحقيقي: عند تغيير الصفحة وكل بضع ثوانٍ أثناء الجولة
  useEffect(() => {
    if (st.status !== "active" || !inDashboard) return;
    let alive = true;
    const tick = () => loadProgress().then((p) => alive && setProg(p)).catch(() => {});
    tick();
    const id = window.setInterval(tick, 4000);
    return () => { alive = false; window.clearInterval(id); };
  }, [st.status, inDashboard, pathname]);

  const list = steps();
  const s = list[st.step];
  const here = !!s && pathname === s.page;

  // إبراز العنصر المطلوب في الصفحة الحالية
  useEffect(() => {
    if (st.status !== "active" || st.min || !s?.target || !here) return;
    if (s.section) window.dispatchEvent(new CustomEvent("memoria-open-section", { detail: s.section }));
    // الصفحة تُحمَّل بعد الانتقال، فنبحث عن العنصر حتى يظهر (حتى ٨ ثوانٍ)
    let el: HTMLElement | null = null;
    let tries = 0;
    const timer = window.setInterval(() => {
      el = document.querySelector<HTMLElement>(`[data-tour="${s.target}"]`);
      if (!el && ++tries < 27) return;
      window.clearInterval(timer);
      if (!el) return;
      // عنصر داخل <details> مطوي (مثل مزامنة التقويم): نفتحه أولاً
      const det = el.closest("details");
      if (det && !det.open) det.open = true;
      el.classList.add("tour-spot");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => { window.clearInterval(timer); el?.classList.remove("tour-spot"); };
  }, [st.status, st.min, st.step, here, s?.target, s?.section]);

  if (!inDashboard || st.status !== "active" || !s) return null;

  const done = !!(s.done && prog && s.done(prog));
  const last = st.step === list.length - 1;
  const go = (step: number) => write({ ...st, step, min: false });
  const next = () => (last ? write({ ...st, status: "done" }) : go(st.step + 1));
  const close = () => write({ ...st, status: "hidden" });

  return (
    <>
      <style>{`.tour-spot{outline:3px solid var(--gold);outline-offset:4px;border-radius:10px;animation:tourPulse 1.4s ease-in-out infinite;position:relative;z-index:30}@keyframes tourPulse{0%,100%{outline-color:color-mix(in oklab,var(--gold) 100%,transparent)}50%{outline-color:color-mix(in oklab,var(--gold) 35%,transparent)}}`}</style>
      <AnimatePresence mode="wait">
        {st.min ? (
          <motion.button
            key="pill"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            onClick={() => write({ ...st, min: false })}
            className="fixed bottom-20 start-3 z-50 inline-flex min-h-11 items-center gap-2 rounded-full bg-charcoal px-4 text-sm text-ivory shadow-elegant sm:bottom-6 dark:bg-gold dark:text-charcoal"
          >
            <ChevronUp className="h-4 w-4" />
            {st.step === 0 ? tr("جولة البداية") : tr("الخطوة {0} من {1}", [st.step, list.length - 1])}
          </motion.button>
        ) : (
          <motion.div
            key={`step-${st.step}`}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md sm:bottom-6"
            role="dialog"
            aria-label={tr("جولة المصوّرة")}
          >
            <div className="rounded-xl border border-gold/40 bg-card p-4 shadow-elegant">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">{st.step === 0 ? tr("جولة البداية") : tr("الخطوة {0} من {1}", [st.step, list.length - 1])}</span>
                <div className="flex items-center">
                  <button onClick={() => write({ ...st, min: true })} aria-label={tr("تصغير")} className="grid h-10 w-10 place-items-center text-muted-foreground hover:text-foreground"><ChevronDown className="h-4 w-4" /></button>
                  <button onClick={close} aria-label={tr("إخفاء الجولة")} className="grid h-10 w-10 place-items-center text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="mb-3 flex gap-1">
                {list.slice(1).map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < st.step ? "bg-gold" : "bg-secondary"}`} />)}
              </div>

              <h2 className="font-serif text-lg leading-snug">{tx(s.title)}</h2>
              <ol className="mt-2 space-y-1.5">
                {s.lines.map((l, i) => (
                  <li key={i} className="flex gap-2 text-[15px] leading-relaxed">
                    {s.lines.length > 1 && <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold/15 text-[11px] text-gold">{(i + 1).toLocaleString("ar-JO")}</span>}
                    <span>{tx(l)}</span>
                  </li>
                ))}
              </ol>

              {done && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-700 dark:text-emerald-300">
                  <Check className="h-4 w-4" /> {g(tr("أنجزتِها ✓"), tr("أنجزتها ✓"))}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                {st.step > 0 && (
                  <button onClick={() => go(st.step - 1)} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border px-4 text-sm hover:bg-secondary">
                    <ArrowRight className="h-4 w-4" /> {tr("السابق")}
                  </button>
                )}
                {!here ? (
                  <button onClick={() => nav({ to: s.page as any })} className="ms-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-gold px-5 text-sm font-medium text-charcoal">
                    {g(tr("خذيني إلى هناك"), tr("خذني إلى هناك"))} <ArrowLeft className="h-4 w-4" />
                  </button>
                ) : (
                  <button onClick={next} className={`ms-auto inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-medium ${done || !s.done ? "bg-gold text-charcoal" : "border border-border"}`}>
                    {last ? tr("انتهينا ✓") : st.step === 0 ? tr("يلّا نبدأ") : done || !s.done ? tr("التالي") : tr("تخطّي الآن")} {!last && <ArrowLeft className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
