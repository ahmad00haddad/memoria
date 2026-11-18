import { useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

const SIZES = { sm: { w: 36, h: 20 }, md: { w: 44, h: 24 } } as const;

/**
 * Visual track + thumb for a role="switch" button. Elastic motion lives in
 * styles.css (.elastic-track / .elastic-thumb): the thumb overshoots when it
 * slides and stretches while the parent button is pressed. RTL-aware.
 */
export function SwitchTrack({
  on,
  size = "md",
  className,
  thumbClassName,
}: {
  on: boolean;
  size?: keyof typeof SIZES;
  className?: string;
  thumbClassName?: string;
}) {
  const { w, h } = SIZES[size];
  // squash-on-land plays only once the value has changed at least once (not on first paint)
  const first = useRef(on);
  const changed = useRef(false);
  if (on !== first.current) changed.current = true;
  return (
    <span
      aria-hidden
      data-on={on}
      data-landed={changed.current || undefined}
      className={cn("elastic-track", className)}
      style={{ "--w": `${w}px`, "--h": `${h}px` } as CSSProperties}
    >
      <span className={cn("elastic-thumb", thumbClassName)} />
    </span>
  );
}
