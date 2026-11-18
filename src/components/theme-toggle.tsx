import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { t } from "@/i18n";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  // pop the icon only after a real click, not on first paint
  const [popped, setPopped] = useState(false);
  useEffect(() => setMounted(true), []);
  // أثناء SSR وحتى أول تركيب على العميل نعرض أيقونة محايدة لتجنّب Hydration mismatch.
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label={t("تبديل الوضع")}
        className={`relative grid h-9 w-9 place-items-center rounded-sm border border-border/60 bg-background text-foreground ${className}`}
        suppressHydrationWarning
      >
        <Moon className="h-4 w-4 opacity-60" aria-hidden="true" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => { setPopped(true); toggle(); }}
      aria-label={theme === "dark" ? t("تفعيل الوضع الفاتح") : t("تفعيل الوضع الليلي")}
      title={theme === "dark" ? t("الوضع الفاتح") : t("الوضع الليلي")}
      className={`elastic-press relative grid h-9 w-9 place-items-center rounded-sm border border-border/60 bg-background text-foreground hover:bg-secondary ${className}`}
    >
      <span key={theme} className={popped ? "elastic-pop grid" : "grid"}>
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </span>
    </button>
  );
}