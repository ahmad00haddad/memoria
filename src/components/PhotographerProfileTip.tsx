import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, X } from "lucide-react";
import { useTourState } from "./ClientTour";

export function PhotographerProfileTip() {
  const state = useTourState();
  const [dismissed, setDismissed] = useState(false);

  // Show only if tour is active and we haven't dismissed this specific tip
  if (state.status !== "active" || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, scale: 0.95, height: 0 }}
        className="mb-8 overflow-hidden"
      >
        <div className="rounded-sm border border-gold/30 bg-gold/5 p-4 flex gap-3 relative">
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 left-2 p-1 text-muted-foreground hover:text-foreground"
            aria-label="إغلاق التلميح"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="shrink-0 mt-0.5">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gold/20 text-gold">
              <Info className="h-4 w-4" />
            </div>
          </div>
          
          <div className="pe-6">
            <h4 className="font-serif text-sm font-bold text-foreground mb-1">
              كيف تختارين الباقة المناسبة؟
            </h4>
            <p className="text-xs leading-relaxed text-muted-foreground">
              الباقات المعروضة هنا هي أسعار والتزامات حقيقية محددة من قِبل المصوّرة نفسها. 
              اختاري الباقة الأنسب لميزانيتك واحتياجات يومك، ثم انتقلي لنموذج الحجز لتأكيد التاريخ والسعر النهائي بما في ذلك أي رسوم تنقل.
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
