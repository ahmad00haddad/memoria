import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuthState } from "@/hooks/use-auth-state";
import { startTour } from "@/components/ClientTour";
import { DrawRule } from "@/components/site/Reveal";
import { t } from "@/i18n";

export function Footer() {
  const { loading: authLoading, authed, isPhotographer } = useAuthState();
  // داخل أدوات العمل على الهاتف لا نعرض تذييل التسويق: يضيف شاشة تمرير كاملة بلا فائدة
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const inApp = /^\/(dashboard|admin|notifications|onboarding)/.test(pathname);

  return (
    <footer className={`relative mt-12 sm:mt-24 bg-background ${inApp ? "hidden sm:block" : ""}`}>
      <DrawRule className="absolute inset-x-0 top-0 h-px bg-border/60" duration={1.8} />
      <div className="container-editorial py-12 grid gap-8 sm:grid-cols-5 text-sm">
        <div>
          <div className="font-serif text-xl mb-2">Memoria <span className="text-muted-foreground text-base">{t("· ميموريا")}</span></div>
          <p className="text-muted-foreground leading-relaxed">{t("ذاكرة يومكِ، محفوظة بأمان. منصّة لحجز مصوّرات الأعراس والمناسبات في الأردن.")}</p>
          <p className="text-xs text-muted-foreground mt-3">{t("للدعم:")}{" "}<a href="mailto:ahmad000haddad@gmail.com" className="inline-block py-1.5 hover:text-gold">ahmad000haddad@gmail.com</a></p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">{t("للعملاء")}</div>
          <ul className="space-y-2">
            <li><Link to="/search" className="inline-block py-1.5 hover:text-gold">{t("ابحث عن مصوّر")}</Link></li>
            <li><Link to="/for-clients" className="inline-block py-1.5 hover:text-gold">{t("لماذا ميموريا")}</Link></li>
            <li><Link to="/faq" className="inline-block py-1.5 hover:text-gold">{t("الأسئلة الشائعة")}</Link></li>
            <li><Link to="/app" className="inline-block py-1.5 hover:text-gold">{t("حمّل التطبيق")}</Link></li>
            <li><Link to="/guide" className="inline-block py-1.5 hover:text-gold">{t("كيف يعمل النظام")}</Link></li>
            <li><a href="/game/" className="inline-block py-1.5 hover:text-gold">{t("العبي: اهربي يا عروس")}</a></li>
            <li><button onClick={() => startTour()} className="inline-block py-1.5 hover:text-gold text-start">{t("أعد الجولة التعريفية")}</button></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">{t("للمصوّرين")}</div>
          <ul className="space-y-2">
            {!authLoading && !authed && !isPhotographer && <li><Link to="/photographers/join" className="inline-block py-1.5 hover:text-gold">{t("انضم إلى المنصة")}</Link></li>}
            <li><Link to="/for-photographers" className="inline-block py-1.5 hover:text-gold">{t("مزايا للمصوّرات")}</Link></li>
            <li><Link to="/pricing" className="inline-block py-1.5 hover:text-gold">{t("باقات المصوّرين")}</Link></li>
            <li><Link to={authed ? "/dashboard" : "/login"} className="inline-block py-1.5 hover:text-gold">{authed ? t("لوحة التحكم") : t("تسجيل الدخول")}</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">{t("مدن ومناسبات")}</div>
          <ul className="space-y-2">
            <li><a href="/wedding-photographer/amman" className="inline-block py-1.5 hover:text-gold">{t("مصورة أعراس في عمّان")}</a></li>
            <li><a href="/wedding-photographer/irbid" className="inline-block py-1.5 hover:text-gold">{t("مصورة أعراس في إربد")}</a></li>
            <li><a href="/wedding-photographer/aqaba" className="inline-block py-1.5 hover:text-gold">{t("مصورة أعراس في العقبة")}</a></li>
            <li><a href="/occasion/engagement" className="inline-block py-1.5 hover:text-gold">{t("مصورة خطوبة")}</a></li>
            <li><a href="/occasion/henna" className="inline-block py-1.5 hover:text-gold">{t("مصورة حنّاء")}</a></li>
            <li><a href="/blog" className="inline-block py-1.5 hover:text-gold">{t("المدوّنة")}</a></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">{t("المنصة")}</div>
          <ul className="space-y-2">
            <li><Link to="/about" className="inline-block py-1.5 hover:text-gold">{t("من نحن")}</Link></li>
            <li><Link to="/contact" className="inline-block py-1.5 hover:text-gold">{t("تواصلي معنا")}</Link></li>
            <li><Link to="/refund-policy" className="inline-block py-1.5 hover:text-gold">{t("سياسة الإلغاء والاسترداد")}</Link></li>
            <li><Link to="/privacy" className="inline-block py-1.5 hover:text-gold">{t("سياسة الخصوصية")}</Link></li>
            <li><Link to="/terms" className="inline-block py-1.5 hover:text-gold">{t("الشروط والأحكام")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>{t("© {0} Memoria · ميموريا. صُمِّم بعناية في عمّان.", [new Date().getFullYear()])}</span>
        </div>
        <div className="mt-1.5 text-foreground/80">
          <span>{t("تصميم وتطوير:")}{" "}</span>
          <a
            href="https://haddad-dev.lovable.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block py-1.5 hover:text-gold transition-colors duration-200 underline underline-offset-2"
          >
            {t("أحمد حداد")}
          </a>
        </div>
      </div>
      {/* مساحة للشريط السفلي الثابت على الهاتف كي لا يغطي آخر سطر */}
      <div aria-hidden className="h-[calc(4.5rem+env(safe-area-inset-bottom))] sm:hidden" />
    </footer>
  );
}
