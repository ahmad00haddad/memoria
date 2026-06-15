import { Link } from "@tanstack/react-router";
import { Camera, Bell, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";

export function Header() {
  const [unread, setUnread] = useState(0);
  const [authed, setAuthed] = useState(false);
  const [isPhotographer, setIsPhotographer] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async (sessionOverride?: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
      const session = sessionOverride ?? (await supabase.auth.getSession()).data.session;
      if (!active) return;
      setAuthed(!!session);
      setIsPhotographer(false);
      if (session) {
        const [{ count }, { data: profile }] = await Promise.all([
          supabase.from("notifications").select("id", { count: "exact", head: true })
            .eq("user_id", session.user.id).eq("is_read", false),
          supabase.from("profiles").select("id").eq("id", session.user.id).maybeSingle(),
        ]);
        if (!active) return;
        setUnread(count ?? 0);
        setIsPhotographer(!!profile);
      }
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        void load(session);
      });
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container-editorial flex h-16 items-center justify-between">
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
          <Link to="/search" className="hidden sm:inline-flex px-3 py-2 rounded-sm hover:bg-secondary transition-colors">ابحث عن مصوّر</Link>
          <Link to="/guide" className="hidden md:inline-flex px-3 py-2 rounded-sm hover:bg-secondary transition-colors">كيف يعمل</Link>
          <Link to="/pricing" className="hidden md:inline-flex px-3 py-2 rounded-sm hover:bg-secondary transition-colors">الأسعار</Link>
          {!isPhotographer && <Link to="/photographers/join" className="hidden md:inline-flex px-3 py-2 rounded-sm hover:bg-secondary transition-colors">انضم كمصوّر</Link>}
          {authed && (
            <Link to="/notifications" className="relative px-3 py-2 rounded-sm hover:bg-secondary transition-colors" aria-label="إشعارات">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -top-1 -left-1 bg-destructive text-destructive-foreground text-[10px] min-w-[18px] h-[18px] grid place-items-center rounded-full px-1">{unread}</span>
              )}
            </Link>
          )}
          <ThemeToggle />
          {authed ? (
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
                <SheetClose asChild><Link to="/pricing" className="px-3 py-2.5 rounded-sm hover:bg-secondary">الأسعار</Link></SheetClose>
                {!isPhotographer && <SheetClose asChild><Link to="/photographers/join" className="px-3 py-2.5 rounded-sm hover:bg-secondary">انضم كمصوّر</Link></SheetClose>}
                <div className="my-2 h-px bg-border" />
                {authed ? (
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
