import { useGender, type Gender } from "@/hooks/use-gender";
import { t, tx } from "@/i18n";

// اختيار صيغة المخاطبة في لوحة التحكم: مصوّرة (افتراضي) أو مصوّر.
export function GenderPicker() {
  const { gender, setGender } = useGender();
  const opts: { v: Gender; label: string }[] = [
    { v: "female", label: t("مصوّرة") },
    { v: "male", label: t("مصوّر") },
  ];
  return (
    <div role="radiogroup" aria-label={t("صيغة المخاطبة")} className="inline-flex rounded-full border border-border p-1">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={gender === o.v}
          onClick={() => setGender(o.v)}
          className={`min-h-11 rounded-full px-5 text-sm transition ${gender === o.v ? "bg-charcoal text-ivory dark:bg-gold dark:text-charcoal" : "text-muted-foreground hover:text-foreground"}`}
        >
          {tx(o.label)}
        </button>
      ))}
    </div>
  );
}
