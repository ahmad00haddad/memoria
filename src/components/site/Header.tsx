import { Link } from "@tanstack/react-router";
import { Camera, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Header() {
  const [unread, setUnread] = useState(0);
  const [authed, setAuthed] = useState(false);
  const [isPhotographer, setIsPhotographer] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
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
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
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
          <Link to="/search" className="px-3 py-2 rounded-sm hover:bg-secondary transition-colors">ابحث عن مصوّر</Link>
          <Link to="/pricing" className="hidden sm:inline-flex px-3 py-2 rounded-sm hover:bg-secondary transition-colors">الأسعار</Link>
          {!isPhotographer && <Link to="/photographers/join" className="hidden sm:inline-flex px-3 py-2 rounded-sm hover:bg-secondary transition-colors">انضم كمصوّر</Link>}
          {authed && (
            <Link to="/notifications" className="relative px-3 py-2 rounded-sm hover:bg-secondary transition-colors" aria-label="إشعارات">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -top-1 -left-1 bg-destructive text-destructive-foreground text-[10px] min-w-[18px] h-[18px] grid place-items-center rounded-full px-1">{unread}</span>
              )}
            </Link>
          )}
          <Link
            to={authed ? "/dashboard" : "/login"}
            className="px-4 py-2 rounded-sm bg-charcoal text-ivory text-sm hover:opacity-90 transition-opacity"
          >
            {authed ? "لوحتي" : "تسجيل الدخول"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
