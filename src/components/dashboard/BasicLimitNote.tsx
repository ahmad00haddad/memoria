import { Link } from "@tanstack/react-router";
import { g } from "@/hooks/use-gender";
import { t } from "@/i18n";

// عدّاد حدود باقة Basic («2 من 3 باقات») مع رابط الترقية — يظهر قبل الوصول للحد.
export function BasicLimitNote({ used, max, what }: { used: number; max: number; what: string }) {
  const full = used >= max;
  return (
    <div className={`mb-4 flex flex-wrap items-center gap-3 rounded-sm border px-4 py-3 text-sm ${full ? "border-gold/60 bg-gold/10" : "border-border bg-card"}`}>
      <span className="font-serif text-lg tabular-nums">{t("{0} من {1}", [Math.min(used, max), max])}</span>
      <span className="flex-1 min-w-0 text-muted-foreground">
        {t("{0} — حد باقة Basic.", [what])}{" "}
        {full ? g(t("وصلتِ للحد."), t("وصلت للحد.")) : null}
      </span>
      <Link to="/dashboard/subscription" className="shrink-0 rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-charcoal hover:opacity-90">
        {t("Pro بلا حد")}
      </Link>
    </div>
  );
}
