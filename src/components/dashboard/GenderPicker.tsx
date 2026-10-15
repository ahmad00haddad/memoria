import { useGender, type Gender } from "@/hooks/use-gender";

// اختيار صيغة المخاطبة في لوحة التحكم: مصوّرة (افتراضي) أو مصوّر.
export function GenderPicker() {
  const { gender, setGender } = useGender();
  const opts: { v: Gender; label: string }[] = [
    { v: "female", label: "مصوّرة" },
    { v: "male", label: "مصوّر" },
  ];
  return (
    <div role="radiogroup" aria-label="صيغة المخاطبة" className="inline-flex rounded-full border border-border p-1">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={gender === o.v}
          onClick={() => setGender(o.v)}
          className={`min-h-11 rounded-full px-5 text-sm transition ${gender === o.v ? "bg-charcoal text-ivory dark:bg-gold dark:text-charcoal" : "text-muted-foreground hover:text-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
