import { Link } from "@tanstack/react-router";
import { useAuthState } from "@/hooks/use-auth-state";

export function Footer() {
  const { loading: authLoading, authed, isPhotographer } = useAuthState();

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
            <li><Link to="/search" className="hover:text-gold">ابحث عن مصوّر</Link></li>
            <li><Link to="/app" className="hover:text-gold">حمّل التطبيق</Link></li>
            <li><a href="#how" className="hover:text-gold">كيف يعمل النظام</a></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">للمصوّرين</div>
          <ul className="space-y-2">
            {!authLoading && !authed && !isPhotographer && <li><Link to="/photographers/join" className="hover:text-gold">انضم إلى المنصة</Link></li>}
            <li><Link to={authed ? "/dashboard" : "/login"} className="hover:text-gold">{authed ? "لوحة التحكم" : "تسجيل الدخول"}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} EliteCapture. صُمِّم بعناية في عمّان.
      </div>
    </footer>
  );
}
