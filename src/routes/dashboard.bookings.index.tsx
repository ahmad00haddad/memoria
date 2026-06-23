import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { ListSkeleton } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Inbox, Search } from "lucide-react";

export const Route = createFileRoute("/dashboard/bookings/")({ component: BookingsList });

function BookingsList() {
  const nav = useNavigate();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"date_desc" | "date_asc" | "price_desc">("date_desc");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return nav({ to: "/login" });
        const { data, error } = await supabase.from("bookings").select("*").eq("photographer_id", session.user.id).is("deleted_at", null).order("event_date", { ascending: false });
        if (error) throw error;
        setList(data ?? []);
      } catch (error: any) {
        setLoadError(error?.message || "تعذّر تحميل الحجوزات.");
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  const ql = q.trim().toLowerCase();
  const filtered = list
    .filter((b) => (filter === "all" ? true : b.status === filter))
    .filter((b) =>
      !ql
        ? true
        : (b.client_name || "").toLowerCase().includes(ql) ||
          (b.venue_name || "").toLowerCase().includes(ql) ||
          (b.client_phone || "").toLowerCase().includes(ql)
    )
    .sort((a, b) => {
      if (sort === "price_desc") return Number(b.total_price) - Number(a.total_price);
      if (sort === "date_asc") return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
      return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
    });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 max-w-5xl">
        <BackToDashboard />
        <h1 className="font-serif text-4xl mt-2 mb-6">الحجوزات</h1>

        {/* ✅ حقل البحث النصي */}
        <div className="relative mb-4">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو التاريخ أو الهاتف…"
            className="w-full border border-input bg-background rounded-sm px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-4 flex-wrap text-sm">
          {[
            { v: "all", l: "الكل" }, { v: "quote", l: "عروض أسعار" }, { v: "pending_deposit", l: "بانتظار العربون" },
            { v: "confirmed", l: "مؤكّد" }, { v: "completed", l: "منجز" }, { v: "cancelled", l: "ملغى" },
          ].map((f) => (
            <button key={f.v} onClick={() => setFilter(f.v)} className={`px-3 py-1.5 rounded-sm border ${filter === f.v ? "bg-charcoal text-ivory border-charcoal" : "border-border hover:bg-secondary"}`}>{f.l}</button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto] mb-6">
          <div className="relative">
            <Search className="h-4 w-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحثي باسم العميل، الموقع، أو رقم الجوال"
              className="w-full ps-9 pe-3 py-2 text-sm border border-input rounded-sm bg-background"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="text-sm border border-input rounded-sm bg-background px-3 py-2"
          >
            <option value="date_desc">الأحدث أولاً</option>
            <option value="date_asc">الأقدم أولاً</option>
            <option value="price_desc">السعر الأعلى</option>
          </select>
        </div>

        {loading ? (
          <ListSkeleton rows={5} />
        ) : loadError ? (
          <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{loadError}</div>
        ) : list.length === 0 ? (
          <div className="rounded-sm border border-border bg-card p-6 mb-6 shadow-soft">
            <h2 className="font-serif text-2xl mb-2">لا توجد حجوزات بعد</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              هذه الصفحة ليست فارغة بسبب خطأ، بل لأن العملاء لم يرسلوا أي طلب بعد. لبدء استقبال الطلبات يجب أولًا إكمال الملف الشخصي ثم إضافة الباقات ونشر الملف العام.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link to="/dashboard/profile" className="border border-border px-4 py-2 rounded-sm hover:bg-secondary">إكمال الملف</Link>
              <Link to="/dashboard/pricing" className="border border-border px-4 py-2 rounded-sm hover:bg-secondary">إضافة باقات</Link>
              <Link to="/search" className="bg-charcoal text-ivory px-4 py-2 rounded-sm hover:opacity-90">معاينة تجربة العميل</Link>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="لا حجوزات بهذه الحالة"
            description="غيّري الفلتر أعلاه لعرض حجوزات بحالات أخرى."
            action={<button onClick={() => setFilter("all")} className="text-sm border border-border px-4 py-2 rounded-sm hover:bg-secondary">عرض الكل</button>}
          />
        ) : (
        <div className="rounded-sm border border-border bg-card overflow-hidden">
          {filtered.map((b) => (
            <Link key={b.id} to="/dashboard/bookings/$id" params={{ id: b.id }} className="block p-4 border-b border-border last:border-0 hover:bg-secondary/50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{b.client_name} <span className="text-xs text-muted-foreground">— {b.service === "photography" ? "تصوير" : "فيديو"}</span></div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(b.event_date).toLocaleDateString("ar-JO")} · {b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}</div>
                  {b.venue_name && <div className="text-xs text-muted-foreground">{b.venue_name}</div>}
                </div>
                <div className="text-right">
                  <div className="font-serif text-lg">{Number(b.total_price).toLocaleString("ar-JO")} د.أ</div>
                  <StatusBadge s={b.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
        )}
      </section>
      <Footer />
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const m: Record<string, { l: string; c: string }> = {
    quote: { l: "عرض سعر", c: "bg-secondary" },
    pending_deposit: { l: "بانتظار العربون", c: "bg-amber-100 text-amber-800" },
    confirmed: { l: "مؤكّد", c: "bg-emerald-100 text-emerald-800" },
    completed: { l: "منجز", c: "bg-charcoal text-ivory" },
    cancelled: { l: "ملغى", c: "bg-destructive/10 text-destructive" },
  };
  const x = m[s] ?? m.quote;
  return <span className={`text-[10px] mt-1 inline-block px-2 py-0.5 rounded-sm ${x.c}`}>{x.l}</span>;
}