import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listContractsAdmin } from "@/lib/admin.functions";
import { FileText, CheckCircle2, Clock } from "lucide-react";
import { PageLoader } from "@/components/ui/loading";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/contracts")({
  component: AdminContracts,
});

type Row = {
  id: string;
  booking_id: string;
  photographer_id: string;
  client_name: string | null;
  signed_at: string | null;
  created_at: string;
  photographer?: { username: string; display_name: string } | null;
};

function AdminContracts() {
  const listFn = useServerFn(listContractsAdmin);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await listFn();
        setRows((data as Row[]) ?? []);
      } catch (e: any) {
        toast.error(e.message ?? "فشل تحميل العقود");
      }
      setLoading(false);
    })();
  // eslint-disable-next-line
  }, []);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      !q ||
      r.client_name?.toLowerCase().includes(q) ||
      r.photographer?.display_name?.toLowerCase().includes(q) ||
      r.photographer?.username?.toLowerCase().includes(q) ||
      r.id.includes(q)
    );
  });

  if (loading) return <PageLoader />;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="font-serif text-2xl">العقود ({rows.length})</h2>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث عن اسم أو مصوّرة…"
          className="border border-border bg-card rounded-sm px-3 py-2 text-sm w-60 focus:outline-none focus:ring-1 focus:ring-gold"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-sm border border-border bg-card p-6 text-muted-foreground text-sm text-center">
          لا توجد عقود.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-widest">
              <tr>
                <th className="text-right px-4 py-3">رقم العقد</th>
                <th className="text-right px-4 py-3">العميل</th>
                <th className="text-right px-4 py-3">المصوّرة</th>
                <th className="text-right px-4 py-3">رقم الحجز</th>
                <th className="text-right px-4 py-3">حالة التوقيع</th>
                <th className="text-right px-4 py-3">تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20 transition">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">{r.client_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {r.photographer ? (
                      <>
                        <span className="font-medium">{r.photographer.display_name}</span>{" "}
                        <span className="text-muted-foreground text-xs">@{r.photographer.username}</span>
                      </>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.booking_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    {r.signed_at ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-sm">
                        <CheckCircle2 className="h-3 w-3" /> موقّع — {new Date(r.signed_at).toLocaleDateString("ar-JO")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-sm">
                        <Clock className="h-3 w-3" /> في الانتظار
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar-JO")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
