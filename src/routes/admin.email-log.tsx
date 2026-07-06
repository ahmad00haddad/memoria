import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listEmailLogAdmin } from "@/lib/admin.functions";
import { Mail, CheckCircle2, XCircle } from "lucide-react";
import { PageLoader } from "@/components/ui/loading";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/email-log")({
  component: AdminEmailLog,
});

type Row = {
  id: string;
  recipient: string;
  subject: string | null;
  status: string;
  error: string | null;
  sent_at: string | null;
};

function AdminEmailLog() {
  const listFn = useServerFn(listEmailLogAdmin);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await listFn();
        setRows((data as Row[]) ?? []);
      } catch (e: any) {
        toast.error(e.message ?? "فشل تحميل سجل البريد");
      }
      setLoading(false);
    })();
  // eslint-disable-next-line
  }, []);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.recipient?.toLowerCase().includes(q) || r.subject?.toLowerCase().includes(q);
  });

  if (loading) return <PageLoader />;

  const succeeded = rows.filter((r) => r.status === "sent" || r.status === "success").length;
  const failed = rows.filter((r) => r.status === "failed" || r.status === "error").length;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="font-serif text-2xl">سجل البريد الإلكتروني ({rows.length})</h2>
          <div className="flex gap-2 text-xs">
            <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-sm">نجاح: {succeeded}</span>
            <span className="bg-destructive/15 text-destructive px-2 py-1 rounded-sm">فشل: {failed}</span>
          </div>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالإيميل أو الموضوع…"
          className="border border-border bg-card rounded-sm px-3 py-2 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-gold"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-sm border border-border bg-card p-6 text-muted-foreground text-sm text-center">
          لا توجد سجلات بريد.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border bg-card">
          <table className="w-full text-sm">
            <caption className="sr-only">جدول سجلات البريد الإلكتروني</caption>
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-widest">
              <tr>
                <th className="text-right px-4 py-3">الحالة</th>
                <th className="text-right px-4 py-3">المستلِم</th>
                <th className="text-right px-4 py-3">الموضوع</th>
                <th className="text-right px-4 py-3">الخطأ</th>
                <th className="text-right px-4 py-3">وقت الإرسال</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const ok = r.status === "sent" || r.status === "success";
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20 transition">
                    <td className="px-4 py-3">
                      {ok ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" /> نجاح
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive text-xs">
                          <XCircle className="h-3.5 w-3.5" /> {r.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.recipient}</td>
                    <td className="px-4 py-3">{r.subject}</td>
                    <td className="px-4 py-3 text-xs text-destructive">{r.error ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.sent_at ? new Date(r.sent_at).toLocaleString("ar-JO") : "—"}
                    </td>
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
