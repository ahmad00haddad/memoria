import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listReferralsAdmin } from "@/lib/admin.functions";
import { PageLoader } from "@/components/ui/loading";
import { toast } from "sonner";
import { locale } from "@/i18n";
import { t, tx } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/referrals")({
  component: AdminReferrals,
});

type Row = {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: string;
  reward_granted: boolean;
  created_at: string;
  referrer?: { username: string; display_name: string } | null;
  referred?: { username: string; display_name: string } | null;
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "معلّقة", cls: "bg-amber-100 text-amber-800" },
  completed: { label: "مكتملة", cls: "bg-emerald-100 text-emerald-800" },
  rewarded: { label: "مكافأة مُمنوحة", cls: "bg-blue-100 text-blue-800" },
};

function AdminReferrals() {
  const listFn = useServerFn(listReferralsAdmin);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await listFn();
        setRows((data as Row[]) ?? []);
      } catch (e: any) {
        toast.error(e.message ?? t("فشل تحميل الإحالات"));
      }
      setLoading(false);
    })();
  // eslint-disable-next-line
  }, []);

  if (loading) return <PageLoader />;

  const rewarded = rows.filter((r) => r.reward_granted).length;
  const pending = rows.filter((r) => !r.reward_granted).length;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="font-serif text-2xl">{t("نظام الإحالات ({0})", [rows.length])}</h2>
        <div className="flex gap-3 text-xs">
          <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-sm">{t("مُكافأة: {0}", [rewarded])}</span>
          <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-sm">{t("في الانتظار: {0}", [pending])}</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-sm border border-border bg-card p-6 text-muted-foreground text-sm text-center">
          {t("لا توجد إحالات بعد.")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border bg-card">
          <table className="w-full text-sm">
            <caption className="sr-only">{t("جدول الإحالات")}</caption>
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-widest">
              <tr>
                <th className="text-start px-4 py-3">{t("المُحيل")}</th>
                <th className="text-start px-4 py-3">{t("المُحال إليه")}</th>
                <th className="text-start px-4 py-3">{t("الحالة")}</th>
                <th className="text-start px-4 py-3">{t("مكافأة مُمنوحة")}</th>
                <th className="text-start px-4 py-3">{t("التاريخ")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = STATUS_LABEL[r.status] ?? { label: r.status, cls: "bg-muted text-muted-foreground" };
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20 transition">
                    <td className="px-4 py-3">
                      {r.referrer ? (
                        <>
                          <span className="font-medium">{tx(r.referrer.display_name)}</span>{" "}
                          <span className="text-muted-foreground text-xs">@{tx(r.referrer.username)}</span>
                        </>
                      ) : <span className="text-muted-foreground text-xs">{r.referrer_id.slice(0, 8)}…</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.referred ? (
                        <>
                          <span className="font-medium">{tx(r.referred.display_name)}</span>{" "}
                          <span className="text-muted-foreground text-xs">@{tx(r.referred.username)}</span>
                        </>
                      ) : <span className="text-muted-foreground text-xs">{r.referred_id.slice(0, 8)}…</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-sm ${st.cls}`}>{tx(st.label)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {r.reward_granted ? (
                        <span className="text-emerald-600 text-xs font-medium">{t("✓ نعم")}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">{t("لا")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString(locale("ar-JO"))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
