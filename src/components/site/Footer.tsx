import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useAuthState } from "@/hooks/use-auth-state";
import { startTour } from "@/components/ClientTour";
import { startPhotographerTour } from "@/components/PhotographerTour";
import { DrawRule } from "@/components/site/Reveal";
import { t } from "@/i18n";

// قسم في التذييل: على الهاتف عنوان قابل للنقر يفتح القائمة، وعلى الشاشات الكبيرة مفتوح دائماً.
// الروابط تبقى في الصفحة حتى وهي مطوية كي لا يخسر محرّك البحث شيئاً.
function FooterSection({ id, title, open, onToggle, children }: { id: string; title: string; open: boolean; onToggle: (id: string) => void; children: ReactNode }) {
  return (
    <div className="border-b border-border/40 sm:border-0">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={open}
        aria-controls={`footer-${id}`}
        className="flex w-full items-center justify-between py-3.5 sm:hidden text-sm text-foreground"
      >
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className="hidden sm:block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">{title}</div>
      <ul id={`footer-${id}`} className={`space-y-2 pb-3 sm:pb-0 ${open ? "block" : "hidden"} sm:block`}>
        {children}
      </ul>
    </div>
  );
}

export function Footer() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggle = (id: string) => setOpenSection((cur) => (cur === id ? null : id));
  const { loading: authLoading, authed, isPhotographer } = useAuthState();
  // داخل أدوات العمل على الهاتف لا نعرض تذييل التسويق: يضيف شاشة تمرير كاملة بلا فائدة
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  // وكذلك صفحات الدخول والتسجيل: نموذج واحد مركّز، والتذييل يشتت
  const inApp = /^\/(dashboard|admin|notifications|onboarding|login|forgot-password|reset-password|recover|photographers\/join|track\/|contracts\/|review\/|offer\/|ask\/)/.test(pathname);

  return (
    <footer className={`relative mt-12 sm:mt-24 bg-background ${inApp ? "hidden sm:block" : ""}`}>
      <DrawRule className="absolute inset-x-0 top-0 h-px bg-border/60" duration={1.8} />
      <div className="container-editorial py-8 sm:py-12 grid gap-0 sm:gap-8 sm:grid-cols-5 text-sm">
        <div className="pb-4 sm:pb-0">
          <div className="font-serif text-xl mb-2">Memoria <span className="text-muted-foreground text-base">{t("· ميموريا")}</span></div>
          <p className="text-muted-foreground leading-relaxed sm:hidden">{t("ذاكرة يومكِ، تُحفظ بأمان.")}</p>
          <p className="text-muted-foreground leading-relaxed hidden sm:block">{t("ذاكرة يومكِ، محفوظة بأمان. منصّة لحجز مصوّرات الأعراس والمناسبات في الأردن.")}</p>
          <p className="text-xs text-muted-foreground mt-3 hidden sm:block">{t("للدعم:")}{" "}<a href="mailto:ahmad000haddad@gmail.com" className="inline-block py-1.5 hover:text-gold">ahmad000haddad@gmail.com</a></p>
        </div>
        <FooterSection id="clients" title={t("للعرائس")} open={openSection === "clients"} onToggle={toggle}>
            <li><Link to="/search" className="inline-block py-1.5 hover:text-gold">{t("ابحثي عن مصوّرة")}</Link></li>
            <li><Link to="/for-clients" className="inline-block py-1.5 hover:text-gold">{t("لماذا ميموريا")}</Link></li>
            <li><Link to="/faq" className="inline-block py-1.5 hover:text-gold">{t("الأسئلة الشائعة")}</Link></li>
            <li className="hidden sm:list-item"><Link to="/app" className="inline-block py-1.5 hover:text-gold">{t("ثبّتي التطبيق")}</Link></li>
            <li><Link to="/guide" className="inline-block py-1.5 hover:text-gold">{t("كيف يعمل النظام")}</Link></li>
            <li><a href="/game/" className="inline-block py-1.5 hover:text-gold">{t("العبي: اهربي يا عروس")}</a></li>
            <li className="hidden sm:list-item">{isPhotographer ? (
              // للمصوّرة: جولتها الخاصة خطوة بخطوة داخل لوحة التحكم
              <button onClick={() => { startPhotographerTour(); nav({ to: "/dashboard" }); }} className="inline-block py-1.5 hover:text-gold text-start">{t("أعيدي الجولة التعريفية")}</button>
            ) : (
              <button onClick={() => { startTour(); if (!pathname.startsWith("/search")) nav({ to: "/search" }); }} className="inline-block py-1.5 hover:text-gold text-start">{t("أعيدي الجولة التعريفية")}</button>
            )}</li>
        </FooterSection>
        <FooterSection id="photographers" title={t("للمصوّرات")} open={openSection === "photographers"} onToggle={toggle}>
            {!authLoading && !authed && !isPhotographer && <li><Link to="/photographers/join" className="inline-block py-1.5 hover:text-gold">{t("انضمّي إلى المنصّة")}</Link></li>}
            <li><Link to="/for-photographers" className="inline-block py-1.5 hover:text-gold">{t("مزايا للمصوّرات")}</Link></li>
            <li><Link to="/pricing" className="inline-block py-1.5 hover:text-gold">{t("باقات المصوّرات")}</Link></li>
            <li><Link to={authed ? "/dashboard" : "/login"} className="inline-block py-1.5 hover:text-gold">{authed ? t("لوحة التحكم") : t("تسجيل الدخول")}</Link></li>
        </FooterSection>
        <FooterSection id="cities" title={t("مدن ومناسبات")} open={openSection === "cities"} onToggle={toggle}>
            <li><a href="/wedding-photographer/amman" className="inline-block py-1.5 hover:text-gold">{t("مصورة أعراس في عمّان")}</a></li>
            <li><a href="/wedding-photographer/irbid" className="inline-block py-1.5 hover:text-gold">{t("مصورة أعراس في إربد")}</a></li>
            <li><a href="/wedding-photographer/aqaba" className="inline-block py-1.5 hover:text-gold">{t("مصورة أعراس في العقبة")}</a></li>
            <li><a href="/occasion/engagement" className="inline-block py-1.5 hover:text-gold">{t("مصورة خطوبة")}</a></li>
            <li><a href="/occasion/henna" className="inline-block py-1.5 hover:text-gold">{t("مصورة حنّاء")}</a></li>
            <li><a href="/blog" className="inline-block py-1.5 hover:text-gold">{t("المدوّنة")}</a></li>
        </FooterSection>
        <FooterSection id="platform" title={t("المنصة")} open={openSection === "platform"} onToggle={toggle}>
            <li><Link to="/about" className="inline-block py-1.5 hover:text-gold">{t("من نحن")}</Link></li>
            <li><Link to="/contact" className="inline-block py-1.5 hover:text-gold">{t("تواصلي معنا")}</Link></li>
            <li className="hidden sm:list-item"><Link to="/refund-policy" className="inline-block py-1.5 hover:text-gold">{t("سياسة الإلغاء والاسترداد")}</Link></li>
            <li className="hidden sm:list-item"><Link to="/privacy" className="inline-block py-1.5 hover:text-gold">{t("سياسة الخصوصية")}</Link></li>
            <li className="hidden sm:list-item"><Link to="/terms" className="inline-block py-1.5 hover:text-gold">{t("الشروط والأحكام")}</Link></li>
        </FooterSection>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        {/* على الهاتف: الروابط القانونية سطر واحد صغير بدل قائمة كاملة */}
        <div className="sm:hidden mb-2 flex flex-wrap items-center justify-center gap-x-2">
          <Link to="/privacy" className="inline-block py-1.5 hover:text-gold">{t("سياسة الخصوصية")}</Link>
          <span aria-hidden>·</span>
          <Link to="/terms" className="inline-block py-1.5 hover:text-gold">{t("الشروط والأحكام")}</Link>
          <span aria-hidden>·</span>
          <Link to="/refund-policy" className="inline-block py-1.5 hover:text-gold">{t("سياسة الإلغاء والاسترداد")}</Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
          <span>{t("© {0} Memoria · ميموريا. صُمِّم بعناية في عمّان.", [new Date().getFullYear()])}</span>
          <span className="sm:hidden text-foreground/80">{t("تصميم وتطوير:")}{" "}<a href="https://haddad-dev.lovable.app/" target="_blank" rel="noopener noreferrer" className="inline-block py-1.5 hover:text-gold underline underline-offset-2">{t("أحمد حداد")}</a></span>
        </div>
        <div className="hidden sm:block mt-1.5 text-foreground/80">
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
      <div aria-hidden className="h-[calc(6rem+env(safe-area-inset-bottom))] sm:hidden" />
    </footer>
  );
}
