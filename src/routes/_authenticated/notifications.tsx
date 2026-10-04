import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCheck, ChevronLeft } from "lucide-react";
import { ListSkeleton } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { ageLabel } from "@/components/dashboard/focus";

export const Route = createFileRoute("/_authenticated/notifications")({ component: NotificationsPage });

function dayGroup(iso: string) {
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const diff = Math.round((t.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "اليوم";
  if (diff === 1) return "أمس";
  if (diff < 7) return "هذا الأسبوع";
  return "أقدم";
}

function NotificationsPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return nav({ to: "/login" });
    const { data, error } = await supabase.from("notifications").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    setItems(data ?? []);
  };
  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (error: any) {
        setLoadError(error?.message || "تعذّر تحميل الإشعارات.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // تحديث متفائل: نعلّم الكل مقروءاً فوراً ثم نحفظ
  const markAll = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setItems((l) => l.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", session.user.id).eq("is_read", false);
  };

  // فتح إشعار: نعلّمه مقروءاً ثم ننتقل لرابطه
  const open = async (n: any) => {
    if (!n.is_read) {
      setItems((l) => l.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      supabase.from("notifications").update({ is_read: true }).eq("id", n.id).then(() => {});
    }
    if (n.link) {
      if (/^https?:\/\//.test(n.link)) window.location.href = n.link;
      else nav({ to: n.link as any });
    }
  };

  const unread = items.filter((n) => !n.is_read).length;
  const shown = unreadOnly ? items.filter((n) => !n.is_read) : items;
  const groups = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const n of shown) {
      const g = dayGroup(n.created_at);
      m.set(g, [...(m.get(g) ?? []), n]);
    }
    return [...m.entries()];
  }, [shown]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 pb-28 max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="font-serif text-4xl flex items-center gap-3">
            <Bell className="h-7 w-7 text-gold" /> الإشعارات
            {unread > 0 && <span className="rounded-full bg-gold px-2.5 py-0.5 font-sans text-sm text-charcoal tabular-nums">{unread}</span>}
          </h1>
          {unread > 0 && (
            <button onClick={markAll} className="text-sm border border-border px-4 py-2 rounded-full hover:bg-secondary inline-flex items-center gap-2 active:scale-95 transition-transform">
              <CheckCheck className="h-4 w-4" /> تعليم الكل كمقروء
            </button>
          )}
        </div>

        {items.length > 0 && (
          <div className="mb-6 inline-flex gap-1 rounded-full bg-secondary p-1 text-xs">
            {([[false, "الكل"], [true, `غير المقروءة (${unread})`]] as const).map(([k, l]) => (
              <button key={String(k)} onClick={() => setUnreadOnly(k)} className={`relative rounded-full px-3 py-1.5 ${unreadOnly === k ? "text-foreground" : "text-muted-foreground"}`}>
                {unreadOnly === k && <motion.span layoutId="notif-filter" className="absolute inset-0 rounded-full bg-card shadow-sm" />}
                <span className="relative">{l}</span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <ListSkeleton rows={5} />
        ) : loadError ? (
          <p className="text-destructive">{loadError}</p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="لا إشعارات بعد"
            description="تظهر هنا التنبيهات المهمة: طلب حجز جديد، رفع إثبات عربون، توقيع عقد، أو تقييم جديد."
            action={
              <div className="flex flex-wrap justify-center gap-3 text-sm">
                <Link to="/dashboard/bookings" className="border border-border px-4 py-2 rounded-full hover:bg-secondary">الحجوزات</Link>
                <Link to="/dashboard/contracts" className="border border-border px-4 py-2 rounded-full hover:bg-secondary">العقود</Link>
              </div>
            }
          />
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">قرأتِ كل الإشعارات.</div>
        ) : (
          <div className="space-y-8">
            {groups.map(([g, list]) => (
              <section key={g}>
                <h2 className="mb-2 text-xs font-medium text-muted-foreground">{g}</h2>
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                  <AnimatePresence initial={false}>
                    {list.map((n) => (
                      <motion.li key={n.id} layout exit={{ opacity: 0, height: 0 }}>
                        <button
                          onClick={() => open(n)}
                          className={`group flex w-full items-start gap-3 p-4 text-start transition-colors hover:bg-secondary/50 ${n.link ? "cursor-pointer" : "cursor-default"}`}
                        >
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full transition-colors duration-500 ${n.is_read ? "bg-transparent" : "bg-gold"}`} aria-label={n.is_read ? undefined : "غير مقروء"} />
                          <span className="min-w-0 flex-1">
                            <span className={`block ${n.is_read ? "font-normal" : "font-semibold"}`}>{n.title}</span>
                            {n.body && <span className="mt-1 block text-sm text-muted-foreground">{n.body}</span>}
                            <span className="mt-1 block text-[11px] text-muted-foreground" title={new Date(n.created_at).toLocaleString("ar-JO")}>{ageLabel(n.created_at)}</span>
                          </span>
                          {n.link && <ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:text-gold" />}
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}
