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
import { locale } from "@/i18n";
import { t, tx } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/photographers")({
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
  verification_checks?: { key: string; label: string; ok: boolean }[];
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "verified">("all");

  // Every verification change asks first and locks the row while it runs: the
  // verify and unverify buttons share a spot, so a double click used to verify
  // and then immediately unverify (seen 2026-10-08 in audit_logs).
  const checklistText = (r: Row) =>
    (r.verification_checks ?? []).map((c) => `${c.ok ? "✓" : "✗"} ${c.label}`).join("\n");
  const missingOf = (r: Row) => (r.verification_checks ?? []).filter((c) => !c.ok);

  const onVerify = async (r: Row, status: "verified" | "rejected" | "unverified") => {
    if (busyId) return;
    const missing = missingOf(r);
    const ask =
      status === "verified"
        ? {
            title: t("توثيق {0}", [r.display_name]),
            description:
              (missing.length ? t("تنبيه: {0} من الشروط غير مكتملة.", [missing.length]) : "") +
              checklistText(r) +
              t("تأكّدي أيضاً بنفسكِ أن الأعمال والهوية حقيقية (افتحي الملف وحساب الإنستغرام)."),
            confirmText: t("توثيق"),
          }
        : status === "rejected"
          ? {
              title: t("رفض طلب {0}", [r.display_name]),
              description: missing.length
                ? t("سيصلها إشعار بما ينقص: {0}", [missing.map((c) => "✗ " + c.label).join("\n")])
                : t("سيصلها إشعار بأن الطلب لم يُقبل وأن تتواصل معنا."),
              confirmText: t("رفض الطلب"),
              destructive: true,
            }
          : {
              title: t("إلغاء توثيق {0}", [r.display_name]),
              description: t("ستختفي شارة «موثّقة» من ملفها ومن البحث، وسيصلها إشعار بذلك."),
              confirmText: t("إلغاء التوثيق"),
              destructive: true,
            };
    if (!(await confirm(ask))) return;
    setBusyId(r.id);
    try {
      const reason =
        status === "rejected" && missing.length ? t("أكملي ثم أعيدي الطلب: {0}", [missing.map((c) => c.label).join("، ")]) : undefined;
      await verify({ data: { photographer_id: r.id, status, reason } });
      toast.success(status === "verified" ? t("تم توثيق المصوّرة ✓") : status === "rejected" ? t("رُفض الطلب وأُبلغت المصوّرة") : t("تم إلغاء توثيق المصوّرة"));
      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, verification_status: status } : x)));
      load();
    } catch (e: any) {
      toast.error(e.message || t("تعذّر تعديل حالة التوثيق"));
    } finally {
      setBusyId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = (await list()) as Row[];
      setRows(data);
    } catch (e: any) {
      toast.error(e.message || t("فشل التحميل"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const onToggle = async (r: Row) => {
    try {
      await togglePub({ data: { photographer_id: r.id, published: !r.is_published } });
      toast.success(r.is_published ? t("تم الإخفاء") : t("تم الإظهار"));
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const onDelete = async (r: Row) => {
    if (!(await confirm({
      title: t("حذف \"{0}\" نهائيًا", [r.display_name]),
      description: t("لا يمكن التراجع عن هذا. ستُمسح الصفحة والحجوزات والصور. إن أردتِ إخفاءها فقط استخدمي «أرشفة»."),
      confirmText: t("حذف نهائي"),
      destructive: true,
      requireText: r.username,
    }))) return;
    try {
      await del({ data: { photographer_id: r.id } });
      toast.success(t("تم الحذف"));
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const onArchive = async (r: Row) => {
    if (!(await confirm({
      title: t("أرشفة المصوّرة"),
      description: t("ستُخفى المصوّرة عن البحث العام مع الاحتفاظ بكل بياناتها. يمكن استرجاعها لاحقاً في أي وقت."),
      confirmText: t("أرشفة"),
    }))) return;
    try {
      await softDel({ data: { photographer_id: r.id } });
      toast.success(t("تمت الأرشفة"));
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const onRestore = async (r: Row) => {
    try {
      await restore({ data: { photographer_id: r.id } });
      toast.success(t("تم الاسترجاع"));
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const onRenew = async (months: number) => {
    if (!renewFor) return;
    try {
      await renew({ data: { photographer_id: renewFor.id, months } });
      toast.success(t("تم تجديد الاشتراك لمدة {0} شهر", [months]));
      setRenewFor(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <PageLoader />;

  const pendingCount = rows.filter((r) => r.verification_status === "pending_review").length;
  const shown = rows
    .filter((r) => (filter === "pending" ? r.verification_status === "pending_review" : filter === "verified" ? r.verification_status === "verified" : true))
    // waiting requests first, so they're never buried
    .sort((a, b) => Number(b.verification_status === "pending_review") - Number(a.verification_status === "pending_review"));

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-2xl">{t("إدارة المصورات ({0})", [rows.length])}</h2>
        <button onClick={load} className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-3.5 w-3.5" />{" "}{t("تحديث")}
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {([
          ["all", t("الكل ({0})", [rows.length])],
          ["pending", t("طلبات التوثيق ({0})", [pendingCount])],
          ["verified", t("الموثّقات ({0})", [rows.filter((r) => r.verification_status === "verified").length])],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full border px-3 py-1.5 transition-colors ${filter === k ? "border-charcoal bg-charcoal text-ivory dark:border-gold dark:bg-gold dark:text-charcoal" : "border-border hover:bg-secondary"} ${k === "pending" && pendingCount > 0 && filter !== k ? "border-amber-400 text-amber-700" : ""}`}
          >
            {tx(label)}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">{t("جدول المصورات")}</caption>
          <thead className="bg-secondary text-xs uppercase tracking-wider">
            <tr>
              <th className="text-start p-3">{t("المصورة")}</th>
              <th className="text-start p-3">{t("الاشتراك")}</th>
              <th className="text-start p-3">{t("حجوزات")}</th>
              <th className="text-start p-3">{t("تقييمات")}</th>
              <th className="text-start p-3">{t("التوثيق")}</th>
              <th className="text-start p-3">{t("حالة الصفحة")}</th>
              <th className="text-start p-3">{t("إجراءات")}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-secondary" />
                    )}
                    <div>
                      <div className="font-medium">{tx(r.display_name)}</div>
                      <div className="text-xs text-muted-foreground">@{tx(r.username)}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3"><SubBadge sub={r.subscription} /></td>
                <td className="p-3">{tx(r.bookings_count)}</td>
                <td className="p-3">{tx(r.reviews_count)}</td>
                <td className="p-3">
                  <VerificationBadge status={r.verification_status} />
                  {(r.verification_checks?.length ?? 0) > 0 && (
                    <div
                      className={`mt-1 text-[11px] ${missingOf(r).length ? "text-amber-700" : "text-emerald-700"}`}
                      title={checklistText(r)}
                    >{t("الشروط {0}/{1}", [r.verification_checks!.length - missingOf(r).length, r.verification_checks!.length])}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  {r.is_published ? (
                    <span className="text-xs inline-flex items-center gap-1 text-emerald-700"><Eye className="h-3.5 w-3.5" />{" "}{t("ظاهرة")}</span>
                  ) : r.deleted_at ? (
                    <span className="text-xs inline-flex items-center gap-1 text-amber-700"><Archive className="h-3.5 w-3.5" />{" "}{t("مؤرشفة")}</span>
                  ) : (
                    <span className="text-xs inline-flex items-center gap-1 text-muted-foreground"><EyeOff className="h-3.5 w-3.5" />{" "}{t("مخفية")}</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1.5">
                    <a href={`/photographers/${r.username}`} target="_blank" rel="noreferrer"
                       className="text-xs px-2.5 py-1.5 rounded-sm border border-border hover:bg-secondary inline-flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />{" "}{t("عرض")}
                    </a>
                    {r.verification_status !== "verified" ? (
                      <>
                        <button onClick={() => onVerify(r, "verified")} disabled={busyId === r.id}
                                className="text-xs px-2.5 py-1.5 rounded-sm border border-emerald-500 text-emerald-700 hover:bg-emerald-50 inline-flex items-center gap-1 disabled:opacity-50">
                          <CheckCircle2 className="h-3 w-3" />{" "}{t("توثيق")}
                        </button>
                        {r.verification_status === "pending_review" && (
                          <button onClick={() => onVerify(r, "rejected")} disabled={busyId === r.id}
                                  className="text-xs px-2.5 py-1.5 rounded-sm border border-border text-muted-foreground hover:bg-secondary inline-flex items-center gap-1 disabled:opacity-50">
                            <X className="h-3 w-3" />{" "}{t("رفض الطلب")}
                          </button>
                        )}
                      </>
                    ) : (
                      <button onClick={() => onVerify(r, "unverified")} disabled={busyId === r.id}
                              className="text-xs px-2.5 py-1.5 rounded-sm border border-destructive text-destructive hover:bg-destructive/5 inline-flex items-center gap-1 disabled:opacity-50">
                        <X className="h-3 w-3" />{" "}{t("إلغاء توثيق")}
                      </button>
                    )}
                    <button onClick={() => onToggle(r)}
                            className="text-xs px-2.5 py-1.5 rounded-sm border border-border hover:bg-secondary inline-flex items-center gap-1">
                      {r.is_published ? <><EyeOff className="h-3 w-3" />{" "}{t("إخفاء")}</> : <><Eye className="h-3 w-3" />{" "}{t("إظهار")}</>}
                    </button>
                    <button onClick={() => setRenewFor(r)}
                            className="text-xs px-2.5 py-1.5 rounded-sm bg-emerald-600 text-white hover:opacity-90 inline-flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />{" "}{t("تجديد")}
                    </button>
                    {r.deleted_at ? (
                      <button onClick={() => onRestore(r)}
                              className="text-xs px-2.5 py-1.5 rounded-sm bg-amber-600 text-white hover:opacity-90 inline-flex items-center gap-1">
                        <ArchiveRestore className="h-3 w-3" />{" "}{t("استرجاع")}
                      </button>
                    ) : (
                      <button onClick={() => onArchive(r)}
                              className="text-xs px-2.5 py-1.5 rounded-sm border border-amber-400 text-amber-700 hover:bg-amber-50 inline-flex items-center gap-1">
                        <Archive className="h-3 w-3" />{" "}{t("أرشفة")}
                      </button>
                    )}
                    <button onClick={() => onDelete(r)}
                            className="text-xs px-2.5 py-1.5 rounded-sm bg-destructive text-destructive-foreground hover:opacity-90 inline-flex items-center gap-1">
                      <Trash2 className="h-3 w-3" />{" "}{t("حذف")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{t("لا توجد مصورات")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {renewFor && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" onClick={() => setRenewFor(null)}>
          <div className="bg-card border border-border rounded-sm p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-xl mb-1">{t("تجديد اشتراك")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{tx(renewFor.display_name)} <span className="text-xs">@{tx(renewFor.username)}</span></p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[1, 3, 6, 12].map((m) => (
                <button key={m} onClick={() => onRenew(m)}
                        className="border border-border rounded-sm py-3 hover:bg-secondary text-sm">
                  {m === 1 ? t("شهر واحد") : t("{0} أشهر", [m])}
                </button>
              ))}
            </div>
            <CustomRenew onPick={onRenew} />
            <button onClick={() => setRenewFor(null)} className="w-full mt-3 text-xs text-muted-foreground">{t("إلغاء")}</button>
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
      <span className="text-sm text-muted-foreground">{t("شهر")}</span>
      <button onClick={() => onPick(n)} className="ms-auto px-3 py-2 rounded-sm bg-charcoal text-ivory text-xs">{t("تجديد")}</button>
    </div>
  );
}

function SubBadge({ sub }: { sub: Row["subscription"] }) {
  if (!sub) return <span className="text-xs text-muted-foreground">—</span>;
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    trial: { cls: "bg-gold/10 text-gold border-gold/30", icon: <Clock className="h-3 w-3" />, label: t("تجربة") },
    active: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" />, label: t("نشط") },
    pending_review: { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock className="h-3 w-3" />, label: t("مراجعة") },
    expired: { cls: "bg-destructive/10 text-destructive border-destructive/30", icon: <AlertTriangle className="h-3 w-3" />, label: t("منتهي") },
    canceled: { cls: "bg-secondary text-muted-foreground border-border", icon: <AlertTriangle className="h-3 w-3" />, label: t("ملغى") },
  };
  const c = map[sub.status] ?? map.canceled;
  const end = sub.current_period_end ?? sub.trial_ends_at;
  return (
    <div className="space-y-0.5">
      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-sm border ${c.cls}`}>
        {tx(c.icon)} {tx(c.label)}
      </span>
      {end && <div className="text-[10px] text-muted-foreground">{t("حتى {0}", [new Date(end).toLocaleDateString(locale("ar-JO"))])}</div>}
    </div>
  );
}

function VerificationBadge({ status }: { status: string | null | undefined }) {
  switch (status) {
    case "verified":
      return <span className="text-[11px] inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm dark:bg-emerald-950/40 border border-emerald-200"><CheckCircle2 className="h-3 w-3" />{" "}{t("موثقة")}</span>;
    case "pending_review":
      return <span className="text-[11px] inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-sm dark:bg-amber-950/40 border border-amber-200"><Clock className="h-3 w-3" />{" "}{t("مراجعة")}</span>;
    case "rejected":
      return <span className="text-[11px] inline-flex items-center gap-1 text-destructive bg-destructive/5 px-2 py-0.5 rounded-sm border border-destructive/20"><AlertTriangle className="h-3 w-3" />{" "}{t("مرفوضة")}</span>;
    case "unverified":
    default:
      return <span className="text-[11px] inline-flex items-center gap-1 text-muted-foreground bg-secondary px-2 py-0.5 rounded-sm border border-border">{t("غير موثقة")}</span>;
  }
}