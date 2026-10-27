import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listNotificationsAdmin, adminDeleteNotification } from "@/lib/admin.functions";
import { Bell, Trash2 } from "lucide-react";
import { PageLoader } from "@/components/ui/loading";
import { toast } from "sonner";
import { locale } from "@/i18n";
import { t, tx } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: AdminNotifications,
});

type Row = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  profile?: { username: string; display_name: string } | null;
};

function AdminNotifications() {
  const listFn = useServerFn(listNotificationsAdmin);
  const deleteFn = useServerFn(adminDeleteNotification);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    try {
      const data = await listFn();
      setRows((data as Row[]) ?? []);
    } catch (e: any) {
      toast.error(e.message ?? t("فشل تحميل الإشعارات"));
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const del = async (id: string) => {
    try {
      await deleteFn({ data: { notification_id: id } });
      toast.success(t("تم حذف الإشعار"));
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      !q ||
      r.title?.toLowerCase().includes(q) ||
      r.body?.toLowerCase().includes(q) ||
      r.profile?.display_name?.toLowerCase().includes(q) ||
      r.type?.toLowerCase().includes(q)
    );
  });

  if (loading) return <PageLoader />;

  const unread = rows.filter((r) => !r.is_read).length;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-2xl">{t("الإشعارات")}</h2>
          {unread > 0 && (
            <span className="bg-destructive text-white text-xs px-2 py-0.5 rounded-full font-bold">{t("{0} غير مقروءة", [unread])}</span>
          )}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("بحث في الإشعارات…")}
          className="border border-border bg-card rounded-sm px-3 py-2 text-sm w-60 focus:outline-none focus:ring-1 focus:ring-gold"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-sm border border-border bg-card p-6 text-muted-foreground text-sm text-center">
          {t("لا توجد إشعارات.")}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              className={`rounded-sm border border-border bg-card p-4 flex flex-wrap items-start justify-between gap-4 ${!r.is_read ? "border-gold/30 bg-gold/5" : ""}`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-[200px]">
                <Bell className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-sm">{tx(r.title)}</div>
                  {r.body && <div className="text-xs text-muted-foreground mt-0.5">{tx(r.body)}</div>}
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.profile?.display_name ?? r.user_id.slice(0, 8) + "…"} ·{" "}
                    <span className="font-mono">{tx(r.type)}</span> ·{" "}
                    {new Date(r.created_at).toLocaleString(locale("ar-JO"))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-sm ${r.is_read ? "bg-muted text-muted-foreground" : "bg-gold/20 text-gold"}`}>
                  {r.is_read ? t("مقروء") : t("غير مقروء")}
                </span>
                <button
                  onClick={() => del(r.id)}
                  className="text-destructive hover:text-destructive/80 transition p-1.5 rounded-sm hover:bg-destructive/10"
                  title={t("حذف")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
