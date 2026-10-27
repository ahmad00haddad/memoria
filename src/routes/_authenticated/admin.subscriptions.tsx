import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, X, ExternalLink, RefreshCw } from "lucide-react";
import {
  listSubscriptionPaymentsAdmin,
  adminApproveSubscriptionPayment,
  adminRejectSubscriptionPayment,
} from "@/lib/admin.functions";
import { PageLoader } from "@/components/ui/loading";
import { locale } from "@/i18n";
import { t, tx } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  component: AdminSubs,
});

type PaymentRow = {
  id: string;
  photographer_id: string;
  amount: number;
  period_months?: number | null;
  method: string;
  status: string;
  proof_url: string | null;
  cliq_reference: string | null;
  created_at: string;
  notes: string | null;
  proof_signed_url?: string | null;
  payment_reference?: string | null;
  payer_confirmed_at?: string | null;
  email?: string | null;
  profile?: { username: string; display_name: string } | null;
};

function AdminSubs() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PaymentRow[]>([]);

  // Modal state — approve
  const [approveRow, setApproveRow] = useState<PaymentRow | null>(null);
  const [approveMonths, setApproveMonths] = useState(1);
  const [approving, setApproving] = useState(false);

  // Modal state — reject
  const [rejectRow, setRejectRow] = useState<PaymentRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const listFn = useServerFn(listSubscriptionPaymentsAdmin);
  const approveFn = useServerFn(adminApproveSubscriptionPayment);
  const rejectFn = useServerFn(adminRejectSubscriptionPayment);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listFn();
      setRows((data as PaymentRow[]) ?? []);
    } catch (e: any) {
      toast.error(e.message || t("فشل تحميل الدفعات"));
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const submitApprove = async () => {
    if (!approveRow) return;
    if (!Number.isInteger(approveMonths) || approveMonths < 1 || approveMonths > 36) {
      toast.error(t("أدخل عدد أشهر بين 1 و36"));
      return;
    }
    setApproving(true);
    try {
      await approveFn({ data: { payment_id: approveRow.id, months: approveMonths } });
      toast.success(t("تم تفعيل الاشتراك لمدة {0} شهر ✓", [approveMonths]));
      setApproveRow(null);
      setApproveMonths(1);
      load();
    } catch (e: any) {
      toast.error(e.message || t("فشل تفعيل الاشتراك"));
    }
    setApproving(false);
  };

  const submitReject = async () => {
    if (!rejectRow) return;
    if (!rejectReason.trim()) {
      toast.error(t("أدخل سبب الرفض"));
      return;
    }
    setRejecting(true);
    try {
      await rejectFn({ data: { payment_id: rejectRow.id, reason: rejectReason.trim() } });
      toast.success(t("تم رفض الدفعة"));
      setRejectRow(null);
      setRejectReason("");
      load();
    } catch (e: any) {
      toast.error(e.message || t("فشل رفض الدفعة"));
    }
    setRejecting(false);
  };

  if (loading) return <PageLoader />;

  // دفعات زبوني غير المؤكّدة = صفحة دفع فُتحت فقط؛ نعرضها بعد المؤكّدة.
  const unconfirmed = (r: PaymentRow) => (r.method === "zbooni" && !r.payer_confirmed_at) || r.method === "gateway";
  const pending = rows
    .filter((r) => r.status === "pending")
    .sort((a, b) => Number(unconfirmed(a)) - Number(unconfirmed(b)));
  const reviewed = rows.filter((r) => r.status !== "pending");

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl">{t("مراجعة دفعات الاشتراك")}</h2>
          <a href="https://www.zbooni.com/dashboard/orders" target="_blank" rel="noreferrer" className="text-xs text-gold inline-flex items-center gap-1 hover:underline">
            {t("طلبات زبوني للمطابقة")}{" "}<ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <button onClick={load} className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-3.5 w-3.5" />{" "}{t("تحديث")}
        </button>
      </div>

      <h3 className="font-serif text-lg mb-3">{t("قيد المراجعة ({0})", [pending.length])}</h3>
      {pending.length === 0 ? (
        <div className="rounded-sm border border-border bg-card p-6 text-muted-foreground text-sm mb-10">{t("لا توجد دفعات معلّقة.")}</div>
      ) : (
        <div className="space-y-3 mb-10">
          {pending.map((r) => (
            <PaymentCard
              key={r.id}
              r={r}
              url={r.proof_signed_url ?? undefined}
              onApprove={() => { setApproveRow(r); setApproveMonths(r.period_months || 1); }}
              onReject={() => { setRejectRow(r); setRejectReason(""); }}
            />
          ))}
        </div>
      )}

      <h3 className="font-serif text-lg mb-3">{t("السجل ({0})", [reviewed.length])}</h3>
      <div className="space-y-3">
        {reviewed.map((r) => (
          <PaymentCard key={r.id} r={r} url={r.proof_signed_url ?? undefined} />
        ))}
      </div>

      {/* ─── Modal: اعتماد الاشتراك ─── */}
      {approveRow && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4" onClick={() => !approving && setApproveRow(null)}>
          <div className="bg-card border border-border rounded-sm p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-xl mb-1">{t("اعتماد دفعة الاشتراك")}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              <span className="font-medium">{approveRow.profile?.display_name ?? "—"}</span>
              {approveRow.profile?.username && <span className="text-xs me-1">@{tx(approveRow.profile.username)}</span>}
              <span className="me-2 text-gold font-semibold">{tx(approveRow.amount)} JD</span>
            </p>

            <label className="block text-sm font-medium mb-2">{t("عدد أشهر الاشتراك")}</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[1, 3, 6, 12].map((m) => (
                <button
                  key={m}
                  onClick={() => setApproveMonths(m)}
                  className={`py-2.5 rounded-sm text-sm border transition ${approveMonths === m ? "bg-gold text-white border-gold" : "border-border hover:bg-secondary"}`}
                >
                  {m === 1 ? t("شهر") : t("{0} أشهر", [m])}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-5">
              <label className="text-sm text-muted-foreground whitespace-nowrap">{t("عدد مخصص:")}</label>
              <input
                type="number"
                min={1}
                max={36}
                value={approveMonths}
                onChange={(e) => setApproveMonths(Math.max(1, Math.min(36, Number(e.target.value) || 1)))}
                className="border border-border rounded-sm px-2 py-1.5 text-sm bg-background w-20 focus:outline-none focus:ring-1 focus:ring-gold"
              />
              <span className="text-sm text-muted-foreground">{t("شهر")}</span>
            </div>

            {approveRow.method === "zbooni" && approveRow.period_months && approveMonths !== approveRow.period_months && (
              <div className="mb-4 rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {t("تنبيه: المصوّرة اختارت")}{" "}{approveRow.period_months === 12 ? t("السنوي (12 شهر)") : t("الشهري (شهر واحد)")}{" "}{t("ودفعت {0} JOD. تأكّد من طلب زبوني قبل تغيير المدة.", [approveRow.amount])}</div>
            )}
            <div className="flex gap-3">
              <button
                onClick={submitApprove}
                disabled={approving}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-sm text-sm font-medium hover:opacity-90 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {approving ? <><RefreshCw className="h-4 w-4 animate-spin" />{" "}{t("جاري التفعيل…")}</> : <><Check className="h-4 w-4" />{" "}{t("تفعيل الاشتراك")}</>}
              </button>
              <button
                onClick={() => setApproveRow(null)}
                disabled={approving}
                className="px-4 py-2.5 rounded-sm text-sm border border-border hover:bg-secondary transition disabled:opacity-50"
              >
                {t("إلغاء")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: رفض الدفعة ─── */}
      {rejectRow && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4" onClick={() => !rejecting && setRejectRow(null)}>
          <div className="bg-card border border-border rounded-sm p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-xl mb-1">{t("رفض الدفعة")}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              <span className="font-medium">{rejectRow.profile?.display_name ?? "—"}</span>
              {rejectRow.profile?.username && <span className="text-xs me-1">@{tx(rejectRow.profile.username)}</span>}
            </p>

            <label className="block text-sm font-medium mb-2">{t("سبب الرفض")}{" "}<span className="text-destructive">*</span></label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder={t("اكتب سبب رفض الدفعة بوضوح ليتم إخطار المصوّرة...")}
              className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-destructive mb-5"
            />

            <div className="flex gap-3">
              <button
                onClick={submitReject}
                disabled={rejecting || !rejectReason.trim()}
                className="flex-1 bg-destructive text-destructive-foreground py-2.5 rounded-sm text-sm font-medium hover:opacity-90 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {rejecting ? <><RefreshCw className="h-4 w-4 animate-spin" />{" "}{t("جاري الرفض…")}</> : <><X className="h-4 w-4" />{" "}{t("رفض الدفعة")}</>}
              </button>
              <button
                onClick={() => setRejectRow(null)}
                disabled={rejecting}
                className="px-4 py-2.5 rounded-sm text-sm border border-border hover:bg-secondary transition disabled:opacity-50"
              >
                {t("إلغاء")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PaymentCard({
  r, url, onApprove, onReject,
}: { r: PaymentRow; url?: string; onApprove?: () => void; onReject?: () => void }) {
  return (
    <div className="rounded-sm border border-border bg-card p-4 flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-[200px]">
        <div className="font-medium">{r.profile?.display_name ?? "—"} <span className="text-muted-foreground text-xs">@{tx(r.profile?.username)}</span></div>
        <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString(locale("ar-JO"))}</div>
        {r.cliq_reference && <div className="text-xs">{t("المرجع:")}{" "}<span className="font-mono">{tx(r.cliq_reference)}</span></div>}
        {r.method === "zbooni" && (
          <div className="text-xs font-semibold text-gold">
            {r.period_months === 12 ? t("Signature · سنوي") : t("Flex · شهري")}{" "}{t("— طابِق طلب زبوني بقيمة {0} JOD ومنتج «", [r.amount])}{r.period_months === 12 ? t("اشتراك سنوي") : t("اشتراك شهري")}»
          </div>
        )}
        {r.payment_reference && <div className="text-xs">{t("رمز الدفعة:")}{" "}<span className="font-mono" dir="ltr">{tx(r.payment_reference)}</span></div>}
        {r.email && <div className="text-xs">{t("الإيميل:")}{" "}<span dir="ltr">{tx(r.email)}</span></div>}
        {r.method === "gateway" && r.status === "pending" && (
          <div className="text-xs text-muted-foreground">{t("PayTabs: صفحة دفع لم تكتمل — يُحسم تلقائياً، لا تعتمدها يدوياً")}</div>
        )}
        {r.method === "zbooni" && r.status === "pending" && (
          <div className={`text-xs ${r.payer_confirmed_at ? "text-emerald-600" : "text-muted-foreground"}`}>
            {r.payer_confirmed_at ? t("أكّدت الدفع {0}", [new Date(r.payer_confirmed_at).toLocaleString(locale("ar-JO"))]) : t("فتحت صفحة الدفع ولم تؤكّد بعد")}
          </div>
        )}
        {r.notes && <div className="text-xs text-muted-foreground italic">{tx(r.notes)}</div>}
      </div>
      <div className="text-sm font-semibold">{tx(r.amount)} JD · {tx(r.method)}</div>
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="text-xs text-gold inline-flex items-center gap-1 hover:underline">
          {t("عرض الإثبات")}{" "}<ExternalLink className="h-3 w-3" />
        </a>
      )}
      <span className={`text-xs px-2 py-1 rounded-sm ${r.status === "approved" ? "bg-emerald-100 text-emerald-800" : r.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-amber-100 text-amber-800"}`}>
        {r.status === "approved" ? t("مُعتمد") : r.status === "rejected" ? t("مرفوض") : t("قيد المراجعة")}
      </span>
      {onApprove && (
        <div className="flex gap-2">
          <button onClick={onApprove} className="bg-emerald-600 text-white px-3 py-2 rounded-sm text-xs inline-flex items-center gap-1 hover:opacity-90">
            <Check className="h-3.5 w-3.5" />{" "}{t("اعتماد")}
          </button>
          <button onClick={onReject} className="bg-destructive text-destructive-foreground px-3 py-2 rounded-sm text-xs inline-flex items-center gap-1 hover:opacity-90">
            <X className="h-3.5 w-3.5" />{" "}{t("رفض")}
          </button>
        </div>
      )}
    </div>
  );
}
