import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Footer() {
  const [isPhotographer, setIsPhotographer] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async (sessionOverride?: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
      const session = sessionOverride ?? (await supabase.auth.getSession()).data.session;

      if (!active || !session) {
        setIsPhotographer(false);
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("id").eq("id", session.user.id).maybeSingle();
      if (!active) return;
      setIsPhotographer(!!profile);
    };

    load();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        void load(session);
      });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <footer className="mt-24 border-t border-border/60 bg-background">
      <div className="container-editorial py-12 grid gap-8 sm:grid-cols-3 text-sm">
        <div>
          <div className="font-serif text-xl mb-2">EliteCapture</div>
          <p className="text-muted-foreground leading-relaxed">منصة فاخرة لإدارة حجوزات مصوّري الأعراس في الأردن — بدون فوضى الواتساب.</p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">للعملاء</div>
          <ul className="space-y-2">
            <li><a href="/search" className="hover:text-gold">ابحث عن مصوّر</a></li>
            <li><a href="#how" className="hover:text-gold">كيف يعمل النظام</a></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">للمصوّرين</div>
          <ul className="space-y-2">
            {!isPhotographer && <li><a href="/photographers/join" className="hover:text-gold">انضم إلى المنصة</a></li>}
            <li><a href="/login" className="hover:text-gold">تسجيل الدخول</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} EliteCapture. صُمِّم بعناية في عمّان.
      </div>
    </footer>
  );
}
