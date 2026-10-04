import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, ChevronDown, Sparkles } from "lucide-react";
import type { FocusItem } from "./focus";

const toneDot: Record<FocusItem["tone"], string> = {
  urgent: "bg-gold",
  soon: "bg-amber-500",
  info: "bg-muted-foreground/50",
};

/**
 * "مهمة اليوم": إجراء واحد واضح في الأعلى، وباقي المهام مطويّة تحته.
 * يحلّ محلّ قراءة ٨ أرقام لمعرفة المطلوب الآن.
 */
export function TodayFocus({ items, whatsNew }: { items: FocusItem[]; whatsNew?: string | null }) {
  const [open, setOpen] = useState(false);
  const [top, ...rest] = items;

  return (
    <div className="mb-10">
      {whatsNew && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Sparkles className="h-3.5 w-3.5 text-gold" />
          <span>منذ آخر زيارة: {whatsNew}</span>
        </motion.p>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {top ? (
          <motion.div
            key={top.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-2xl bg-charcoal text-ivory p-6 sm:p-8 grain-overlay dark:bg-[linear-gradient(160deg,color-mix(in_oklab,var(--gold)_16%,var(--card)),var(--card)_70%)] dark:text-foreground dark:ring-1 dark:ring-gold/30"
          >
            <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-xs tracking-wide text-gold">
                  <span className="relative flex h-2 w-2">
                    {top.tone === "urgent" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60 motion-reduce:hidden" />}
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
                  </span>
                  مهمة اليوم
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-balance">{top.title}</h2>
                <p className="mt-2 text-sm text-ivory/70 dark:text-muted-foreground">{top.detail}</p>
              </div>
              <Link
                to={top.to as any}
                params={top.params as any}
                className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-charcoal transition-transform duration-200 hover:gap-3 active:scale-95"
              >
                {top.cta}
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="calm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-serif text-xl">لا شيء عاجل اليوم</div>
              <p className="text-sm text-muted-foreground">كل الطلبات مرتّبة. استمتعي بيومك.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {rest.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {open ? "إخفاء" : rest.length === 1 ? "مهمة أخرى" : `${rest.length} مهام أخرى`}
            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="mt-2 overflow-hidden divide-y divide-border rounded-2xl border border-border bg-card"
              >
                {rest.map((it, i) => (
                  <motion.li
                    key={it.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      to={it.to as any}
                      params={it.params as any}
                      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/60"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${toneDot[it.tone]}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">{it.title}</span>
                        <span className="block text-xs text-muted-foreground truncate">{it.detail}</span>
                      </span>
                      <span className="hidden sm:inline text-xs text-gold opacity-0 transition-opacity group-hover:opacity-100">{it.cta}</span>
                      <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:text-gold" />
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
