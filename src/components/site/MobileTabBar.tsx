import { useHideOnScroll } from "@/hooks/use-hide-on-scroll";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, LayoutDashboard, User, HelpCircle, Briefcase, Tag, PlusCircle } from "lucide-react";
import { motion } from "framer-motion";
import { openCommandPalette } from "@/components/command-event";
import { useAuthState } from "@/hooks/use-auth-state";
import { useEffect, useState } from "react";
import { t as tr, tx } from "@/i18n";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";

export function MobileTabBar() {
  const navHidden = useHideOnScroll();
  const { authed, isPhotographer } = useAuthState();
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


  // إخفاء الشريط السفلي في صفحات الملف الشخصي للمصورات لترك مساحة لزر الحجز
  if (currentPath.startsWith("/photographers/") && currentPath !== "/photographers/join") return null;

  // داخل الداشبورد يعرض الـ layout شريطه الخاص (MobileBottomNav): نتجنب تراكب شريطين في القاع
  if (currentPath === "/dashboard" || currentPath.startsWith("/dashboard/")) return null;

  // المصوّرة المسجّلة: نفس شريط اللوحة في كل مكان (لا شريطين مختلفين)
  if (authed && isPhotographer) return <MobileBottomNav />;

  const tab = (to: string, label: string, Icon: typeof Home, active: boolean) => (
    <Link
      key={to}
      to={to as any}
      aria-label={label}
      title={label}
      className={`elastic-press relative flex h-14 items-center justify-center gap-1.5 rounded-full transition-colors duration-300 ${active ? "px-4 text-charcoal" : "w-14 text-ivory/70 hover:text-ivory"}`}
    >
      {active && (
        <motion.span
          layoutId="visitor-nav-active"
          className="absolute inset-0 rounded-full bg-ivory shadow-md"
          transition={{ type: "spring", stiffness: 520, damping: 22, mass: 0.9 }}
        />
      )}
      <Icon key={String(active)} className={`relative h-[22px] w-[22px] shrink-0 ${active ? "elastic-bump" : ""}`} strokeWidth={1.75} />
      {active && (
        <motion.span
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.08 }}
          className="relative whitespace-nowrap text-[13px] font-medium"
        >
          {label}
        </motion.span>
      )}
    </Link>
  );

  const showClient = visitorRole === "client" || (!visitorRole && !isPhotographer);
  const showPhotog = !showClient && (visitorRole === "photographer" || isPhotographer);

  return (
    <nav className={`vt-bottom-nav sm:hidden fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 pointer-events-none transition-transform duration-300 ease-out ${navHidden ? "translate-y-[calc(100%+2rem)]" : "translate-y-0"}`}>
      <div className="pointer-events-auto flex items-center justify-around gap-1 rounded-full border border-white/10 bg-charcoal/95 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
        {tab("/", tr("الرئيسية"), Home, isActive("/"))}
        {showClient && tab("/search", tr("البحث"), Search, isActive("/search"))}
        {showClient && tab("/guide", tr("كيف يعمل"), HelpCircle, isActive("/guide"))}
        {showPhotog && tab("/for-photographers", tr("المميزات"), Briefcase, isActive("/for-photographers"))}
        {showPhotog && !authed && tab("/pricing", tr("الأسعار"), Tag, isActive("/pricing"))}
        {authed
          ? tab("/dashboard", tr("لوحتي"), LayoutDashboard, isActive("/dashboard") && !isActive("/dashboard/profile"))
          : visitorRole === "photographer"
            ? tab("/photographers/join", tr("انضمي"), PlusCircle, isActive("/photographers/join"))
            : tab("/login", tr("للمصوّرات"), User, isActive("/login"))}
      </div>
    </nav>
  );
}
