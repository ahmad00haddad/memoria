import { getLang, setLang } from "@/i18n";

/** عربي ⇄ EN — shows the language you'd switch to. */
export function LangToggle({ className = "" }: { className?: string }) {
  const lang = getLang();
  const next = lang === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      // short delay so the elastic release is seen before the reload
      onClick={() => setTimeout(() => setLang(next), 160)}
      lang={next}
      aria-label={next === "en" ? "Switch to English" : "التبديل إلى العربية"}
      className={`elastic-press h-9 min-w-9 px-2 grid place-items-center rounded-sm border border-border/60 text-xs hover:bg-secondary ${
        next === "en" ? "font-medium tracking-[0.15em]" : "font-sans"
      } ${className}`}
    >
      {next === "en" ? "EN" : "عربي"}
    </button>
  );
}
