import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listDisputesAdmin, adminResolveDispute } from "@/lib/admin.functions";
import { toast } from "sonner";
import { AlertTriangle, Check, X, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { PageLoader } from "@/components/ui/loading";

export const Route = createFileRoute("/_authenticated/admin/disputes")({
  component: AdminDisputesPage,
});

type DisputeRow = {
  id: string;
  booking_id: string;
  raised_by: string;
  raised_by_role: "client" | "photographer" | "admin";
  reason: string;
  status: "open" | "under_review" | "resolved" | "dismissed";
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
  booking: { client_name: string; photographer_id: string } | null;
  photographer: { username: string; display_name: string } | null;
};

function AdminDisputesPage() {
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [resolvingDispute, setResolvingDispute] = useState<DisputeRow | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [resolutionStatus, setResolutionStatus] = useState<"resolved" | "dismissed">("resolved");
  const [submitting, setSubmitting] = useState(false);

  const getDisputes = useServerFn(listDisputesAdmin);
  const resolveDisputeFn = useServerFn(adminResolveDispute);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getDisputes();
      setDisputes((data as DisputeRow[]) ?? []);
    } catch (e: any) {
      toast.error(e.message || "فشل تحميل النزاعات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingDispute) return;
    if (!resolutionText.trim()) {
      toast.error("يرجى كتابة تفاصيل الحل.");
      return;
    }

    setSubmitting(true);
    try {
      await resolveDisputeFn({
        data: {
          dispute_id: resolvingDispute.id,
          status: resolutionStatus,
          resolution: resolutionText.trim(),
        },
      });
      toast.success("تم تحديث حالة النزاع بنجاح");
      setResolvingDispute(null);
      setResolutionText("");
      load();
    } catch (e: any) {
      toast.error(e.message || "فشل حل النزاع");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-2xl">إدارة نزاعات الحجوزات ({disputes.length})</h2>
        <button onClick={load} className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-3.5 w-3.5" /> تحديث
        </button>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">جدول النزاعات</caption>
          <thead className="bg-secondary text-xs uppercase tracking-wider">
            <tr>
              <th className="text-start p-3">النزاع</th>
              <th className="text-start p-3">الحجز المتأثر</th>
              <th className="text-start p-3">مرفوع من</th>
              <th className="text-start p-3">السبب</th>
              <th className="text-start p-3">الحالة</th>
              <th className="text-start p-3">الحل / القرار</th>
              <th className="text-start p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {disputes.map((d) => (
              <tr key={d.id} className="border-t border-border hover:bg-secondary/30">
                <td className="p-3">
                  <div className="font-medium text-xs text-muted-foreground">{d.id.slice(0, 8)}...</div>
                  <div className="text-[11px]">{new Date(d.created_at).toLocaleString("ar-JO")}</div>
                </td>
                <td className="p-3">
                  {d.booking ? (
                    <div>
                      <div className="font-medium">عميل: {d.booking.client_name}</div>
                      {d.photographer && (
                        <div className="text-xs text-gold">مصورة: {d.photographer.display_name}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    d.raised_by_role === "client" ? "bg-blue-50 text-blue-700 border-blue-100" :
                    d.raised_by_role === "photographer" ? "bg-purple-50 text-purple-700 border-purple-100" :
                    "bg-secondary text-muted-foreground"
                  }`}>
                    {d.raised_by_role === "client" ? "عميل" : d.raised_by_role === "photographer" ? "مصوّرة" : "أدمن"}
                  </span>
                </td>
                <td className="p-3 max-w-[200px] truncate" title={d.reason}>{d.reason}</td>
                <td className="p-3">
                  <DisputeStatusBadge status={d.status} />
                </td>
                <td className="p-3 max-w-[200px] truncate text-xs" title={d.resolution ?? ""}>
                  {d.resolution ? (
                    <span className="text-muted-foreground">{d.resolution}</span>
                  ) : (
                    <span className="text-muted-foreground italic">—</span>
                  )}
                </td>
                <td className="p-3">
                  {d.status !== "resolved" && d.status !== "dismissed" && (
                    <button
                      onClick={() => {
                        setResolvingDispute(d);
                        setResolutionStatus("resolved");
                      }}
                      className="text-xs px-2.5 py-1.5 rounded-sm bg-charcoal text-ivory hover:opacity-90 inline-flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3" /> حل النزاع
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {disputes.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد نزاعات مفتوحة أو مسجلة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {resolvingDispute && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" onClick={() => setResolvingDispute(null)}>
          <div className="bg-card border border-border rounded-sm p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-xl mb-1">حل النزاع</h3>
            <p className="text-xs text-muted-foreground mb-4">المعرف: {resolvingDispute.id}</p>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">السبب المرفوع</label>
                <div className="p-3 bg-secondary rounded-sm text-sm text-foreground">{resolvingDispute.reason}</div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">القرار والنتيجة</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResolutionStatus("resolved")}
                    className={`flex-1 py-2 text-xs border rounded-sm ${
                      resolutionStatus === "resolved"
                        ? "border-emerald-500 bg-emerald-50/50 text-emerald-700"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    تحديد كمحلول (Resolved)
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionStatus("dismissed")}
                    className={`flex-1 py-2 text-xs border rounded-sm ${
                      resolutionStatus === "dismissed"
                        ? "border-destructive/50 bg-destructive/5 text-destructive"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    حفظ / تجاهل (Dismissed)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">تفاصيل الحل المكتوب</label>
                <textarea
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="اكتب تفاصيل القرار أو التسوية هنا..."
                  rows={4}
                  className="w-full text-sm p-2.5 border border-border bg-background rounded-sm focus:outline-none focus:border-gold"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 text-xs bg-charcoal text-ivory hover:opacity-90 rounded-sm disabled:opacity-50"
                >
                  {submitting ? "جاري الإرسال..." : "حفظ القرار"}
                </button>
                <button
                  type="button"
                  onClick={() => setResolvingDispute(null)}
                  className="flex-1 py-2 text-xs border border-border hover:bg-secondary rounded-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function DisputeStatusBadge({ status }: { status: DisputeRow["status"] }) {
  const map: Record<DisputeRow["status"], { cls: string; icon: React.ReactNode; label: string }> = {
    open: { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <AlertCircle className="h-3 w-3" />, label: "مفتوح" },
    under_review: { cls: "bg-blue-50 text-blue-700 border-blue-200", icon: <Clock className="h-3 w-3" />, label: "تحت المراجعة" },
    resolved: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" />, label: "محلول" },
    dismissed: { cls: "bg-secondary text-muted-foreground border-border", icon: <X className="h-3 w-3" />, label: "مرفوض" },
  };
  const c = map[status] ?? map.open;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border ${c.cls}`}>
      {c.icon} {c.label}
    </span>
  );
}
