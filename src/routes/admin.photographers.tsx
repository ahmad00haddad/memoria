import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listPhotographersAdmin,
  adminTogglePublish,
  adminRenewSubscription,
  adminDeletePhotographer,
  adminSoftDeletePhotographer,
  adminRestorePhotographer,
  adminVerifyPhotographer,
} from "@/lib/admin.functions";
import { Eye, EyeOff, RefreshCw, Trash2, ExternalLink, CheckCircle2, Clock, AlertTriangle, Archive, ArchiveRestore, X } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { PageLoader } from "@/components/ui/loading";

export const Route = createFileRoute("/admin/photographers")({
  component: AdminPhotographers,
});

type Row = {
  id: string;
  username: string;
  display_name: string;
  is_published: boolean;
  avatar_url: string | null;
  created_at: string;
  deleted_at?: string | null;
  verification_status?: string;
  bookings_count: number;
  reviews_count: number;
  subscription: {
    status: string;
    current_period_end: string | null;
    trial_ends_at: string | null;
  } | null;
};

function AdminPhotographers() {
  const list = useServerFn(listPhotographersAdmin);
  const togglePub = useServerFn(adminTogglePublish);
  const renew = useServerFn(adminRenewSubscription);
  const del = useServerFn(adminDeletePhotographer);
  const softDel = useServerFn(adminSoftDeletePhotographer);
  const restore = useServerFn(adminRestorePhotographer);
  const verify = useServerFn(adminVerifyPhotographer);
  const confirm = useConfirm();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewFor, setRenewFor] = useState<Row | null>(null);

  const onVerify = async (r: Row, status: "verified" | "rejected" | "unverified") => {
    try {
      await verify({ data: { photographer_id: r.id, status } });
      toast.success(status === "verified" ? "تم توثيق المصوّرة ✓" : "تم إلغاء توثيق المصوّرة");
      load();
    } catch (e: any) {
      toast.error(e.message || "تعذّر تعديل حالة التوثيق");
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = (await list()) as Row[];
      setRows(data);
    } catch (e: any) {
      toast.error(e.message || "فشل التحميل");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const onToggle = async (r: Row) => {
    try {
      await togglePub({ data: { photographer_id: r.id, published: !r.is_published } });
      toast.success(r.is_published ? "تم الإخفاء" : "تم الإظهار");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const onDelete = async (r: Row) => {
    const c1 = window.prompt(`لحذف "${r.display_name}" نهائيًا اكتبي اسم المستخدم بالضبط: ${r.username}`);
    if (c1 !== r.username) { if (c1 !== null) toast.error("لم يتطابق الاسم"); return; }
    if (!(await confirm({
      title: "حذف المصوّرة نهائيًا",
      description: "هذا الإجراء لا يمكن التراجع عنه وسيؤدي إلى مسح جميع البيانات.",
      confirmText: "حذف نهائي",
      destructive: true,
    }))) return;
    try {
      await del({ data: { photographer_id: r.id } });
      toast.success("تم الحذف");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const onArchive = async (r: Row) => {
    if (!(await confirm({
      title: "أرشفة المصوّرة",
      description: "ستُخفى المصوّرة عن البحث العام مع الاحتفاظ بكل بياناتها. يمكن استرجاعها لاحقاً في أي وقت.",
      confirmText: "أرشفة",
    }))) return;
    try {
      await softDel({ data: { photographer_id: r.id } });
      toast.success("تمت الأرشفة");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const onRestore = async (r: Row) => {
    try {
      await restore({ data: { photographer_id: r.id } });
      toast.success("تم الاسترجاع");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const onRenew = async (months: number) => {
    if (!renewFor) return;
    try {
      await renew({ data: { photographer_id: renewFor.id, months } });
      toast.success(`تم تجديد الاشتراك لمدة ${months} شهر`);
      setRenewFor(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <PageLoader />;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-2xl">إدارة المصورات ({rows.length})</h2>
        <button onClick={load} className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-3.5 w-3.5" /> تحديث
        </button>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider">
            <tr>
              <th className="text-start p-3">المصورة</th>
              <th className="text-start p-3">الاشتراك</th>
              <th className="text-start p-3">حجوزات</th>
              <th className="text-start p-3">تقييمات</th>
              <th className="text-start p-3">التوثيق</th>
              <th className="text-start p-3">حالة الصفحة</th>
              <th className="text-start p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-secondary" />
                    )}
                    <div>
                      <div className="font-medium">{r.display_name}</div>
                      <div className="text-xs text-muted-foreground">@{r.username}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3"><SubBadge sub={r.subscription} /></td>
                <td className="p-3">{r.bookings_count}</td>
                <td className="p-3">{r.reviews_count}</td>
                <td className="p-3"><VerificationBadge status={r.verification_status} /></td>
                <td className="p-3">
                  {r.is_published ? (
                    <span className="text-xs inline-flex items-center gap-1 text-emerald-700"><Eye className="h-3.5 w-3.5" /> ظاهرة</span>
                  ) : r.deleted_at ? (
                    <span className="text-xs inline-flex items-center gap-1 text-amber-700"><Archive className="h-3.5 w-3.5" /> مؤرشفة</span>
                  ) : (
                    <span className="text-xs inline-flex items-center gap-1 text-muted-foreground"><EyeOff className="h-3.5 w-3.5" /> مخفية</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1.5">
                    <a href={`/photographers/${r.username}`} target="_blank" rel="noreferrer"
                       className="text-xs px-2.5 py-1.5 rounded-sm border border-border hover:bg-secondary inline-flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> عرض
                    </a>
                    {r.verification_status !== "verified" ? (
                      <button onClick={() => onVerify(r, "verified")}
                              className="text-xs px-2.5 py-1.5 rounded-sm border border-emerald-500 text-emerald-700 hover:bg-emerald-50 inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> توثيق
                      </button>
                    ) : (
                      <button onClick={() => onVerify(r, "rejected")}
                              className="text-xs px-2.5 py-1.5 rounded-sm border border-destructive text-destructive hover:bg-destructive/5 inline-flex items-center gap-1">
                        <X className="h-3 w-3" /> إلغاء توثيق
                      </button>
                    )}
                    <button onClick={() => onToggle(r)}
                            className="text-xs px-2.5 py-1.5 rounded-sm border border-border hover:bg-secondary inline-flex items-center gap-1">
                      {r.is_published ? <><EyeOff className="h-3 w-3" /> إخفاء</> : <><Eye className="h-3 w-3" /> إظهار</>}
                    </button>
                    <button onClick={() => setRenewFor(r)}
                            className="text-xs px-2.5 py-1.5 rounded-sm bg-emerald-600 text-white hover:opacity-90 inline-flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" /> تجديد
                    </button>
                    {r.deleted_at ? (
                      <button onClick={() => onRestore(r)}
                              className="text-xs px-2.5 py-1.5 rounded-sm bg-amber-600 text-white hover:opacity-90 inline-flex items-center gap-1">
                        <ArchiveRestore className="h-3 w-3" /> استرجاع
                      </button>
                    ) : (
                      <button onClick={() => onArchive(r)}
                              className="text-xs px-2.5 py-1.5 rounded-sm border border-amber-400 text-amber-700 hover:bg-amber-50 inline-flex items-center gap-1">
                        <Archive className="h-3 w-3" /> أرشفة
                      </button>
                    )}
                    <button onClick={() => onDelete(r)}
                            className="text-xs px-2.5 py-1.5 rounded-sm bg-destructive text-destructive-foreground hover:opacity-90 inline-flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد مصورات</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {renewFor && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" onClick={() => setRenewFor(null)}>
          <div className="bg-card border border-border rounded-sm p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-xl mb-1">تجديد اشتراك</h3>
            <p className="text-sm text-muted-foreground mb-4">{renewFor.display_name} <span className="text-xs">@{renewFor.username}</span></p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[1, 3, 6, 12].map((m) => (
                <button key={m} onClick={() => onRenew(m)}
                        className="border border-border rounded-sm py-3 hover:bg-secondary text-sm">
                  {m === 1 ? "شهر واحد" : `${m} أشهر`}
                </button>
              ))}
            </div>
            <CustomRenew onPick={onRenew} />
            <button onClick={() => setRenewFor(null)} className="w-full mt-3 text-xs text-muted-foreground">إلغاء</button>
          </div>
        </div>
      )}
    </section>
  );
}

function CustomRenew({ onPick }: { onPick: (m: number) => void }) {
  const [n, setN] = useState(2);
  return (
    <div className="flex items-center gap-2">
      <input type="number" min={1} max={36} value={n}
             onChange={(e) => setN(Math.max(1, Math.min(36, Number(e.target.value) || 1)))}
             className="w-24 border border-border rounded-sm px-2 py-2 text-sm bg-background" />
      <span className="text-sm text-muted-foreground">شهر</span>
      <button onClick={() => onPick(n)} className="ms-auto px-3 py-2 rounded-sm bg-charcoal text-ivory text-xs">تجديد</button>
    </div>
  );
}

function SubBadge({ sub }: { sub: Row["subscription"] }) {
  if (!sub) return <span className="text-xs text-muted-foreground">—</span>;
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    trial: { cls: "bg-gold/10 text-gold border-gold/30", icon: <Clock className="h-3 w-3" />, label: "تجربة" },
    active: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" />, label: "نشط" },
    pending_review: { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock className="h-3 w-3" />, label: "مراجعة" },
    expired: { cls: "bg-destructive/10 text-destructive border-destructive/30", icon: <AlertTriangle className="h-3 w-3" />, label: "منتهي" },
    canceled: { cls: "bg-secondary text-muted-foreground border-border", icon: <AlertTriangle className="h-3 w-3" />, label: "ملغى" },
  };
  const c = map[sub.status] ?? map.canceled;
  const end = sub.current_period_end ?? sub.trial_ends_at;
  return (
    <div className="space-y-0.5">
      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-sm border ${c.cls}`}>
        {c.icon} {c.label}
      </span>
      {end && <div className="text-[10px] text-muted-foreground">حتى {new Date(end).toLocaleDateString("ar-JO")}</div>}
    </div>
  );
}

function VerificationBadge({ status }: { status: string | null | undefined }) {
  switch (status) {
    case "verified":
      return <span className="text-[11px] inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm dark:bg-emerald-950/40 border border-emerald-200"><CheckCircle2 className="h-3 w-3" /> موثقة</span>;
    case "pending_review":
      return <span className="text-[11px] inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-sm dark:bg-amber-950/40 border border-amber-200"><Clock className="h-3 w-3" /> مراجعة</span>;
    case "rejected":
      return <span className="text-[11px] inline-flex items-center gap-1 text-destructive bg-destructive/5 px-2 py-0.5 rounded-sm border border-destructive/20"><AlertTriangle className="h-3 w-3" /> مرفوضة</span>;
    case "unverified":
    default:
      return <span className="text-[11px] inline-flex items-center gap-1 text-muted-foreground bg-secondary px-2 py-0.5 rounded-sm border border-border">غير موثقة</span>;
  }
}