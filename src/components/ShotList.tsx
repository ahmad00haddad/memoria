import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Circle, Plus, Trash2, ListChecks, Sparkles, X } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Item = {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "done" | "skipped";
  sort_order: number;
  done_at: string | null;
};

export function ShotList({ bookingId, service }: { bookingId: string; service: string | null }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  const load = async () => {
    const { data } = await supabase
      .from("shot_list_items")
      .select("*")
      .eq("booking_id", bookingId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setItems((data ?? []) as Item[]);
    setLoading(false);
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [bookingId]);

  const add = async () => {
    const t = newTitle.trim();
    if (!t) return;
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("جلسة منتهية");
      const maxOrder = items.length ? Math.max(...items.map((i) => i.sort_order)) : 0;
      const { error } = await supabase.from("shot_list_items").insert({
        booking_id: bookingId,
        photographer_id: session.user.id,
        title: t.slice(0, 200),
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
      setNewTitle("");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item: Item) => {
    const newStatus = item.status === "done" ? "todo" : "done";
    await supabase
      .from("shot_list_items")
      .update({ status: newStatus, done_at: newStatus === "done" ? new Date().toISOString() : null })
      .eq("id", item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i)));
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: "حذف هذه اللقطة؟", confirmText: "حذف", destructive: true }))) return;
    await supabase.from("shot_list_items").delete().eq("id", id);
    await load();
  };

  const seedDefaults = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("seed_default_shot_list", {
        _booking_id: bookingId,
        _service: service ?? "",
      });
      if (error) throw error;
      toast.success("تم تحميل قالب اللقطات الافتراضي");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const done = items.filter((i) => i.status === "done").length;
  const total = items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="mt-8 rounded-sm border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="font-serif text-xl flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-gold" /> قائمة اللقطات
          {total > 0 && (
            <span className="text-xs text-muted-foreground font-sans">
              ({done}/{total} — {pct}%)
            </span>
          )}
        </h2>
        {items.length === 0 && !loading && (
          <button
            onClick={seedDefaults}
            disabled={busy}
            className="inline-flex items-center gap-2 text-sm border border-border px-3 py-2 rounded-sm hover:bg-secondary disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            تحميل قالب جاهز
          </button>
        )}
      </div>

      {total > 0 && (
        <div className="mb-4 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">جاري التحميل…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-4">
          لا توجد لقطات بعد. أضيفي قائمة لقطات لمتابعة ما تم تنفيذه خلال الجلسة.
        </p>
      ) : (
        <ul className="space-y-1 mb-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 p-2 rounded-sm hover:bg-secondary/40 group"
            >
              <button
                onClick={() => toggle(item)}
                className="shrink-0"
                aria-label="تبديل الحالة"
              >
                {item.status === "done" ? (
                  <Check className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <span
                className={`flex-1 text-sm ${item.status === "done" ? "line-through text-muted-foreground" : ""}`}
              >
                {item.title}
              </span>
              <button
                onClick={() => remove(item.id)}
                className="sm:opacity-0 sm:group-hover:opacity-100 opacity-100 text-muted-foreground hover:text-destructive transition"
                aria-label="حذف"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="أضيفي لقطة جديدة…"
          maxLength={200}
          className="flex-1 border border-input bg-background px-3 py-2 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={add}
          disabled={busy || !newTitle.trim()}
          className="inline-flex items-center gap-1 bg-charcoal text-ivory px-3 py-2 rounded-sm text-sm disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> إضافة
        </button>
      </div>
    </div>
  );
}