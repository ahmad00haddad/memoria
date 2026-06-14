import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, ExternalLink } from "lucide-react";
import {
  listSubscriptionPaymentsAdmin,
  adminApproveSubscriptionPayment,
  adminRejectSubscriptionPayment,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/subscriptions")({
  component: AdminSubs,
});

type Row = {
  id: string;
  photographer_id: string;
  amount: number;
  method: string;
  status: string;
  proof_url: string | null;
  cliq_reference: string | null;
  created_at: string;
  notes: string | null;
  proof_signed_url?: string | null;
  profile?: { username: string; display_name: string } | null;
};

function AdminSubs() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const listFn = useServerFn(listSubscriptionPaymentsAdmin);
  const approveFn = useServerFn(adminApproveSubscriptionPayment);
  const rejectFn = useServerFn(adminRejectSubscriptionPayment);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate({ to: "/login" }); return; }
    try {
      const data = await listFn();
      setRows((data as Row[]) ?? []);
    } catch (e: any) {
      toast.error(e.message || "ليست لديك صلاحية");
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const approve = async (row: Row) => {
    const monthsStr = window.prompt("عدد الأشهر:", "1");
    const months = Number(monthsStr);
    if (!Number.isInteger(months) || months < 1 || months > 36) {
      toast.error("أدخلي عدد أشهر بين 1 و36");
      return;
    }
    try {
      await approveFn({ data: { payment_id: row.id, months } });
      toast.success("تم تفعيل الاشتراك");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const reject = async (row: Row) => {
    const reason = window.prompt("سبب الرفض:");
    if (!reason) return;
    try {
      await rejectFn({ data: { payment_id: row.id, reason } });
      toast.success("تم رفض الدفعة");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground">جاري التحميل…</div>;

  const pending = rows.filter((r) => r.status === "pending");
  const reviewed = rows.filter((r) => r.status !== "pending");

  return (
    <section>
      <h2 className="font-serif text-2xl mb-4">مراجعة دفعات الاشتراك</h2>
      <h3 className="font-serif text-lg mb-3">قيد المراجعة ({pending.length})</h3>
        {pending.length === 0 ? (
          <div className="rounded-sm border border-border bg-card p-6 text-muted-foreground text-sm mb-10">لا توجد دفعات معلّقة.</div>
        ) : (
          <div className="space-y-3 mb-10">
            {pending.map((r) => <Row key={r.id} r={r} url={r.proof_signed_url ?? undefined} onApprove={() => approve(r)} onReject={() => reject(r)} />)}
          </div>
        )}

        <h3 className="font-serif text-lg mb-3">السجل ({reviewed.length})</h3>
        <div className="space-y-3">
          {reviewed.map((r) => <Row key={r.id} r={r} url={r.proof_signed_url ?? undefined} />)}
        </div>
    </section>
  );
}

function Row({ r, url, onApprove, onReject }: { r: Row; url?: string; onApprove?: () => void; onReject?: () => void }) {
  return (
    <div className="rounded-sm border border-border bg-card p-4 flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-[200px]">
        <div className="font-medium">{r.profile?.display_name ?? "—"} <span className="text-muted-foreground text-xs">@{r.profile?.username}</span></div>
        <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar-JO")}</div>
        {r.cliq_reference && <div className="text-xs">المرجع: <span className="font-mono">{r.cliq_reference}</span></div>}
        {r.notes && <div className="text-xs text-muted-foreground italic">{r.notes}</div>}
      </div>
      <div className="text-sm">{r.amount}$ · {r.method}</div>
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="text-xs text-gold inline-flex items-center gap-1 hover:underline">
          عرض الإثبات <ExternalLink className="h-3 w-3" />
        </a>
      )}
      <span className={`text-xs px-2 py-1 rounded-sm ${r.status === "approved" ? "bg-emerald-100 text-emerald-800" : r.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-amber-100 text-amber-800"}`}>
        {r.status === "approved" ? "مُعتمد" : r.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
      </span>
      {onApprove && (
        <div className="flex gap-2">
          <button onClick={onApprove} className="bg-emerald-600 text-white px-3 py-2 rounded-sm text-xs inline-flex items-center gap-1 hover:opacity-90">
            <Check className="h-3.5 w-3.5" /> اعتماد
          </button>
          <button onClick={onReject} className="bg-destructive text-destructive-foreground px-3 py-2 rounded-sm text-xs inline-flex items-center gap-1 hover:opacity-90">
            <X className="h-3.5 w-3.5" /> رفض
          </button>
        </div>
      )}
    </div>
  );
}
