import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Users, CreditCard, LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      setIsAdmin((roles ?? []).some((r: any) => r.role === "admin"));
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <PageLoader />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container-editorial py-24 text-center">
          <h1 className="font-serif text-3xl mb-2">غير مصرّح</h1>
          <p className="text-muted-foreground">هذه الصفحة للمشرفين فقط.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container-editorial py-10">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">لوحة الإدارة</div>
        <h1 className="font-serif text-4xl mb-6">إدارة المنصة</h1>
        <nav className="flex flex-wrap gap-2 mb-8 border-b border-border pb-3">
          <TabLink to="/admin" exact icon={<LayoutDashboard className="h-4 w-4" />} label="نظرة عامة" />
          <TabLink to="/admin/photographers" icon={<Users className="h-4 w-4" />} label="المصورات" />
          <TabLink to="/admin/subscriptions" icon={<CreditCard className="h-4 w-4" />} label="المدفوعات" />
        </nav>
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

function TabLink({ to, label, icon, exact }: { to: string; label: string; icon: React.ReactNode; exact?: boolean }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-sm text-sm border border-transparent hover:bg-secondary"
      activeProps={{ className: "inline-flex items-center gap-2 px-3 py-2 rounded-sm text-sm border border-gold/30 bg-gold/5 text-gold" }}
    >
      {icon} {label}
    </Link>
  );
}