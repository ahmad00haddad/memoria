import { Link } from "@tanstack/react-router";
import { Camera, Bell, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useAuthState } from "@/hooks/use-auth-state";

export function Header() {
  const [unread, setUnread] = useState(0);
  const [openMenu, setOpenMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { loading: authLoading, authed, userId, isPhotographer } = useAuthState();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const loadUnread = async () => {
      if (!userId) { setUnread(0); return; }
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (active) setUnread(count ?? 0);
    };

    void loadUnread();

    // ✅ Real-time: الاشتراك في الإشعارات الجديدة فوراً بدون polling
    if (userId) {
      channel = supabase
        .channel(`notif-badge-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            if (active) setUnread((prev) => prev + 1);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            // عند قراءة الإشعارات، أعد حساب العدد
            if (active) void loadUnread();
          }
        )
        .subscribe();
    }

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-sm border-border/50 py-1"
          : "bg-background/60 backdrop-blur-md border-transparent py-2"
      }`}
    >
      <div className="container-editorial flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="grid h-9 w-9 place-items-center rounded-sm bg-gradient-gold">
            <Camera className="h-4 w-4 text-charcoal" />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg tracking-wide">EliteCapture</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Wedding · Jordan</div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          <NavLink to="/search" className="hidden sm:inline-flex">ابحث عن مصوّر</NavLink>
          <NavLink to="/guide" className="hidden md:inline-flex">كيف يعمل</NavLink>
          <NavLink to="/pricing" className="hidden md:inline-flex">باقات المصوّرين</NavLink>
          <NavLink to="/for-photographers" className="hidden lg:inline-flex">للمصوّرات</NavLink>
          {!authLoading && !authed && !isPhotographer && (
            <NavLink to="/photographers/join" className="hidden md:inline-flex">انضم كمصوّر</NavLink>
          )}
          {authed && (
            <Link to="/notifications" className="relative px-3 py-2 rounded-sm hover:bg-secondary transition-colors" aria-label="إشعارات">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -top-1 -left-1 bg-destructive text-destructive-foreground text-[10px] min-w-[18px] h-[18px] grid place-items-center rounded-full px-1">{unread}</span>
              )}
            </Link>
          )}
          <ThemeToggle />
          {authLoading ? (
            <span className="hidden sm:inline-flex h-9 w-24 rounded-sm bg-secondary/70" aria-hidden="true" />
          ) : authed ? (
            <Link to="/dashboard" className="hidden sm:inline-flex px-4 py-2 rounded-sm bg-charcoal text-ivory text-sm hover:opacity-90 transition-opacity">لوحتي</Link>
          ) : (
            <Link to="/login" className="hidden sm:inline-flex px-4 py-2 rounded-sm bg-charcoal text-ivory text-sm hover:opacity-90 transition-opacity">تسجيل الدخول</Link>
          )}
          <Sheet open={openMenu} onOpenChange={setOpenMenu}>
            <SheetTrigger asChild>
              <button className="md:hidden grid h-9 w-9 place-items-center rounded-sm border border-border/60 hover:bg-secondary" aria-label="القائمة">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72" dir="rtl">
              <SheetHeader>
                <SheetTitle>القائمة</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1 text-sm">
                <SheetClose asChild><Link to="/search" className="px-3 py-2.5 rounded-sm hover:bg-secondary">ابحث عن مصوّر</Link></SheetClose>
                <SheetClose asChild><Link to="/guide" className="px-3 py-2.5 rounded-sm hover:bg-secondary">كيف يعمل</Link></SheetClose>
                <SheetClose asChild><Link to="/pricing" className="px-3 py-2.5 rounded-sm hover:bg-secondary">باقات المصوّرين</Link></SheetClose>
                <SheetClose asChild><Link to="/for-clients" className="px-3 py-2.5 rounded-sm hover:bg-secondary">للعملاء</Link></SheetClose>
                <SheetClose asChild><Link to="/for-photographers" className="px-3 py-2.5 rounded-sm hover:bg-secondary">للمصوّرات</Link></SheetClose>
                {!authLoading && !authed && !isPhotographer && <SheetClose asChild><Link to="/photographers/join" className="px-3 py-2.5 rounded-sm hover:bg-secondary">انضم كمصوّر</Link></SheetClose>}
                <div className="my-2 h-px bg-border" />
                {authLoading ? (
                  <div className="h-10 rounded-sm bg-secondary/70" aria-hidden="true" />
                ) : authed ? (
                  <SheetClose asChild>
                    <Link to="/dashboard" className="px-3 py-2.5 rounded-sm bg-charcoal text-ivory text-center hover:opacity-90">لوحتي</Link>
                  </SheetClose>
                ) : (
                  <SheetClose asChild>
                    <Link to="/login" className="px-3 py-2.5 rounded-sm bg-charcoal text-ivory text-center hover:opacity-90">تسجيل الدخول</Link>
                  </SheetClose>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  to,
  children,
  className = "",
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link to={to as any} className={`relative group px-2 py-1 rounded-sm hover:bg-secondary transition-colors ${className}`}>
      <span className="relative z-10">{children}</span>
      <motion.span
        className="absolute bottom-0 left-0 right-0 h-px bg-gold origin-left"
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      />
    </Link>
  );
}
