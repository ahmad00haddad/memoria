import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { listProfileReports, updateProfileReport } from "@/lib/profile-reports.functions";
import { PageLoader } from "@/components/ui/loading";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { locale, t, tx } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: AdminReportsPage,
});

const REASON: Record<string, string> = {
  impersonation: "انتحال صفحة",
  scam: "احتيال / عربون واختفاء",
  stolen_photos: "صور ليست لها",
  chat_abuse: "إساءة في المحادثة",
  other: "سبب آخر",
};
const STATUS: Record<string, { label: string; c: string }> = {
  new: { label: "جديد", c: "bg-rose-100 text-rose-700" },
  reviewing: { label: "قيد المراجعة", c: "bg-amber-100 text-amber-800" },
  closed: { label: "مغلق", c: "bg-gray-100 text-gray-700" },
};

function AdminReportsPage() {
  const list = useServerFn(listProfileReports);
  const update = useServerFn(updateProfileReport);
  const confirm = useConfirm();
  const [rows, setRows] = useState<any[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    try { setRows(await list()); } catch (e: any) { toast.error(e?.message || t("تعذّر التحميل")); setRows([]); }
  };
  useEffect(() => { load(); }, []);

  const act = async (r: any, status: "reviewing" | "closed", hide = false) => {
    if (hide && !(await confirm({ title: t("إخفاء صفحة @{0}؟", [r.photographer?.username]), description: t("تختفي الصفحة من البحث والرابط المباشر حتى تعيدي نشرها."), confirmText: t("إخفاء") }))) return;
    try {
      await update({ data: { id: r.id, status, admin_notes: notes[r.id] ?? r.admin_notes ?? "", hide_profile: hide } });
      toast.success(t("تم التحديث")); load();
    } catch (e: any) { toast.error(e?.message || t("فشل التحديث")); }
  };

  if (!rows) return <PageLoader />;
  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 font-serif text-2xl"><Flag className="h-5 w-5 text-rose-600" /> {t("بلاغات الصفحات")}</h1>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">{t("لا توجد بلاغات.")}</p>}
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl border border-border bg-card p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS[r.status]?.c}`}>{tx(t(STATUS[r.status]?.label ?? r.status))}</span>
              <span className="font-medium">{tx(t(REASON[r.reason] ?? r.reason))}</span>
              <Link to="/photographers/$username" params={{ username: r.photographer?.username ?? "" }} target="_blank" className="text-gold underline">@{tx(r.photographer?.username)}</Link>
              {r.photographer && !r.photographer.is_published && <span className="text-xs text-muted-foreground">{t("(مخفية)")}</span>}
            </div>
            <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString(locale("ar-JO"))}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap">{tx(r.details)}</p>
          {r.real_account_url && <p className="mt-1 text-xs" dir="ltr">{t("الحساب الحقيقي:")} {tx(r.real_account_url)}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{t("المبلِّغة:")} {tx(r.reporter_role === "photographer" ? t("المصوّرة نفسها") : r.reporter_role === "bride" ? t("العروس") : (r.reporter_name || "—"))}{r.reporter_role === "bride" && r.reporter_name ? ` (${r.reporter_name})` : ""} · <span dir="ltr">{tx(r.reporter_contact)}</span></p>
          {r.booking_id && <p className="mt-1 text-xs" dir="ltr">{t("الحجز:")} {tx(r.booking_id)}</p>}
          <textarea value={notes[r.id] ?? r.admin_notes ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} rows={2}
            placeholder={t("ملاحظات الإدارة")} className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <div className="mt-2 flex flex-wrap gap-2">
            {r.status === "new" && <button onClick={() => act(r, "reviewing")} className="rounded-full border border-border px-4 py-1.5 text-xs">{t("بدء المراجعة")}</button>}
            {r.photographer?.is_published && <button onClick={() => act(r, "reviewing", true)} className="rounded-full bg-rose-600 px-4 py-1.5 text-xs text-white">{t("إخفاء الصفحة")}</button>}
            {r.status !== "closed" && <button onClick={() => act(r, "closed")} className="rounded-full bg-charcoal px-4 py-1.5 text-xs text-ivory">{t("إغلاق البلاغ")}</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
