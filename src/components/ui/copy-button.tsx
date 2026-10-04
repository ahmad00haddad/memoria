import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn, hapticVibrate } from "@/lib/utils";

/**
 * زر نسخ يتحوّل إلى "نُسخ ✓" لثانية ثم يعود — بدون toast مزعج.
 * إذا فشل الوصول للحافظة يظهر النص لنسخه يدوياً.
 */
export function CopyButton({
  value,
  label = "نسخ",
  copiedLabel = "نُسخ",
  className,
  iconOnly = false,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      hapticVibrate("light");
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.message(value, { description: "انسخيه يدوياً" });
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={iconOnly ? label : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs transition-colors hover:border-gold/50 hover:text-gold active:scale-95",
        copied && "border-gold/60 text-gold",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? "ok" : "copy"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="inline-flex items-center gap-1.5"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {!iconOnly && (copied ? copiedLabel : label)}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
