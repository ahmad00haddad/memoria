import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, LayoutDashboard, User, HelpCircle, Briefcase, Tag, PlusCircle, Calendar, ListChecks, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { openCommandPalette } from "@/components/CommandPalette";
import { useAuthState } from "@/hooks/use-auth-state";
import { useEffect, useState } from "react";
import { t as tr, tx } from "@/i18n";

export function MobileTabBar() {
  const { authed, isPhotographer, userId } = useAuthState();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [visitorRole, setVisitorRole] = useState<"client" | "photographer" | "guest" | null>(null);

  useEffect(() => {
    try {
      const r = localStorage.getItem("memoria_visitor_role") as "client" | "photographer" | "guest" | null;
      setVisitorRole(r);
    } catch { /* ignore */ }
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  // عدد الطلبات التي تنتظر المصوّرة — يظهر كشارة على تبويب الحجوزات
  const [pending, setPending] = useState(0);
  useEffect(() => {
    if (!authed || !isPhotographer || !userId) return;
    let cancelled = false;
    supabase.from("bookings").select("id", { count: "exact", head: true })
      .eq("photographer_id", userId).is("deleted_at", null).in("status", ["quote", "pending_deposit"])
      .then(({ count }) => { if (!cancelled) setPending(count ?? 0); });
    return () => { cancelled = true; };
  }, [authed, isPhotographer, userId, currentPath]);

  // إخفاء الشريط السفلي في صفحات الملف الشخصي للمصورات لترك مساحة لزر الحجز
  if (currentPath.startsWith("/photographers/") && currentPath !== "/photographers/join") return null;

  // داخل الداشبورد يعرض الـ layout شريطه الخاص (MobileBottomNav): نتجنب تراكب شريطين في القاع
  if (currentPath === "/dashboard" || currentPath.startsWith("/dashboard/")) return null;

  // المصوّرة المسجّلة: أدوات عملها اليومية بدل صفحات التسويق
  if (authed && isPhotographer) {
    const tabs = [
      { to: "/dashboard", label: tr("لوحتي"), icon: LayoutDashboard, active: currentPath === "/dashboard" || currentPath === "/dashboard/" },
      { to: "/dashboard/bookings", label: tr("الحجوزات"), icon: Calendar, active: currentPath.startsWith("/dashboard/bookings"), badge: pending },
      { to: "/dashboard/production", label: tr("الإنتاج"), icon: ListChecks, active: currentPath.startsWith("/dashboard/production") },
      { to: "/dashboard/calendar", label: tr("التقويم"), icon: CalendarDays, active: currentPath.startsWith("/dashboard/calendar") },
    ];
    return (
      <div className="sm:hidden fixed bottom-0 end-0 start-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          {tabs.map((t) => (
            <Link key={t.to} to={t.to as any} className={`relative flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${t.active ? "text-gold" : "text-muted-foreground"}`}>
              {t.active && <motion.span layoutId="tabbar-active" className="absolute top-0 h-0.5 w-8 rounded-full bg-gold" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
              <span className="relative">
                <motion.span className="inline-flex" animate={{ y: t.active ? -2 : 0, scale: t.active ? 1.08 : 1 }} transition={{ type: "spring", stiffness: 400, damping: 22 }}>
                  <t.icon className="h-5 w-5" strokeWidth={t.active ? 2.2 : 1.8} />
                </motion.span>
                {!!t.badge && (
                  <motion.span key={t.badge} initial={{ scale: 0.4 }} animate={{ scale: 1 }} className="absolute -top-1.5 -end-2 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-bold text-charcoal tabular-nums">
                    {tx(t.badge)}
                  </motion.span>
                )}
              </span>
              <span className="text-[11px] font-medium">{tx(t.label)}</span>
            </Link>
          ))}
          <button onClick={openCommandPalette} className="flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground">
            <Search className="h-5 w-5" strokeWidth={1.8} />
            <span className="text-[11px] font-medium">{tr("بحث")}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sm:hidden fixed bottom-0 end-0 start-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        
        {/* رابط الرئيسية (موجود دائماً) */}
        <Link
          to="/"
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
            isActive("/") ? "text-gold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[11px] font-medium">{tr("الرئيسية")}</span>
        </Link>

        {/* الروابط الديناميكية حسب الدور */}
        {(visitorRole === "client" || (!visitorRole && !isPhotographer)) ? (
          <>
            <Link
              to="/search"
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                isActive("/search") ? "text-gold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Search className="h-5 w-5" />
              <span className="text-[11px] font-medium">{tr("البحث")}</span>
            </Link>
            <Link
              to="/guide"
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                isActive("/guide") ? "text-gold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <HelpCircle className="h-5 w-5" />
              <span className="text-[11px] font-medium">{tr("كيف يعمل")}</span>
            </Link>
          </>
        ) : (visitorRole === "photographer" || isPhotographer) ? (
          <>
            <Link
              to="/for-photographers"
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                isActive("/for-photographers") ? "text-gold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="h-5 w-5" />
              <span className="text-[11px] font-medium">{tr("المميزات")}</span>
            </Link>
            {!authed && (
              <Link
                to="/pricing"
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                  isActive("/pricing") ? "text-gold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Tag className="h-5 w-5" />
                <span className="text-[11px] font-medium">{tr("الأسعار")}</span>
              </Link>
            )}
          </>
        ) : null}

        {/* رابط التسجيل / لوحة التحكم */}
        {authed ? (
          <Link
            to="/dashboard"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive("/dashboard") && !isActive("/dashboard/profile") ? "text-gold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[11px] font-medium">{tr("لوحتي")}</span>
          </Link>
        ) : (visitorRole === "photographer") ? (
          <Link
            to="/photographers/join"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive("/photographers/join") ? "text-gold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PlusCircle className="h-5 w-5" />
            <span className="text-[11px] font-medium">{tr("انضمي")}</span>
          </Link>
        ) : (
          <Link
            to="/login"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive("/login") ? "text-gold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-[11px] font-medium">{tr("دخول")}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
