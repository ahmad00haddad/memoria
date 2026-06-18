import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Calendar, ListChecks, User, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthState } from "@/hooks/use-auth-state";
import { supabase } from "@/integrations/supabase/client";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const items: NavItem[] = [
  { to: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/bookings", label: "الحجوزات", icon: ListChecks },
  { to: "/dashboard/calendar", label: "التقويم", icon: Calendar },
  { to: "/notifications", label: "إشعارات", icon: Bell },
  { to: "/dashboard/profile", label: "ملفّي", icon: User },
];

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { userId } = useAuthState();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    if (!userId) { setUnread(0); return; }
    (async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (active) setUnread(count ?? 0);
    })();
    return () => { active = false; };
  }, [userId, pathname]);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
          const Icon = it.icon;
          const isNotif = it.to === "/notifications";
          return (
            <li key={it.to}>
              <Link
                to={it.to as any}
                className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] transition-colors ${active ? "text-gold" : "text-muted-foreground hover:text-foreground"}`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {isNotif && unread > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[9px] min-w-[16px] h-[16px] grid place-items-center rounded-full px-1 font-semibold">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}