import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listUserRolesAdmin, adminGrantRole, adminRevokeRole } from "@/lib/admin.functions";
import { ShieldAlert, ShieldCheck, Trash2, Plus, RefreshCw } from "lucide-react";
import { PageLoader } from "@/components/ui/loading";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  component: AdminRoles,
});

type Row = {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: { username: string; display_name: string; email?: string } | null;
};

function AdminRoles() {
  const listFn = useServerFn(listUserRolesAdmin);
  const grantFn = useServerFn(adminGrantRole);
  const revokeFn = useServerFn(adminRevokeRole);
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [granting, setGranting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listFn();
      setRows((data as Row[]) ?? []);
    } catch (e: any) {
      toast.error(e.message ?? "فشل تحميل الأدوار");
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const grant = async () => {
    if (!newUserId.trim()) { toast.error("أدخل معرّف المستخدم"); return; }
    // Basic UUID format check
    if (!/^[0-9a-f-]{36}$/i.test(newUserId.trim())) {
      toast.error("معرّف المستخدم يجب أن يكون UUID صحيح (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)");
      return;
    }
    setGranting(true);
    try {
      await grantFn({ data: { user_id: newUserId.trim(), role: newRole } });
      toast.success(`تم منح دور "${newRole}" بنجاح ✓`);
      setNewUserId("");
      load();
    } catch (e: any) {
      toast.error(e.message || "فشل منح الدور");
    }
    setGranting(false);
  };

  const revoke = async (row: Row) => {
    if (!(await confirm({
      title: "سحب الدور",
      description: `هل أنت متأكد من سحب دور "${row.role}" من ${row.profile?.display_name ?? row.user_id}؟`,
      confirmText: "سحب الدور",
      destructive: true,
    }))) return;
    try {
      await revokeFn({ data: { user_id: row.user_id, role: row.role } });
      toast.success("تم سحب الدور بنجاح");
      load();
    } catch (e: any) {
      toast.error(e.message || "فشل سحب الدور");
    }
  };


  if (loading) return <PageLoader />;

  return (
    <section className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl mb-6">إدارة أدوار المستخدمين</h2>

        {/* ─── منح دور جديد ─── */}
        <div className="rounded-sm border border-border bg-card p-5 mb-6">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4" /> منح دور جديد
          </h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs text-muted-foreground mb-1 block">معرّف المستخدم (UUID)</label>
              <input
                type="text"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="border border-border bg-background rounded-sm px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-gold font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الدور</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="border border-border bg-background rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
              >
                <option value="admin">admin</option>
                <option value="moderator">moderator</option>
                <option value="support">support</option>
              </select>
            </div>
            <button
              onClick={grant}
              disabled={granting}
              className="bg-gold text-white px-4 py-2 rounded-sm text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {granting ? "جاري المنح…" : "منح الدور"}
            </button>
          </div>
        </div>

        {/* ─── قائمة الأدوار الحالية ─── */}
        {rows.length === 0 ? (
          <div className="rounded-sm border border-border bg-card p-6 text-muted-foreground text-sm text-center">
            لا توجد أدوار مُخصّصة.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border bg-card">
            <table className="w-full text-sm">
              <caption className="sr-only">جدول الأدوار</caption>
              <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-widest">
                <tr>
                  <th className="text-right px-4 py-3">المستخدم</th>
                  <th className="text-right px-4 py-3">الدور</th>
                  <th className="text-right px-4 py-3">معرّف المستخدم</th>
                  <th className="text-right px-4 py-3">تاريخ المنح</th>
                  <th className="text-right px-4 py-3">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20 transition">
                    <td className="px-4 py-3">
                      {r.profile ? (
                        <>
                          <span className="font-medium">{r.profile.display_name}</span>
                          <span className="text-muted-foreground text-xs ml-2">@{r.profile.username}</span>
                        </>
                      ) : <span className="text-muted-foreground text-xs">مستخدم غير معروف</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-sm ${r.role === "admin" ? "bg-gold/20 text-gold" : "bg-blue-100 text-blue-800"}`}>
                        {r.role === "admin" ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                        {r.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.user_id}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar-JO")}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => revoke(r)}
                        className="text-destructive hover:text-destructive/80 transition p-1.5 rounded-sm hover:bg-destructive/10 inline-flex items-center gap-1 text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> سحب
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
