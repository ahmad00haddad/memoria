import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listBookingsAdmin, adminCancelBooking } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Calendar, DollarSign, User, Camera, Ban, Eye, RefreshCw, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
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
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async (booking: BookingRow) => {
    const reason = window.prompt("أدخلي سبب إلغاء الحجز:");
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("سبب الإلغاء مطلوب.");
      return;
    }

    if (!(await confirm({
      title: "تأكيد إلغاء الحجز",
      description: `هل تريدين تأكيد إلغاء حجز العميل "${booking.client_name}"؟ سيتم إخطار الطرفين وإلغاء الموعد.`,
      confirmText: "إلغاء الحجز",
      destructive: true,
    }))) return;

    setCancellingId(booking.id);
    try {
      await cancelBookingFn({ data: { booking_id: booking.id, reason } });
      toast.success("تم إلغاء الحجز بنجاح");
      load();
    } catch (e: any) {
      toast.error(e.message || "فشل إلغاء الحجز");
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-2xl">إدارة جميع الحجوزات ({bookings.length})</h2>
        <button onClick={load} className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-3.5 w-3.5" /> تحديث
        </button>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider">
            <tr>
              <th className="text-start p-3">العميل</th>
              <th className="text-start p-3">المصورة</th>
              <th className="text-start p-3">التاريخ والوقت</th>
              <th className="text-start p-3">المجموع</th>
              <th className="text-start p-3">العربون</th>
              <th className="text-start p-3">الحالة</th>
              <th className="text-start p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t border-border hover:bg-secondary/30">
                <td className="p-3">
                  <div className="font-medium">{b.client_name}</div>
                  <div className="text-xs text-muted-foreground">{b.client_phone}</div>
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
                  <div className="font-medium">{new Date(b.event_date).toLocaleDateString("ar-JO", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  <div className="text-xs text-muted-foreground">من {b.start_time?.slice(0, 5)} إلى {b.end_time?.slice(0, 5)}</div>
                </td>
                <td className="p-3 font-serif">{b.total_price.toLocaleString("ar-JO")} د.أ</td>
                <td className="p-3 font-serif">{b.deposit_amount.toLocaleString("ar-JO")} د.أ</td>
                <td className="p-3">
                  <StatusBadge status={b.status} />
                </td>
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
                        onClick={() => handleCancel(b)}
                        disabled={cancellingId === b.id}
                        className="text-xs px-2.5 py-1.5 rounded-sm bg-destructive text-destructive-foreground hover:opacity-90 inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        <Ban className="h-3 w-3" /> {cancellingId === b.id ? "جاري الإلغاء..." : "إلغاء الحجز"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد حجوزات مسجلة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
