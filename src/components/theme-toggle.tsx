import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
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