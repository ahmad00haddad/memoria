import { Link, useNavigate } from "@tanstack/react-router";
import { useAuthState } from "@/hooks/use-auth-state";
import { startTour } from "@/components/ClientTour";

export function Footer() {
  const { loading: authLoading, authed, isPhotographer } = useAuthState();

  return (
    <footer className="mt-24 border-t border-border/60 bg-background">
      <div className="container-editorial py-12 grid gap-8 sm:grid-cols-4 text-sm">
        <div>
          <div className="font-serif text-xl mb-2">Memoria <span className="text-muted-foreground text-base">· ميموريا</span></div>
          <p className="text-muted-foreground leading-relaxed">ذاكرة يومكِ، محفوظة بأمان. شركة أردنية مسجلة (ذ.م.م) متخصّصة في حجز وتوثيق خدمات التصوير.</p>
          <p className="text-xs text-muted-foreground mt-3">للدعم: <a href="mailto:ahmad000haddad@gmail.com" className="hover:text-gold">ahmad000haddad@gmail.com</a></p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">للعملاء</div>
          <ul className="space-y-2">
            <li><Link to="/search" className="hover:text-gold">ابحث عن مصوّر</Link></li>
            <li><Link to="/for-clients" className="hover:text-gold">لماذا ميموريا</Link></li>
            <li><Link to="/faq" className="hover:text-gold">الأسئلة الشائعة</Link></li>
            <li><Link to="/app" className="hover:text-gold">حمّل التطبيق</Link></li>
            <li><Link to="/guide" className="hover:text-gold">كيف يعمل النظام</Link></li>
            <li><button onClick={() => startTour()} className="hover:text-gold text-right">أعد الجولة التعريفية</button></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">للمصوّرين</div>
          <ul className="space-y-2">
            {!authLoading && !authed && !isPhotographer && <li><Link to="/photographers/join" className="hover:text-gold">انضم إلى المنصة</Link></li>}
            <li><Link to="/for-photographers" className="hover:text-gold">مزايا للمصوّرات</Link></li>
            <li><Link to="/pricing" className="hover:text-gold">باقات المصوّرين</Link></li>
            <li><Link to={authed ? "/dashboard" : "/login"} className="hover:text-gold">{authed ? "لوحة التحكم" : "تسجيل الدخول"}</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">المنصة</div>
          <ul className="space-y-2">
            <li><Link to="/about" className="hover:text-gold">من نحن</Link></li>
            <li><Link to="/contact" className="hover:text-gold">تواصلي معنا</Link></li>
            <li><Link to="/refund-policy" className="hover:text-gold">سياسة الإلغاء والاسترداد</Link></li>
            <li><Link to="/privacy" className="hover:text-gold">سياسة الخصوصية</Link></li>
            <li><Link to="/terms" className="hover:text-gold">الشروط والأحكام</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>© {new Date().getFullYear()} Memoria · ميموريا. صُمِّم بعناية في عمّان.</span>
        </div>
      </div>
    </footer>
  );
}
