import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Star } from "lucide-react";
import {
  listReviewsAdmin,
  adminApproveReview,
  adminRejectReview,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviews,
});

type Row = {
  id: string;
  photographer_id: string;
  booking_id: string;
  client_name: string;
  rating: number;
  comment: string | null;
  is_published: boolean;
  created_at: string;
  profile?: { username: string; display_name: string } | null;
};

function AdminReviews() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const listFn = useServerFn(listReviewsAdmin);
  const approveFn = useServerFn(adminApproveReview);
  const rejectFn = useServerFn(adminRejectReview);

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
    try {
      await approveFn({ data: { review_id: row.id } });
      toast.success("تم نشر التقييم");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const reject = async (row: Row) => {
    try {
      await rejectFn({ data: { review_id: row.id } });
      toast.success("تم إخفاء التقييم");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground">جاري التحميل…</div>;

  const pending = rows.filter((r) => !r.is_published);
  const published = rows.filter((r) => r.is_published);

  return (
    <section>
      <h2 className="font-serif text-2xl mb-4">مراجعة التقييمات</h2>

      <h3 className="font-serif text-lg mb-3">قيد المراجعة ({pending.length})</h3>
      {pending.length === 0 ? (
        <div className="rounded-sm border border-border bg-card p-6 text-muted-foreground text-sm mb-10">
          لا توجد تقييمات بانتظار المراجعة.
        </div>
      ) : (
        <div className="space-y-3 mb-10">
          {pending.map((r) => (
            <ReviewRow key={r.id} r={r} onApprove={() => approve(r)} onReject={() => reject(r)} />
          ))}
        </div>
      )}

      <h3 className="font-serif text-lg mb-3">المنشورة ({published.length})</h3>
      <div className="space-y-3">
        {published.map((r) => (
          <ReviewRow key={r.id} r={r} onReject={() => reject(r)} />
        ))}
      </div>
    </section>
  );
}

function ReviewRow({
  r, onApprove, onReject,
}: { r: Row; onApprove?: () => void; onReject?: () => void }) {
  return (
    <div className="rounded-sm border border-border bg-card p-4 flex flex-wrap items-start gap-4">
      <div className="flex-1 min-w-[200px]">
        <div className="font-medium flex items-center gap-2">
          {r.client_name}
          <span className="inline-flex items-center gap-0.5 text-gold text-xs">
            {Array.from({ length: r.rating }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-current" />
            ))}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          للمصوّرة {r.profile?.display_name ?? "—"}
          {r.profile?.username ? ` @${r.profile.username}` : ""} ·{" "}
          {new Date(r.created_at).toLocaleString("ar-JO")}
        </div>
        {r.comment && <p className="text-sm mt-2 leading-relaxed">{r.comment}</p>}
      </div>
      <span className={`text-xs px-2 py-1 rounded-sm ${r.is_published ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
        {r.is_published ? "منشور" : "قيد المراجعة"}
      </span>
      <div className="flex gap-2">
        {onApprove && (
          <button onClick={onApprove} className="bg-emerald-600 text-white px-3 py-2 rounded-sm text-xs inline-flex items-center gap-1 hover:opacity-90">
            <Check className="h-3.5 w-3.5" /> نشر
          </button>
        )}
        {onReject && (
          <button onClick={onReject} className="bg-destructive text-destructive-foreground px-3 py-2 rounded-sm text-xs inline-flex items-center gap-1 hover:opacity-90">
            <X className="h-3.5 w-3.5" /> {r.is_published ? "إخفاء" : "رفض"}
          </button>
        )}
      </div>
    </div>
  );
}
