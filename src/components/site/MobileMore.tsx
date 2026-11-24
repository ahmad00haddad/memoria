import { ChevronDown } from "lucide-react";
import { t } from "@/i18n";

// على الهاتف نعرض أول عناصر القائمة فقط والباقي خلف زر «عرض الكل».
// العناصر المطوية تبقى في الصفحة (مخفية بالـCSS) فلا يخسر محرّك البحث شيئاً، والشاشات الكبيرة تعرض كل شيء.
export function mobileHidden(index: number, limit: number, open: boolean) {
  if (index < limit) return "";
  return open ? "rise-in" : "hidden sm:block";
}

export function MobileMoreButton({ total, limit, open, onToggle, className = "" }: { total: number; limit: number; open: boolean; onToggle: () => void; className?: string }) {
  if (total <= limit) return null;
  return (
    <div className={`sm:hidden flex justify-center ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-sm text-foreground hover:bg-secondary"
      >
        {open ? t("عرض أقل") : t("عرض الكل ({0})", [total])}
        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}
