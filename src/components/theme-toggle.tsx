import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // أثناء SSR وحتى أول تركيب على العميل نعرض أيقونة محايدة لتجنّب Hydration mismatch.
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="تبديل الوضع"
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
      onClick={toggle}
      aria-label={theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الليلي"}
      title={theme === "dark" ? "الوضع الفاتح" : "الوضع الليلي"}
      className={`relative grid h-9 w-9 place-items-center rounded-sm border border-border/60 bg-background text-foreground hover:bg-secondary transition-colors ${className}`}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}