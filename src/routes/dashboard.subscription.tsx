import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, Upload, Copy, AlertTriangle, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createSubscriptionCheckout } from "@/lib/payments.functions";

export const Route = createFileRoute("/dashboard/subscription")({
  component: SubscriptionPage,
});

// Admin's CliQ alias to receive subscription payments
const ADMIN_CLIQ_ALIAS = "ELITECAPTURE";
const ADMIN_CLIQ_NAME = "EliteCapture Platform";
const PRICE_USD = 9;
const PRICE_JOD = 7; // ~7 JOD = 9 USD

type Sub = {
  id: string;
  status: "trial" | "active" | "pending_review" | "expired" | "canceled";
  plan: string;
  trial_ends_at: string;
  current_period_end: string | null;
};

type Payment = {
  id: string;
  amount: number;
  method: "cliq" | "stripe";
  status: "pending" | "approved" | "rejected";
  created_at: string;
  notes: string | null;
};

function SubscriptionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<Sub | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [reference, setReference] = useState("");
  const [onlinePayLoading, setOnlinePayLoading] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const checkoutFn = useServerFn(createSubscriptionCheckout);

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
    setPayments((p ?? []) as Payment[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // ✅ دفع الاشتراك أونلاين عبر بوّابة الدفع
  const handleOnlinePayment = async () => {
    setOnlinePayLoading(true);
    try {
      const res: any = await checkoutFn({ data: { months: selectedMonths } });
      if (!res?.configured || !res?.url) {
        toast.message("الدفع الإلكتروني غير متاح حالياً. استخدمي CliQ للدفع اليدوي.");
        return;
      }
      window.location.href = res.url;
    } catch (e: any) {
      toast.error(e?.message || "تعذّر بدء عملية الدفع");
    } finally {
      setOnlinePayLoading(false);
    }
  };

  // عرض رسالة نجاح/إلغاء الدفع عند العودة من بوّابة الدفع
  useEffect(() => {
    const u = new URL(window.location.href);
    const status = u.searchParams.get("payment");
    if (status === "success") {
      toast.success("تم استلام دفعتك! سيتم تفعيل الاشتراك خلال لحظات…");
      u.searchParams.delete("payment");
      window.history.replaceState({}, "", u.toString());
      setTimeout(() => load(), 3000);
    } else if (status === "cancelled") {
      toast.message("أُلغي الدفع. يمكنك المحاولة مجدداً أو استخدام CliQ.");
      u.searchParams.delete("payment");
      window.history.replaceState({}, "", u.toString());
    }
    // eslint-disable-next-line
  }, []);

  const handleProofUpload = async (file: File) => {
    if (!userId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("subscription_payments").insert({
        photographer_id: userId,
        amount: PRICE_USD,
        method: "cliq",
        status: "pending",
        proof_url: path,
        cliq_reference: reference || null,
      });
      if (insErr) throw insErr;
      // Mark subscription as pending review
      await supabase.from("subscriptions").update({ status: "pending_review" }).eq("photographer_id", userId);
      toast.success("تم رفع الإثبات. سيتم تفعيل اشتراكك خلال 24 ساعة.");
      setReference("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e: any) {
      toast.error(e.message || "فشل رفع الإثبات");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <PageLoader />;

  const trialEnds = sub ? new Date(sub.trial_ends_at) : null;
  const periodEnds = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const trialDaysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / 86400000)) : 0;
  const isActive = sub && (
    (sub.status === "trial" && trialEnds && trialEnds.getTime() > Date.now()) ||
    (sub.status === "active" && (!periodEnds || periodEnds.getTime() > Date.now()))
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 max-w-4xl">
        <div className="mb-8">
          <BackToDashboard />
          <div className="text-xs uppercase tracking-[0.3em] text-gold mt-2 mb-1">الاشتراك</div>
          <h1 className="font-serif text-4xl">إدارة اشتراكك</h1>
        </div>

        {/* Status card */}
        <StatusCard sub={sub} isActive={!!isActive} trialDaysLeft={trialDaysLeft} periodEnds={periodEnds} />

        {/* Payment methods */}
        {sub?.status !== "active" && (
          <div className="mt-10">
            <h2 className="font-serif text-2xl mb-1">الدفع — {PRICE_USD}$ شهريًا</h2>
            <p className="text-sm text-muted-foreground mb-6">اختاري طريقة الدفع المناسبة لكِ.</p>

            <div className="grid gap-6 md:grid-cols-2">
              {/* CliQ */}
              <div className="rounded-sm border border-border bg-card p-6 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif text-xl">دفع عبر CliQ</h3>
                  <span className="text-[10px] uppercase tracking-[0.2em] bg-secondary px-2 py-1 rounded-sm">محلي · أردني</span>
                </div>
                <ol className="text-sm space-y-2 text-muted-foreground mb-5 list-decimal list-inside">
                  <li>افتحي تطبيق البنك ورسالة CliQ</li>
                  <li>حوّلي <span className="text-foreground font-semibold">{PRICE_JOD} د.أ</span> (~{PRICE_USD}$) إلى:</li>
                </ol>
                <div className="bg-secondary rounded-sm p-3 mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">CliQ Alias</div>
                    <div className="font-mono text-lg">{ADMIN_CLIQ_ALIAS}</div>
                    <div className="text-xs text-muted-foreground mt-1">{ADMIN_CLIQ_NAME}</div>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(ADMIN_CLIQ_ALIAS); toast.success("تم النسخ"); }}
                    className="p-2 hover:bg-card rounded-sm"
                    aria-label="نسخ"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="رقم العملية المرجعي (اختياري)"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full border border-border rounded-sm px-3 py-2 text-sm mb-3 bg-background"
                />

                <label className="block">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleProofUpload(f);
                    }}
                  />
                  <span className={`flex items-center justify-center gap-2 w-full bg-charcoal text-ivory py-3 rounded-sm cursor-pointer hover:opacity-90 ${uploading ? "opacity-60" : ""}`}>
                    <Upload className="h-4 w-4" />
                    {uploading ? "جاري الرفع…" : "رفع إثبات التحويل"}
                  </span>
                </label>
                <p className="text-[11px] text-muted-foreground mt-3 text-center">
                  سيُفعَّل الاشتراك يدويًا خلال 24 ساعة بعد التحقّق.
                </p>
              </div>

              {/* Stripe */}
              <div className="rounded-sm border border-dashed border-border bg-card/50 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif text-xl">بطاقة دولية</h3>
                  <span className="text-[10px] uppercase tracking-[0.2em] bg-secondary px-2 py-1 rounded-sm">قريبًا</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground mb-4">
                  <CreditCard className="h-8 w-8" />
                  <div className="text-sm">Visa · Mastercard · Apple Pay</div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  دفع تلقائي شهري بدون أي إجراءات يدوية. سيتم تفعيله قريبًا عبر Stripe.
                </p>
                <button disabled className="mt-5 w-full border border-border text-muted-foreground py-3 rounded-sm cursor-not-allowed">
                  متاح قريبًا
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment history */}
        {payments.length > 0 && (
          <div className="mt-12">
            <h2 className="font-serif text-2xl mb-4">سجل المدفوعات</h2>
            <div className="rounded-sm border border-border bg-card overflow-hidden">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 border-b border-border last:border-0">
                  <div>
                    <div className="text-sm">
                      {p.amount}$ · {p.method === "cliq" ? "CliQ" : "بطاقة"}
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ar-JO")}</div>
                    {p.notes && <div className="text-xs text-muted-foreground mt-1">{p.notes}</div>}
                  </div>
                  <PaymentBadge status={p.status} />
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

function StatusCard({ sub, isActive, trialDaysLeft, periodEnds }: {
  sub: Sub | null; isActive: boolean; trialDaysLeft: number; periodEnds: Date | null;
}) {
  if (!sub) {
    return (
      <div className="rounded-sm border border-border bg-card p-6 shadow-soft flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <div>لا يوجد اشتراك نشط لحسابك. تواصلي مع الدعم.</div>
      </div>
    );
  }

  const config = {
    trial: { color: "text-gold", bg: "bg-gold/10 border-gold/30", icon: <Clock className="h-5 w-5 text-gold" />, label: "تجربة مجانية" },
    active: { color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />, label: "نشط" },
    pending_review: { color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: <Clock className="h-5 w-5 text-amber-600" />, label: "قيد المراجعة" },
    expired: { color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", icon: <AlertTriangle className="h-5 w-5 text-destructive" />, label: "منتهي" },
    canceled: { color: "text-muted-foreground", bg: "bg-secondary border-border", icon: <AlertTriangle className="h-5 w-5" />, label: "ملغى" },
  }[sub.status];

  return (
    <div className={`rounded-sm border p-6 ${config.bg}`}>
      <div className="flex items-start gap-4">
        {config.icon}
        <div className="flex-1">
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-1">حالة الاشتراك</div>
          <div className={`font-serif text-2xl ${config.color} mb-2`}>{config.label}</div>
          {sub.status === "trial" && (
            <div className="text-sm">
              متبقّي <span className="font-semibold">{trialDaysLeft} يومًا</span> من تجربتك المجانية.
              {trialDaysLeft <= 5 && <span className="text-destructive"> اشتركي الآن لتجنّب التوقف!</span>}
            </div>
          )}
          {sub.status === "active" && periodEnds && (
            <div className="text-sm">يتجدّد في {periodEnds.toLocaleDateString("ar-JO")}</div>
          )}
          {sub.status === "pending_review" && (
            <div className="text-sm">تم استلام إثبات الدفع. سيُفعَّل اشتراكك خلال 24 ساعة.</div>
          )}
          {sub.status === "expired" && (
            <div className="text-sm">انتهى اشتراكك. ادفعي لاستعادة الوصول الكامل.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending: { label: "قيد المراجعة", cls: "bg-amber-100 text-amber-800" },
    approved: { label: "مُعتمد", cls: "bg-emerald-100 text-emerald-800" },
    rejected: { label: "مرفوض", cls: "bg-destructive/15 text-destructive" },
  }[status];
  return <span className={`text-xs px-2.5 py-1 rounded-sm ${map.cls}`}>{map.label}</span>;
}
