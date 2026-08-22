import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, LayoutDashboard, User, HelpCircle, Briefcase, Tag, PlusCircle } from "lucide-react";
import { useAuthState } from "@/hooks/use-auth-state";
import { useEffect, useState } from "react";

export function MobileTabBar() {
  const { authed, isPhotographer } = useAuthState();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [visitorRole, setVisitorRole] = useState<"client" | "photographer" | "guest" | null>(null);

  useEffect(() => {
    try {
      const r = localStorage.getItem("memoria_visitor_role") as "client" | "photographer" | "guest" | null;
      setVisitorRole(r);
    } catch {}
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  // إخفاء الشريط السفلي في صفحات الملف الشخصي للمصورات لترك مساحة لزر الحجز
  if (currentPath.startsWith("/photographers/") && currentPath !== "/photographers/join") return null;

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        
        {/* رابط الرئيسية (موجود دائماً) */}
        <Link
          to="/"
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
            isActive("/") ? "text-gold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px]">الرئيسية</span>
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
              <span className="text-[10px]">البحث</span>
            </Link>
            <Link
              to="/guide"
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                isActive("/guide") ? "text-gold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <HelpCircle className="h-5 w-5" />
              <span className="text-[10px]">كيف يعمل</span>
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
              <span className="text-[10px]">المميزات</span>
            </Link>
            {!authed && (
              <Link
                to="/pricing"
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                  isActive("/pricing") ? "text-gold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Tag className="h-5 w-5" />
                <span className="text-[10px]">الأسعار</span>
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
            <span className="text-[10px]">لوحتي</span>
          </Link>
        ) : (visitorRole === "photographer") ? (
          <Link
            to="/photographers/join"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive("/photographers/join") ? "text-gold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PlusCircle className="h-5 w-5" />
            <span className="text-[10px]">انضمي</span>
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
