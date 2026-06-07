import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, CreditCard, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminIndex,
});

function AdminIndex() {
  const [stats, setStats] = useState({ photographers: 0, active: 0, pending: 0, bookings: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: p }, { count: a }, { count: pend }, { count: b }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("subscription_payments").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("bookings").select("*", { count: "exact", head: true }),
      ]);
      setStats({ photographers: p ?? 0, active: a ?? 0, pending: pend ?? 0, bookings: b ?? 0 });
    })();
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="إجمالي المصورات" value={stats.photographers} icon={<Users className="h-5 w-5 text-gold" />} to="/admin/photographers" />
      <StatCard label="اشتراكات نشطة" value={stats.active} icon={<Users className="h-5 w-5 text-emerald-600" />} to="/admin/photographers" />
      <StatCard label="دفعات قيد المراجعة" value={stats.pending} icon={<AlertCircle className="h-5 w-5 text-amber-600" />} to="/admin/subscriptions" />
      <StatCard label="إجمالي الحجوزات" value={stats.bookings} icon={<CreditCard className="h-5 w-5 text-charcoal" />} to="/admin/photographers" />
    </div>
  );
}

function StatCard({ label, value, icon, to }: { label: string; value: number; icon: React.ReactNode; to: string }) {
  return (
    <Link to={to} className="rounded-sm border border-border bg-card p-5 hover:shadow-soft transition">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
        {icon}
      </div>
      <div className="font-serif text-3xl">{value.toLocaleString("ar-JO")}</div>
    </Link>
  );
}