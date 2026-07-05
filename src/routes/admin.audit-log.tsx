import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLogAdmin } from "@/lib/admin.functions";
import { RefreshCw } from "lucide-react";
import { PageLoader } from "@/components/ui/loading";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/audit-log")({
  component: AdminAuditLog,
});

type Row = {
  id: string;
  action: string;
  actor_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_COLOR: Record<string, string> = {
  "booking.cancel": "bg-red-100 text-red-800",
  "role.grant": "bg-blue-100 text-blue-800",
  "role.revoke": "bg-orange-100 text-orange-800",
  "review.approve": "bg-emerald-100 text-emerald-800",
  "review.reject": "bg-red-100 text-red-800",
  "subscription.approve": "bg-green-100 text-green-800",
  "subscription.reject": "bg-red-100 text-red-800",
  "photographer.publish": "bg-emerald-100 text-emerald-800",
  "photographer.unpublish": "bg-amber-100 text-amber-800",
  "photographer.delete": "bg-red-100 text-red-800",
};

function AdminAuditLog() {
  const listFn = useServerFn(listAuditLogAdmin);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await listFn();
        setRows((data as Row[]) ?? []);
      } catch (e: any) {
        toast.error(e.message ?? "فشل تحميل سجل العمليات");
      }
      setLoading(false);
    })();
  // eslint-disable-next-line
  }, []);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.action?.toLowerCase().includes(q) || r.entity_type?.toLowerCase().includes(q) || r.actor_id?.includes(q);
  });

  if (loading) return <PageLoader />;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="font-serif text-2xl">سجل العمليات ({rows.length})</h2>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالعملية أو النوع…"
          className="border border-border bg-card rounded-sm px-3 py-2 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-gold"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-sm border border-border bg-card p-6 text-muted-foreground text-sm text-center">
          لا توجد سجلات.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const colorCls = ACTION_COLOR[r.action] ?? "bg-muted text-muted-foreground";
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} className="rounded-sm border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                  className="w-full text-right p-4 flex flex-wrap items-center gap-4 hover:bg-muted/20 transition"
                >
                  <span className={`text-xs px-2 py-0.5 rounded-sm whitespace-nowrap ${colorCls}`}>{r.action}</span>
                  <span className="text-xs text-muted-foreground">النوع: {r.entity_type ?? "—"}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    الكيان: {r.entity_id ? r.entity_id.slice(0, 8) + "…" : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    الفاعل: {r.actor_id ? r.actor_id.slice(0, 8) + "…" : "النظام"}
                  </span>
                  <span className="text-xs text-muted-foreground mr-auto">
                    {new Date(r.created_at).toLocaleString("ar-JO")}
                  </span>
                  <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground transition ${isOpen ? "rotate-90" : ""}`} />
                </button>
                {isOpen && (r.before_data || r.after_data) && (
                  <div className="border-t border-border px-4 py-3 grid sm:grid-cols-2 gap-4 bg-muted/10 text-xs">
                    {r.before_data && (
                      <div>
                        <div className="text-muted-foreground mb-1 font-medium">قبل:</div>
                        <pre className="font-mono whitespace-pre-wrap break-all text-xs">{JSON.stringify(r.before_data, null, 2)}</pre>
                      </div>
                    )}
                    {r.after_data && (
                      <div>
                        <div className="text-muted-foreground mb-1 font-medium">بعد:</div>
                        <pre className="font-mono whitespace-pre-wrap break-all text-xs">{JSON.stringify(r.after_data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
