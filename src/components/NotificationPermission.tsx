import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function NotificationPermission() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (!window.matchMedia("(display-mode: standalone)").matches
        && !(window.navigator as any)?.standalone) return;
    if (sessionStorage.getItem("notif-prompt-shown")) return;

    const t = setTimeout(() => {
      setShow(true);
      sessionStorage.setItem("notif-prompt-shown", "1");
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  const allow = async () => {
    if ("Notification" in window) await Notification.requestPermission();
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-20 start-4 end-4 z-50 bg-card border border-border
                     rounded-xl p-4 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl shrink-0">🔔</div>
            <div className="flex-1">
              <p className="font-medium text-sm">فعّلي الإشعارات</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                كوني أول من يعلم بالحجوزات الجديدة فور وصولها
              </p>
            </div>
            <button
              onClick={() => setShow(false)}
              className="text-muted-foreground p-1 shrink-0 hover:text-foreground transition-colors"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={allow}
              className="flex-1 bg-[var(--gold)] text-white text-sm py-2 rounded-sm
                         font-medium hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              تفعيل الإشعارات
            </button>
            <button
              onClick={() => setShow(false)}
              className="px-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              لاحقاً
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
