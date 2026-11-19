import { useEffect, useState } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { t as tr, locale } from "@/i18n";

const MAX = 3000;
const STEP = 50;

/**
 * Two-thumb price slider synced with the min/max price filters.
 * Thumbs go "jelly" (stretch) while dragged — see .jelly-thumb in styles.css.
 * The search only re-runs when the drag ends (onValueCommit).
 */
export function PriceRange({
  min,
  max,
  onChange,
}: {
  min: string;
  max: string;
  onChange: (min: string, max: string) => void;
}) {
  const toVals = (): [number, number] => [min ? Number(min) : 0, max ? Math.min(Number(max), MAX) : MAX];
  const [vals, setVals] = useState<[number, number]>(toVals);
  // keep in sync when the number inputs or "clear" change the filters
  useEffect(() => setVals(toVals()), [min, max]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (n: number) => n.toLocaleString(locale("ar-JO"));
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{tr("{0} د.أ", [fmt(vals[0])])}</span>
        <span>{vals[1] >= MAX ? tr("{0}+ د.أ", [fmt(MAX)]) : tr("{0} د.أ", [fmt(vals[1])])}</span>
      </div>
      <SliderPrimitive.Root
        min={0}
        max={MAX}
        step={STEP}
        minStepsBetweenThumbs={1}
        value={vals}
        onValueChange={(v) => setVals([v[0], v[1]])}
        onValueCommit={(v) => onChange(v[0] > 0 ? String(v[0]) : "", v[1] < MAX ? String(v[1]) : "")}
        className="relative flex h-6 w-full touch-none select-none items-center"
        aria-label={tr("نطاق السعر")}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-border">
          <SliderPrimitive.Range className="absolute h-full bg-gold" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb aria-label={tr("الحد الأدنى للسعر")} className="jelly-thumb block h-5 w-5 rounded-full border-2 border-gold bg-background shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60" />
        <SliderPrimitive.Thumb aria-label={tr("الحد الأعلى للسعر")} className="jelly-thumb block h-5 w-5 rounded-full border-2 border-gold bg-background shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60" />
      </SliderPrimitive.Root>
    </div>
  );
}
