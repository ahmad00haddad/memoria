import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCheck } from "lucide-react";

export const Route = createFileRoute("/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return nav({ to: "/login" });
    const { data } = await supabase.from("notifications").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(100);
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const markAll = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", session.user.id).eq("is_read", false);
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-4xl flex items-center gap-3"><Bell className="h-7 w-7 text-gold" /> الإشعارات</h1>
          <button onClick={markAll} className="text-sm border border-border px-3 py-2 rounded-sm hover:bg-secondary inline-flex items-center gap-2"><CheckCheck className="h-4 w-4" /> تعليم الكل كمقروء</button>
        </div>
        {items.length === 0 ? <p className="text-muted-foreground">لا إشعارات بعد.</p> : (
          <ul className="space-y-2">
            {items.map((n) => (
              <li key={n.id} className={`border rounded-sm p-4 ${n.is_read ? "border-border bg-card" : "border-gold/40 bg-gold/5"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{n.title}</div>
                    {n.body && <div className="text-sm text-muted-foreground mt-1">{n.body}</div>}
                    <div className="text-[11px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("ar-JO")}</div>
                  </div>
                  {n.link && <Link to={n.link as any} className="text-xs text-gold underline whitespace-nowrap">فتح</Link>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Footer />
    </div>
  );
}