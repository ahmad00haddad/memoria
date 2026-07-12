import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, LayoutDashboard, User } from "lucide-react";
import { useAuthState } from "@/hooks/use-auth-state";

export function MobileTabBar() {
  const { authed } = useAuthState();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  // إخفاء الشريط السفلي في صفحات المصورات لترك مساحة لزر الحجز
  if (currentPath.startsWith("/photographers/")) return null;

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        <Link
          to="/"
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
            isActive("/") ? "text-gold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px]">الرئيسية</span>
        </Link>
        <Link
          to="/search"
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
            isActive("/search") ? "text-gold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Search className="h-5 w-5" />
          <span className="text-[10px]">البحث</span>
        </Link>
        {authed ? (
          <Link
            to="/dashboard"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive("/dashboard") && !isActive("/dashboard/profile") ? "text-gold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[10px]">لوحتي</span>
          </Link>
        ) : (
          <Link
            to="/login"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive("/login") ? "text-gold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-[10px]">دخول</span>
          </Link>
        )}
      </div>
    </div>
  );
}
