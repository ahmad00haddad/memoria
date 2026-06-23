import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { ListSkeleton } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Inbox, Search, CheckCircle2, XCircle, Calendar, User, DollarSign, ChevronLeft,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/bookings/")({ component: BookingsList });

const STATUS_LABELS: Record<string, string> = {
  pending_deposit: "بانتظار العربون",
  quote:           "عرض سعر",
  confirmed:       "مؤكّد",
  shooting:        "يوم التصوير",
  canceled:        "ملغى",
  completed:       "مكتمل",
};

const STATUS_COLORS: Record<string, string> = {
  pending_deposit: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  quote:           "bg-blue-500/10 text-blue-400 border-blue-500/20",
  confirmed:       "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  shooting:        "bg-purple-500/10 text-purple-400 border-purple-500/20",
  canceled:        "bg-red-500/10 text-red-400 border-red-500/20",
  completed:       "bg-sky-500/10 text-sky-400 border-sky-500/20",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ar-JO", {
    year: "numeric", month: "long", day: "numeric",
  });
}

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
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("photographer_id", session.user.id)
          .is("deleted_at", null)
          .order("event_date", { ascending: false });
        if (error) throw error;
        setList(data ?? []);
      } catch (error: any) {
        setLoadError(error?.message || "تعذّر تحميل الحجوزات");
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  const handleConfirm = async (id: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", id);
    if (error) { toast.error("تعذّر تأكيد الحجز"); return; }
    setList((prev) => prev.map((b) => b.id === id ? { ...b, status: "confirmed" } : b));
    toast.success("تم تأكيد الحجز ✓");
  };

  const handleCancel = async (id: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "canceled" })
      .eq("id", id);
    if (error) { toast.error("تعذّر إلغاء الحجز"); return; }
    setList((prev) => prev.map((b) => b.id === id ? { ...b, status: "canceled" } : b));
    toast.error("تم إلغاء الحجز");
  };

  const displayed = list
    .filter((b) => filter === "all" || b.status === filter)
    .filter((b) => {
      if (!q) return true;
      const name = (b.client_name || b.bride_name || "").toLowerCase();
      return name.includes(q.toLowerCase());
    })
    .sort((a, b) => {
      if (sort === "date_asc") return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
      if (sort === "price_desc") return (b.total_price ?? 0) - (a.total_price ?? 0);
      return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
    });

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5 pb-24">
        <BackToDashboard />

        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl">الحجوزات</h1>
          <span className="text-xs text-muted-foreground border border-border rounded-sm px-2 py-1">
            {list.length} حجز
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحثي باسم العميلة…"
            className="w-full bg-card border border-border rounded-sm py-2 ps-9 pe-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { value: "all", label: "الكل" },
            { value: "pending_deposit", label: "بانتظار العربون" },
            { value: "confirmed", label: "مؤكّد" },
            { value: "canceled", label: "ملغى" },
            { value: "completed", label: "مكتمل" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-sm border transition-colors ${
                filter === f.value
                  ? "border-gold text-gold bg-gold/5"
                  : "border-border text-muted-foreground hover:border-foreground/40"
              }`}
            >
              {f.label}
            </button>
          ))}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="ms-auto flex-shrink-0 bg-card border border-border rounded-sm px-2 py-1.5 text-xs text-muted-foreground focus:outline-none"
          >
            <option value="date_desc">الأحدث أولاً</option>
            <option value="date_asc">الأقدم أولاً</option>
            <option value="price_desc">الأعلى سعراً</option>
          </select>
        </div>

        {/* Swipe hint */}
        <p className="text-center text-[11px] text-muted-foreground/50 hidden md:block">
          اسحب للتأكيد أو الإلغاء على الجوّال
        </p>
        <p className="text-center text-[11px] text-muted-foreground/50 md:hidden">
          ← اسحب لليسار للإلغاء · اسحب لليمين للتأكيد →
        </p>

        {loading && <ListSkeleton />}
        {loadError && <p className="text-center text-sm text-red-400 py-8">{loadError}</p>}

        {!loading && !loadError && displayed.length === 0 && (
          <EmptyState
            icon={Inbox}
            title="لا توجد حجوزات"
            description={q || filter !== "all" ? "حاولي تغيير الفلتر أو البحث" : "لم تستلمي أي حجز بعد"}
          />
        )}

        {!loading && !loadError && displayed.length > 0 && (
          <div className="space-y-3">
            {displayed.map((booking) => (
              <div key={booking.id} className="relative overflow-hidden rounded-sm">
                {/* Background hints */}
                <div className="absolute inset-y-0 start-0 flex items-center px-4 bg-red-500/10">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="absolute inset-y-0 end-0 flex items-center px-4 bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>

                {/* Draggable card */}
                <motion.div
                  drag="x"
                  dragConstraints={{ left: -80, right: 80 }}
                  dragElastic={0.1}
                  onDragEnd={(_, { offset, velocity }) => {
                    if (offset.x < -60 || velocity.x < -400) handleCancel(booking.id);
                    if (offset.x > 60 || velocity.x > 400) handleConfirm(booking.id);
                  }}
                  className="relative bg-card border border-border rounded-sm p-4 cursor-grab active:cursor-grabbing"
                  whileDrag={{ boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-sm border ${STATUS_COLORS[booking.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                      {STATUS_LABELS[booking.status] ?? booking.status}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      #{String(booking.id).slice(-6).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {booking.client_name || booking.bride_name || "عميل غير محدد"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(booking.event_date)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3 mt-1">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-gold" />
                      <span className="text-sm font-semibold text-gold">
                        {booking.total_price ? `${Number(booking.total_price).toLocaleString("ar-JO")} د.أ` : "—"}
                      </span>
                    </div>
                    <Link
                      to="/dashboard/bookings/$id"
                      params={{ id: booking.id }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      التفاصيل
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
