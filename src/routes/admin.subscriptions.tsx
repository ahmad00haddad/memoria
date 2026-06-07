import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, ExternalLink } from "lucide-react";

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
  profile?: { username: string; display_name: string } | null;
};

function AdminSubs() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate({ to: "/login" }); return; }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
    const admin = (roles ?? []).some((r: any) => r.role === "admin");
    setIsAdmin(admin);
    if (!admin) { setLoading(false); return; }

    const { data: payments } = await supabase
      .from("subscription_payments")
      .select("*")
      .order("created_at", { ascending: false });

    const ids = Array.from(new Set((payments ?? []).map((p: any) => p.photographer_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, username, display_name").in("id", ids)
      : { data: [] as any[] };
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));

    const enriched = (payments ?? []).map((p: any) => ({ ...p, profile: profMap.get(p.photographer_id) ?? null }));
    setRows(enriched as Row[]);

    // Signed URLs for proofs
    const urls: Record<string, string> = {};
    for (const r of enriched) {
      if (r.proof_url) {
        const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(r.proof_url, 3600);
        if (data?.signedUrl) urls[r.id] = data.signedUrl;
      }
    }
    setSignedUrls(urls);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const approve = async (row: Row) => {
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { error: e1 } = await supabase.from("subscription_payments").update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
    }).eq("id", row.id);
    if (e1) { toast.error(e1.message); return; }

    const { error: e2 } = await supabase.from("subscriptions").update({
      status: "active",
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
    }).eq("photographer_id", row.photographer_id);
    if (e2) { toast.error(e2.message); return; }

    toast.success("تم تفعيل الاشتراك");
    load();
  };

  const reject = async (row: Row) => {
    const reason = window.prompt("سبب الرفض:");
    if (!reason) return;
    const { error } = await supabase.from("subscription_payments").update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      notes: reason,
    }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("subscriptions").update({ status: "trial" }).eq("photographer_id", row.photographer_id);
    toast.success("تم رفض الدفعة");
    load();
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground">جاري التحميل…</div>;
  if (!isAdmin) return null;

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
            {pending.map((r) => <Row key={r.id} r={r} url={signedUrls[r.id]} onApprove={() => approve(r)} onReject={() => reject(r)} />)}
          </div>
        )}

        <h3 className="font-serif text-lg mb-3">السجل ({reviewed.length})</h3>
        <div className="space-y-3">
          {reviewed.map((r) => <Row key={r.id} r={r} url={signedUrls[r.id]} />)}
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
