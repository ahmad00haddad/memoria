import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Calendar, ListChecks, User, Settings } from "lucide-react";

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
  { to: "/dashboard/profile", label: "ملفّي", icon: User },
  { to: "/dashboard/subscription", label: "الاشتراك", icon: Settings },
];

export function MobileBottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to as any}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] transition-colors ${active ? "text-gold" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-5 w-5" />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}