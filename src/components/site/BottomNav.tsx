import { Link } from "@tanstack/react-router";
import { useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Calendar, Clapperboard, Bell, UserCircle, Search, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthState } from "@/hooks/use-auth-state";

interface Tab {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export function BottomNav() {
  const [visible, setVisible] = useState(true);
  const [showNav, setShowNav] = useState(false);
  const [unread, setUnread] = useState(0);
  const lastY = useRef(0);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { authed, isPhotographer, userId } = useAuthState();

  // Only show on mobile or PWA standalone
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkShow = () => {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches
        || (window.navigator as any)?.standalone === true;
      const isMobile = window.innerWidth < 768;
      setShowNav(isStandalone || isMobile);
    };
    checkShow();
    window.addEventListener("resize", checkShow);
    return () => window.removeEventListener("resize", checkShow);
  }, []);

  // Scroll hide/show
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y < lastY.current || y < 80);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Unread notifications
  useEffect(() => {
    if (!userId) { setUnread(0); return; }
    let active = true;
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .then(({ count }) => { if (active) setUnread(count ?? 0); });
    return () => { active = false; };
  }, [userId]);

  if (!showNav) return null;

  const photographerTabs: Tab[] = [
    { to: "/dashboard/", label: "الرئيسية", icon: <Home className="h-5 w-5" /> },
    { to: "/dashboard/bookings", label: "الحجوزات", icon: <Calendar className="h-5 w-5" /> },
    { to: "/dashboard/production", label: "الإنتاج", icon: <Clapperboard className="h-5 w-5" /> },
    { to: "/notifications", label: "الإشعارات", icon: <Bell className="h-5 w-5" />, badge: unread },
    { to: "/dashboard/profile", label: "حسابي", icon: <UserCircle className="h-5 w-5" /> },
  ];

  const publicTabs: Tab[] = [
    { to: "/", label: "الرئيسية", icon: <Home className="h-5 w-5" /> },
    { to: "/search", label: "بحث", icon: <Search className="h-5 w-5" /> },
    { to: "/app", label: "التطبيق", icon: <Smartphone className="h-5 w-5" /> },
  ];

  const tabs = authed && isPhotographer ? photographerTabs : publicTabs;

  const isActive = (to: string) => {
    if (to === "/dashboard/") return pathname === "/dashboard/";
    return pathname.startsWith(to);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          className="fixed bottom-0 left-0 right-0 z-50
                     bg-background/95 backdrop-blur-md border-t border-border
                     pb-[env(safe-area-inset-bottom)]
                     md:hidden"
        >
          <div className="flex items-center justify-around h-16">
            {tabs.map((tab) => {
              const active = isActive(tab.to);
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className="relative flex flex-col items-center justify-center
                             flex-1 h-full gap-0.5 touch-card"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ color: active ? "var(--gold)" : "var(--muted-foreground)" }}
                      transition={{ duration: 0.2 }}
                    >
                      {tab.icon}
                    </motion.div>
                    {tab.badge && tab.badge > 0 ? (
                      <span className="absolute -top-1 -right-1 bg-gold text-white
                                       text-[10px] h-4 w-4 rounded-full flex items-center
                                       justify-center font-medium leading-none">
                        {tab.badge > 9 ? "9+" : tab.badge}
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={`text-[10px] font-medium transition-colors ${
                      active ? "text-[var(--gold)]" : "text-muted-foreground"
                    }`}
                  >
                    {tab.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="bottom-tab-indicator"
                      className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-[var(--gold)] rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
