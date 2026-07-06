import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listBookingsAdmin, adminCancelBooking } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Calendar, Ban, Eye, RefreshCw, CheckCircle2, Clock, AlertTriangle, X } from "lucide-react";
import { PageLoader } from "@/components/ui/loading";

export const Route = createFileRoute("/admin/bookings")({
  component: AdminBookingsPage,
});

type BookingRow = {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  event_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  deposit_amount: number;
  status: string;
  photographer_id: string;
  photographer: { username: string; display_name: string } | null;
};

function AdminBookingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState<BookingRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const getBookings = useServerFn(listBookingsAdmin);
  const cancelBookingFn = useServerFn(adminCancelBooking);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getBookings();
      setBookings((data as BookingRow[]) ?? []);
    } catch (e: any) {
      toast.error(e.message || "فشل تحميل الحجوزات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submitCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      toast.error("سبب الإلغاء مطلوب");
      return;
    }
    setCancelling(true);
    try {
      await cancelBookingFn({ data: { booking_id: cancelTarget.id, reason: cancelReason.trim() } });
      toast.success("تم إلغاء الحجز بنجاح");
      setCancelTarget(null);
      setCancelReason("");
      load();
    } catch (e: any) {
      const msg = e.message || "";
      if (msg === "CANNOT_CANCEL_COMPLETED") toast.error("لا يمكن إلغاء حجز مكتمل");
      else if (msg === "ALREADY_CANCELLED") toast.error("الحجز ملغى مسبقاً");
      else toast.error(msg || "فشل إلغاء الحجز");
    } finally {
      setCancelling(false);
    }
  };

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      b.client_name?.toLowerCase().includes(q) ||
      b.client_email?.toLowerCase().includes(q) ||
      b.client_phone?.includes(q) ||
      b.photographer?.display_name?.toLowerCase().includes(q) ||
      b.photographer?.username?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <PageLoader />;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="font-serif text-2xl">إدارة جميع الحجوزات ({bookings.length})</h2>
        <button onClick={load} className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-3.5 w-3.5" /> تحديث
        </button>
      </div>

      {/* ─── Filters ─── */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف أو المصوّرة…"
          className="border border-border bg-card rounded-sm px-3 py-2 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-gold"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-border bg-card rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
        >
          <option value="all">جميع الحالات</option>
          <option value="quote">عرض سعر</option>
          <option value="pending_deposit">بانتظار العربون</option>
          <option value="confirmed">مؤكّد</option>
          <option value="completed">مكتمل</option>
          <option value="cancelled">ملغى</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">جدول الحجوزات</caption>
          <thead className="bg-secondary text-xs uppercase tracking-wider">
            <tr>
              <th className="text-start p-3">العميل</th>
              <th className="text-start p-3">المصوّرة</th>
              <th className="text-start p-3">التاريخ والوقت</th>
              <th className="text-start p-3">المجموع</th>
              <th className="text-start p-3">العربون</th>
              <th className="text-start p-3">الحالة</th>
              <th className="text-start p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="border-t border-border hover:bg-secondary/30">
                <td className="p-3">
                  <div className="font-medium">{b.client_name}</div>
                  <div className="text-xs text-muted-foreground">{b.client_phone}</div>
                  <div className="text-xs text-muted-foreground">{b.client_email}</div>
                </td>
                <td className="p-3">
                  {b.photographer ? (
                    <div>
                      <div className="font-medium">{b.photographer.display_name}</div>
                      <div className="text-xs text-muted-foreground">@{b.photographer.username}</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="font-medium">
                    {new Date(b.event_date).toLocaleDateString("ar-JO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </div>
                  <div className="text-xs text-muted-foreground">من {b.start_time?.slice(0, 5)} إلى {b.end_time?.slice(0, 5)}</div>
                </td>
                <td className="p-3 font-serif">{Number(b.total_price ?? 0).toLocaleString("ar-JO")} د.أ</td>
                <td className="p-3 font-serif">{Number(b.deposit_amount ?? 0).toLocaleString("ar-JO")} د.أ</td>
                <td className="p-3"><StatusBadge status={b.status} /></td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => navigate({ to: `/dashboard/bookings/${b.id}` as any })}
                      className="text-xs px-2.5 py-1.5 rounded-sm border border-border hover:bg-secondary inline-flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" /> معاينة
                    </button>
                    {b.status !== "cancelled" && b.status !== "completed" && (
                      <button
                        onClick={() => { setCancelTarget(b); setCancelReason(""); }}
                        className="text-xs px-2.5 py-1.5 rounded-sm bg-destructive text-destructive-foreground hover:opacity-90 inline-flex items-center gap-1"
                      >
                        <Ban className="h-3 w-3" /> إلغاء الحجز
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  {search || statusFilter !== "all" ? "لا توجد نتائج تطابق البحث" : "لا توجد حجوزات مسجلة"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Cancel Modal ─── */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4" onClick={() => !cancelling && setCancelTarget(null)}>
          <div className="bg-card border border-border rounded-sm p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl">إلغاء الحجز</h3>
              <button onClick={() => setCancelTarget(null)} disabled={cancelling} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-destructive/5 border border-destructive/20 rounded-sm p-3 mb-5 text-sm">
              <p className="font-medium text-destructive mb-1">تحذير: هذا الإجراء لا يمكن التراجع عنه</p>
              <p className="text-muted-foreground text-xs">حجز العميل <strong>{cancelTarget.client_name}</strong> لدى المصوّرة <strong>{cancelTarget.photographer?.display_name ?? "—"}</strong></p>
              <p className="text-muted-foreground text-xs">بتاريخ {new Date(cancelTarget.event_date).toLocaleDateString("ar-JO")}</p>
            </div>

            <label className="block text-sm font-medium mb-2">سبب الإلغاء <span className="text-destructive">*</span></label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              placeholder="اكتب سبب إلغاء الحجز بوضوح..."
              className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-destructive mb-5"
            />

            <div className="flex gap-3">
              <button
                onClick={submitCancel}
                disabled={cancelling || !cancelReason.trim()}
                className="flex-1 bg-destructive text-destructive-foreground py-2.5 rounded-sm text-sm font-medium hover:opacity-90 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {cancelling ? <><RefreshCw className="h-4 w-4 animate-spin" /> جاري الإلغاء…</> : <><Ban className="h-4 w-4" /> تأكيد الإلغاء</>}
              </button>
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="px-4 py-2.5 rounded-sm text-sm border border-border hover:bg-secondary transition disabled:opacity-50"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    quote: { cls: "bg-secondary text-foreground border-border", icon: <Clock className="h-3 w-3" />, label: "عرض سعر" },
    pending_deposit: { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock className="h-3 w-3" />, label: "بانتظار العربون" },
    confirmed: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" />, label: "مؤكّد" },
    completed: { cls: "bg-blue-50 text-blue-700 border-blue-200", icon: <CheckCircle2 className="h-3 w-3" />, label: "مكتمل" },
    cancelled: { cls: "bg-destructive/10 text-destructive border-destructive/20", icon: <AlertTriangle className="h-3 w-3" />, label: "ملغى" },
  };
  const c = map[status] ?? map.quote;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border ${c.cls}`}>
      {c.icon} {c.label}
    </span>
  );
}
