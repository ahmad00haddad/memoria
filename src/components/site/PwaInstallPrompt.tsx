import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // Default true so it doesn't flash before checking

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already installed
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // If it's iOS and not standalone, we can just show the prompt after a delay
    if (ios) {
      const timer = setTimeout(() => {
        // Only show if user hasn't dismissed it recently
        const dismissed = localStorage.getItem("pwa_prompt_dismissed");
        if (!dismissed) setShow(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Android/Chrome install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem("pwa_prompt_dismissed");
      if (!dismissed) setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("pwa_prompt_dismissed", "true");
  };

  if (isStandalone || !show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-[72px] sm:bottom-6 left-4 right-4 z-50 bg-charcoal text-ivory rounded-lg p-4 shadow-elegant flex items-center justify-between gap-3"
        >
          <div className="flex-1">
            <h4 className="font-serif text-sm font-bold flex items-center gap-2">
              <Download className="h-4 w-4 text-gold" />
              أضيفي ميموريا لهاتفك
            </h4>
            {isIOS ? (
              <p className="text-[11px] text-ivory/80 mt-1 leading-tight flex items-center gap-1 flex-wrap">
                لأفضل تجربة، اضغطي على زر <Share className="h-3 w-3 inline" /> ثم <span className="font-bold">إضافة للشاشة الرئيسية ➕</span>
              </p>
            ) : (
              <p className="text-[11px] text-ivory/80 mt-1 leading-tight">
                احصلي على التطبيق لتجربة أسرع وإشعارات فورية.
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!isIOS && (
              <button
                onClick={handleInstall}
                className="bg-gold text-charcoal px-3 py-1.5 rounded-sm text-xs font-bold hover:bg-gold/90 transition-colors"
              >
                تثبيت
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="p-1 text-ivory/60 hover:text-ivory bg-ivory/10 rounded-full"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
