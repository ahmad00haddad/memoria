import { Lightbulb } from "lucide-react";
import { g } from "@/hooks/use-gender";
import { CopyButton } from "@/components/ui/copy-button";
import { motion } from "framer-motion";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, AlertTriangle, CreditCard, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { startZbooniSubscription, confirmZbooniSubscriptionPaid } from "@/lib/zbooni.functions";
import { getPayTabsStatus, startPayTabsSubscription } from "@/lib/paytabs.functions";
import { locale } from "@/i18n";
import { t, tx } from "@/i18n";

export const Route = createFileRoute("/_authenticated/dashboard/subscription")({
  component: SubscriptionPage,
});

import { PRICES, LEGACY_PRICES, PERIOD_MONTHS, TIER_NAME, BASIC_LIMITS, PRO_PHOTOS, isLegacy, priceFor, type Period, type Tier } from "@/lib/plans";

const PERIOD_LABEL: Record<Period, string> = { monthly: "شهري", yearly: "سنوي" };

// ما يميّز كل باقة — نفس ما هو مفروض فعلاً في المنصّة (لا وعود غير منفّذة).
const TIER_FEATURES: Record<Tier, string[]> = {
  basic: [
    "صفحتك العامة واستقبال الحجوزات والعربون",
    "التقويم والحجوزات اليدوية",
    "إشعارات الإيميل وتيليغرام",
    `حتى ${BASIC_LIMITS.packages} باقات و${BASIC_LIMITS.photos} صورة`,
  ],
  pro: [
    "كل ما في Basic",
    "شارة التوثيق ✓ تظهر للعرائس",
    "ظهور أعلى في نتائج البحث",
    `باقات بلا حد وحتى ${PRO_PHOTOS} صورة`,
    "العقود الرقمية وعروض الأسعار",
    "قوالب واتساب والتقارير",
  ],
};

type Sub = {
  id: string;
  status: "trial" | "active" | "pending_review" | "expired" | "canceled";
  plan: string;
  tier: Tier;
  legacy_price_until: string | null;
  trial_ends_at: string;
  current_period_end: string | null;
};

type Payment = {
  id: string;
  amount: number;
  method: "cliq" | "stripe" | "hyperpay" | "gateway" | "zbooni";
  status: "pending" | "approved" | "rejected";
  created_at: string;
  notes: string | null;
  period_months: number | null;
  payment_reference: string | null;
  payer_confirmed_at: string | null;
};

type ZbooniCheckout = { payment_id: string; reference: string | null; url: string; email: string | null; amount: number; name: string };

// دفعة زبوني مفتوحة ولم تؤكّد المصوّرة دفعها بعد — لا تُعدّ "قيد المراجعة".
const isOpenZbooni = (p: Payment) => p.method === "zbooni" && p.status === "pending" && !p.payer_confirmed_at;
// دفعة بطاقة (PayTabs) معلّقة = صفحة دفع فُتحت ولم تكتمل — PayTabs يحسمها تلقائياً.
const isOpenCheckout = (p: Payment) => isOpenZbooni(p) || (p.method === "gateway" && p.status === "pending");

const METHOD_LABEL: Record<Payment["method"], string> = {
  zbooni: "زبوني", cliq: "CliQ", stripe: "بطاقة", hyperpay: "بطاقة", gateway: "بطاقة · PayTabs",
};

function SubscriptionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<Sub | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payEarly, setPayEarly] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [zb, setZb] = useState<ZbooniCheckout | null>(null);
  const [starting, setStarting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [tier, setTier] = useState<Tier>("pro");
  const [period, setPeriod] = useState<Period>("yearly");
  const startFn = useServerFn(startZbooniSubscription);
  const ptStatusFn = useServerFn(getPayTabsStatus);
  const ptStartFn = useServerFn(startPayTabsSubscription);
  const [cardEnabled, setCardEnabled] = useState(false);
  const confirmFn = useServerFn(confirmZbooniSubscriptionPaid);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    setUserId(session.user.id);
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from("subscriptions").select("*").eq("photographer_id", session.user.id).maybeSingle(),
      supabase.from("subscription_payments").select("*").eq("photographer_id", session.user.id).order("created_at", { ascending: false }),
    ]);
    setSub(s as Sub | null);
    setPayments((p ?? []) as unknown as Payment[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    ptStatusFn().then((r: any) => setCardEnabled(!!r?.enabled)).catch(() => {});
    // نتيجة العودة من صفحة PayTabs
    const u = new URL(window.location.href);
    const result = u.searchParams.get("payment");
    if (result) {
      if (result === "success") toast.success(t("اشتراكك فعّال ✓ شكراً لثقتك بميموريا"));
      else if (result === "failed") toast.error(g(t("لم تكتمل عملية الدفع. يمكنكِ المحاولة مجدداً."), t("لم تكتمل عملية الدفع. يمكنك المحاولة مجدداً.")));
      else toast.message(t("نتحقّق من الدفعة… سيتحدّث الاشتراك خلال دقائق."));
      u.searchParams.delete("payment");
      window.history.replaceState({}, "", u.toString());
    }
    /* eslint-disable-next-line */
  }, []);

  // الدفع بالبطاقة عبر PayTabs (صفحة مستضافة) — دفعة يدوية لكل فترة
  const handleCardPay = async () => {
    setStarting(true);
    try {
      const res: any = await ptStartFn({ data: { tier, period } });
      if (!res?.configured || !res?.url) {
        setCardEnabled(false);
        toast.message(g(t("الدفع بالبطاقة غير متاح حالياً، استخدمي زبوني."), t("الدفع بالبطاقة غير متاح حالياً، استخدم زبوني.")));
        return;
      }
      window.location.href = res.url;
    } catch (e: any) {
      toast.error(e?.message || t("تعذّر فتح صفحة الدفع"));
      setStarting(false);
    }
  };

  // فتح صفحة الدفع على زبوني (تُنشئ/تعيد دفعة معلّقة برمز مرجعي)
  const handleZbooniPay = async () => {
    // نفتح النافذة قبل await حتى لا يحجبها المتصفح
    const win = window.open("", "_blank");
    setStarting(true);
    try {
      const res = (await startFn({ data: { tier, period } })) as ZbooniCheckout;
      setZb(res);
      if (win) win.location.href = res.url;
      else window.location.href = res.url;
      load();
    } catch (e: any) {
      win?.close();
      toast.error(e?.message || t("تعذّر فتح صفحة الدفع"));
    } finally {
      setStarting(false);
    }
  };

  const handleConfirmPaid = async (paymentId: string) => {
    setConfirming(true);
    try {
      await confirmFn({ data: { payment_id: paymentId } });
      setZb(null);
      toast.success(t("شكراً! سنطابق الدفعة ونفعّل اشتراكك خلال ساعات."));
      load();
    } catch (e: any) {
      toast.error(e?.message || t("تعذّر تأكيد الدفع"));
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <PageLoader />;

  const trialEnds = sub ? new Date(sub.trial_ends_at) : null;
  const periodEnds = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const trialDaysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / 86400000)) : 0;
  
  let effectiveStatus = sub?.status;
  if (sub) {
    if (effectiveStatus === "trial" && trialEnds && trialEnds.getTime() < Date.now()) {
      effectiveStatus = "expired";
    } else if (effectiveStatus === "active" && periodEnds && periodEnds.getTime() < Date.now()) {
      effectiveStatus = "expired";
    }
    if (effectiveStatus !== "active" && payments.some((p) => p.status === "pending" && !isOpenCheckout(p))) {
      effectiveStatus = "pending_review";
    }
  }

  const isActive = effectiveStatus === "active" || effectiveStatus === "trial";
  const legacy = isLegacy(sub?.legacy_price_until);
  const legacyEnds = sub?.legacy_price_until ? new Date(sub.legacy_price_until).toLocaleDateString(locale("ar-JO"), { day: "numeric", month: "long", year: "numeric" }) : "";
  const amount = priceFor(tier, period, sub?.legacy_price_until);
  const endsAt = effectiveStatus === "trial" ? trialEnds : periodEnds;
  const daysLeft = endsAt ? Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86400000)) : 0;
  // الدفع يظهر عند الانتهاء أو قرب الانتهاء، وإلا يبقى خلف زر "ادفعي مبكراً"
  const showPayment = effectiveStatus === "expired" || effectiveStatus === "canceled" || (isActive && daysLeft <= 7) || payEarly;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 max-w-4xl">
        <div className="mb-8">
          <BackToDashboard />
          <div className="text-xs uppercase tracking-[0.3em] text-gold mt-2 mb-1">{t("الاشتراك")}</div>
          <h1 className="font-serif text-4xl">{t("إدارة اشتراكك")}</h1>
        </div>

        {/* Status card */}
        <StatusCard sub={sub} effectiveStatus={effectiveStatus || "expired"} isActive={!!isActive} trialDaysLeft={trialDaysLeft} periodEnds={periodEnds} />

        {isActive && !showPayment && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{g(t("سيصلك تذكير قبل الانتهاء بـ ٧ أيام و٣ أيام. لا شيء مطلوب منكِ الآن."), t("سيصلك تذكير قبل الانتهاء بـ ٧ أيام و٣ أيام. لا شيء مطلوب منك الآن."))}</span>
            <button onClick={() => setPayEarly(true)} className="rounded-full border border-border px-4 py-1.5 text-xs hover:bg-secondary">{g(t("ادفعي مبكراً"), t("ادفع مبكراً"))}</button>
          </div>
        )}

        {/* Payment methods */}
        {showPayment && effectiveStatus !== "pending_review" && (
          <div className="mt-10">
            <h2 className="font-serif text-2xl mb-1">{g(t("اختاري باقتك"), t("اختر باقتك"))}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t("السنوي بـPro أوفر 40 د.أ — ودفعة واحدة بالسنة.")}</p>
            {legacy && (
              <div className="mb-4 rounded-sm border border-gold/40 bg-gold/5 p-3 text-sm">
                {g(t("أنتِ من أوائل المشتركات: باقة Pro بسعرك القديم ({0} د.أ شهري / {1} د.أ سنوي) حتى {2}.", [LEGACY_PRICES.monthly, LEGACY_PRICES.yearly, legacyEnds]), t("أنت من أوائل المشتركين: باقة Pro بسعرك القديم ({0} د.أ شهري / {1} د.أ سنوي) حتى {2}.", [LEGACY_PRICES.monthly, LEGACY_PRICES.yearly, legacyEnds]))}
              </div>
            )}
            <div className="mb-4 inline-flex rounded-full border border-border p-1" role="radiogroup" aria-label={t("مدة الاشتراك")}>
              {(["monthly", "yearly"] as Period[]).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={period === k} onClick={() => setPeriod(k)}
                  className={`rounded-full px-5 py-1.5 text-sm transition ${period === k ? "bg-charcoal text-ivory dark:bg-gold dark:text-charcoal" : "text-muted-foreground"}`}>
                  {tx(PERIOD_LABEL[k])}
                </button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mb-8" role="radiogroup" aria-label={t("الباقة")}>
              {(["basic", "pro"] as Tier[]).map((k) => {
                const active = tier === k;
                const price = priceFor(k, period, sub?.legacy_price_until);
                const saving = period === "yearly" ? priceFor(k, "monthly", sub?.legacy_price_until) * 12 - price : 0;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTier(k)}
                    className={`relative rounded-sm border p-4 text-start transition ${active ? "border-gold bg-gold/5 ring-1 ring-gold" : "border-border bg-card hover:border-foreground/30"}`}
                  >
                    {k === "pro" && (
                      <span className="absolute -top-2.5 end-3 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-charcoal">
                        {saving > 0 ? `${g(t("وفّري"), t("وفّر"))} ${t("{0} د.أ", [saving])}` : t("الأكثر اختياراً")}
                      </span>
                    )}
                    <div className="font-serif text-lg leading-tight">{TIER_NAME[k]}</div>
                    <div className="font-serif text-3xl mt-1">{tx(price)} <span className="text-sm font-sans">{t("د.أ")}</span> <span className="text-xs text-muted-foreground font-sans">{period === "yearly" ? t("/ سنة") : t("/ شهر")}</span></div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {period === "yearly" ? t("≈ {0} د.أ للشهر", [(price / 12).toFixed(1)]) : t("دفعة لشهر كامل")}
                    </div>
                    <ul className="mt-3 space-y-1 text-xs">
                      {TIER_FEATURES[k].map((f) => (
                        <li key={f} className="flex gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-gold mt-0.5" />{tx(f)}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
            {cardEnabled ? (
              <CardPayCard
                planName={TIER_NAME[tier]}
                planLabel={PERIOD_LABEL[period]}
                amount={amount}
                starting={starting}
                onPay={handleCardPay}
              />
            ) : (
              <ZbooniPayCard
                planName={TIER_NAME[tier]}
                planLabel={PERIOD_LABEL[period]}
                amount={amount}
                starting={starting}
                onPay={handleZbooniPay}
              />
            )}

            {(() => {
              // دفعة مفتوحة: من الجلسة الحالية أو من زيارة سابقة
              const open = zb
                ? { id: zb.payment_id, reference: zb.reference, amount: zb.amount }
                : (() => { const p = payments.find(isOpenZbooni); return p ? { id: p.id, reference: p.payment_reference, amount: p.amount } : null; })();
              if (!open) return null;
              return (
                <div className="mt-6 rounded-sm border border-gold/40 bg-gold/5 p-6">
                  <h3 className="font-serif text-xl mb-2">{g(t("أتممتِ الدفع على زبوني؟"), t("أتممت الدفع على زبوني؟"))}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {t("بعد إتمام دفع")}{" "}<span className="text-foreground font-semibold">{t("{0} د.أ", [open.amount])}</span> {g(t("اضغطي"), t("اضغط"))}{" "}{t("التأكيد، نطابق الدفعة ونفعّل اشتراكك خلال ساعات.")}
                    {zb?.email && <> {g(t("تأكّدي أنكِ دفعتِ بنفس البريد"), t("تأكّد أنك دفعت بنفس البريد"))} <span dir="ltr" className="text-foreground">{tx(zb.email)}</span>.</>}
                  </p>
                  {open.reference && (
                    <div className="bg-secondary rounded-sm p-3 mb-4 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t("رمز الدفعة")}</div>
                        <div className="font-mono text-lg" dir="ltr">{tx(open.reference)}</div>
                        <div className="text-xs text-muted-foreground mt-1">{g(t("اكتبيه في ملاحظات الطلب إن وُجدت"), t("اكتبه في ملاحظات الطلب إن وُجدت"))}</div>
                      </div>
                      <CopyButton value={open.reference} label={t("نسخ")} />
                    </div>
                  )}
                  <button
                    onClick={() => handleConfirmPaid(open.id)}
                    disabled={confirming}
                    className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-full hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
                  >
                    {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {confirming ? t("جارٍ التأكيد…") : t("نعم، دفعت")}
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {/* Payment history */}
        {payments.length > 0 && (
          <div className="mt-12">
            <h2 className="font-serif text-2xl mb-4">{t("سجل المدفوعات")}</h2>
            <div className="rounded-sm border border-border bg-card overflow-hidden">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 border-b border-border last:border-0">
                  <div>
                    <div className="text-sm">
                      {t("{0} د.أ ·", [p.amount])}{" "}{METHOD_LABEL[p.method] ?? p.method}
                      {p.payment_reference && <span className="text-xs text-muted-foreground font-mono" dir="ltr"> · {tx(p.payment_reference)}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString(locale("ar-JO"))}</div>
                    {p.notes && <div className="text-xs text-muted-foreground mt-1">{tx(p.notes)}</div>}
                  </div>
                  {isOpenCheckout(p)
                    ? <span className="text-xs px-2.5 py-1 rounded-sm bg-secondary text-muted-foreground">{t("لم يكتمل")}</span>
                    : <PaymentBadge status={p.status} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}

function CardPayCard({ planName, planLabel, amount, starting, onPay }: {
  planName: string; planLabel: string; amount: number; starting: boolean; onPay: () => void;
}) {
  return (
    <div className="rounded-sm border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif text-xl">{t("الدفع بالبطاقة")}</h3>
        <span className="text-[10px] uppercase tracking-[0.2em] bg-secondary px-2 py-1 rounded-sm">{t("آمن · بالدينار")}</span>
      </div>
      <div className="flex items-center gap-3 text-muted-foreground mb-4">
        <CreditCard className="h-8 w-8 shrink-0" />
        <div className="text-sm">Visa · Mastercard · Apple Pay</div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
        {t("باقة")}{" "}<span className="text-foreground font-semibold">{tx(planName)}</span> ({tx(planLabel)}) — <span className="text-foreground font-semibold">{t("{0} د.أ", [amount])}</span>{t(". يُفعَّل الاشتراك فور نجاح الدفع. دفعة لمرة واحدة، بدون أي خصم تلقائي.")}
      </p>
      <button
        onClick={onPay}
        disabled={starting}
        className="w-full inline-flex items-center justify-center gap-2 bg-charcoal text-ivory dark:bg-gold dark:text-charcoal py-3 rounded-full hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
      >
        {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        {starting ? t("نجهّز صفحة الدفع…") : g(t("ادفعي {0} د.أ", [amount]), t("ادفع {0} د.أ", [amount]))}
      </button>
      <p className="text-[11px] text-muted-foreground mt-3 text-center">
        {t("الدفع على صفحة PayTabs الآمنة — لا نحفظ بيانات بطاقتك.")}
      </p>
    </div>
  );
}

function ZbooniPayCard({ planName, planLabel, amount, starting, onPay }: {
  planName: string; planLabel: string; amount: number; starting: boolean; onPay: () => void;
}) {
  return (
    <div className="rounded-sm border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif text-xl">{t("الدفع عبر زبوني")}</h3>
        <span className="text-[10px] uppercase tracking-[0.2em] bg-secondary px-2 py-1 rounded-sm">{t("آمن · بالدينار")}</span>
      </div>
      <div className="flex items-center gap-3 text-muted-foreground mb-4">
        <CreditCard className="h-8 w-8 shrink-0" />
        <div className="text-sm">{t("Visa · Mastercard · Apple Pay · Google Pay · تقسيط Valu")}</div>
      </div>
      <ol className="text-sm space-y-1.5 text-muted-foreground mb-5 list-decimal list-inside">
        <li>{g(t("اضغطي الزر لفتح صفحة باقة"), t("اضغط الزر لفتح صفحة باقة"))} <span className="text-foreground font-semibold">{tx(planName)}</span>{" "}{t("({0}) على زبوني.", [planLabel])}</li>
        <li>{g(t("ادفعي"), t("ادفع"))} <span className="text-foreground font-semibold">{t("{0} د.أ", [amount])}</span>{" "}{t("بنفس بريدك المسجّل في Memoria.")}</li>
        <li>{g(t("ارجعي هنا واضغطي «نعم، دفعت»."), t("ارجع هنا واضغط «نعم، دفعت»."))}</li>
      </ol>
      <button
        onClick={onPay}
        disabled={starting}
        className="w-full inline-flex items-center justify-center gap-2 bg-charcoal text-ivory dark:bg-gold dark:text-charcoal py-3 rounded-full hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
      >
        {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
        {starting ? t("نجهّز صفحة الدفع…") : g(t("ادفعي {0} د.أ عبر زبوني", [amount]), t("ادفع {0} د.أ عبر زبوني", [amount]))}
      </button>
      <p className="text-[11px] text-muted-foreground mt-3 text-center">
        {t("الدفع يتم على صفحة زبوني الآمنة — لا نحفظ بيانات بطاقتك.")}
      </p>
    </div>
  );
}

function StatusCard({ sub, effectiveStatus, isActive, trialDaysLeft, periodEnds }: {
  sub: Sub | null; effectiveStatus: Sub['status']; isActive: boolean; trialDaysLeft: number; periodEnds: Date | null;
}) {
  if (!sub) {
    return (
      <div className="rounded-sm border border-border bg-card p-6 shadow-soft flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <div>{g(t("لا يوجد اشتراك نشط لحسابك. تواصلي مع الدعم."), t("لا يوجد اشتراك نشط لحسابك. تواصل مع الدعم."))}</div>
      </div>
    );
  }

  const config = {
    trial: { color: "text-gold", bg: "bg-gold/10 border-gold/30", icon: <Clock className="h-5 w-5 text-gold" />, label: t("تجربة مجانية") },
    active: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/50", icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />, label: t("نشط") },
    pending_review: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50", icon: <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />, label: t("قيد المراجعة") },
    expired: { color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", icon: <AlertTriangle className="h-5 w-5 text-destructive" />, label: t("منتهي") },
    canceled: { color: "text-muted-foreground", bg: "bg-secondary border-border", icon: <AlertTriangle className="h-5 w-5" />, label: t("ملغى") },
  }[effectiveStatus as 'trial' | 'active' | 'pending_review' | 'expired' | 'canceled'] || { color: 'text-muted-foreground', bg: 'bg-secondary border-border', icon: <AlertTriangle />, label: 'Unknown' };

  return (
    <div className={`rounded-sm border p-6 ${config.bg}`}>
      <div className="flex items-start gap-4">
        {tx(config.icon)}
        <div className="flex-1">
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-1">{t("حالة الاشتراك")}</div>
          <div className={`font-serif text-2xl ${config.color} mb-2`}>
            {tx(config.label)}
            {effectiveStatus === "active" && <span className="ms-2 align-middle rounded-full border border-gold/40 px-2 py-0.5 text-xs font-sans text-gold">{TIER_NAME[sub.tier] ?? "Pro"}</span>}
            {effectiveStatus === "trial" && <span className="ms-2 align-middle rounded-full border border-gold/40 px-2 py-0.5 text-xs font-sans text-gold">{t("كل ميزات Pro")}</span>}
          </div>
          {effectiveStatus === "trial" && (
            <div className="text-sm">
              {t("متبقّي")}{" "}<span className="font-semibold">{t("{0} يومًا", [trialDaysLeft])}</span>{" "}{t("من تجربتك المجانية.")}
              {trialDaysLeft <= 5 && <span className="text-destructive"> {g(t("اشتركي الآن لتجنّب التوقف!"), t("اشترك الآن لتجنّب التوقف!"))}</span>}
            </div>
          )}
          {effectiveStatus === "active" && periodEnds && (
            <div className="text-sm">{t("فعّال حتى {0}", [periodEnds.toLocaleDateString(locale("ar-JO"), { day: "numeric", month: "long" })])}</div>
          )}
          {(effectiveStatus === "active" || effectiveStatus === "trial") && (() => {
            const end = effectiveStatus === "trial" ? new Date(sub.trial_ends_at) : periodEnds;
            if (!end) return null;
            const left = Math.max(0, (end.getTime() - Date.now()) / 86400000);
            const pct = Math.max(4, Math.min(100, (left / 30) * 100));
            return (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-background/60">
                <div className={`h-full rounded-full transition-all duration-700 ${left <= 3 ? "bg-destructive" : left <= 7 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
              </div>
            );
          })()}
          {effectiveStatus === "pending_review" && (
            <div className="text-sm">{t("وصلنا إثبات الدفع، والمراجعة تتم عادةً خلال ساعات. ملفك يبقى ظاهراً خلال المراجعة.")}</div>
          )}
          {effectiveStatus === "expired" && (
            <div className="text-sm">{g(t("انتهى اشتراكك. ادفعي لاستعادة الوصول الكامل."), t("انتهى اشتراكك. ادفع لاستعادة الوصول الكامل."))}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending: { label: t("قيد المراجعة"), cls: "bg-amber-100 text-amber-800" },
    approved: { label: t("مُعتمد"), cls: "bg-emerald-100 text-emerald-800" },
    rejected: { label: t("مرفوض"), cls: "bg-destructive/15 text-destructive" },
  }[status];
  return <span className={`text-xs px-2.5 py-1 rounded-sm ${map.cls}`}>{tx(map.label)}</span>;
}
