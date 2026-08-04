import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, ChevronDown, Info } from "lucide-react";
import { useTourState } from "./ClientTour";

export function PriceBreakdownTip() {
  const state = useTourState();
  const [open, setOpen] = useState(state.status === "active");

  return (
    <div className="mt-4 rounded-sm border border-border bg-secondary/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-secondary transition-colors"
      >
        <span className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-muted-foreground" />
          كيف يُحسب السعر الإجمالي؟
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 text-xs text-muted-foreground space-y-2 border-t border-border/50 mt-1">
              <div className="flex gap-2">
                <div className="shrink-0 mt-0.5"><Info className="h-3 w-3 text-gold" /></div>
                <div><strong className="text-foreground">نوع التصوير:</strong> السعر الأساسي للباقة المحددة (يوم كامل أو ساعات).</div>
              </div>
              <div className="flex gap-2">
                <div className="shrink-0 mt-0.5"><Info className="h-3 w-3 text-gold" /></div>
                <div><strong className="text-foreground">رسوم التنقّل:</strong> تُحسب بناءً على المسافة بين المصوّرة وموقع التصوير (يُخصم منها الكيلومترات المجانية).</div>
              </div>
              <div className="flex gap-2">
                <div className="shrink-0 mt-0.5"><Info className="h-3 w-3 text-gold" /></div>
                <div><strong className="text-foreground">الإضافات:</strong> أي خدمات إضافية كزيادة عدد الصور أو ألبومات مطبوعة.</div>
              </div>
              <div className="flex gap-2">
                <div className="shrink-0 mt-0.5"><Info className="h-3 w-3 text-gold" /></div>
                <div><strong className="text-foreground">العربون المبدئي:</strong> مبلغ أو نسبة تُدفع لتأكيد الحجز، ويُخصم من الإجمالي.</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
