import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { X, Gamepad2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const SEEN_KEY = "game_hint_seen";

function alreadySeen() {
  try { return !!localStorage.getItem(SEEN_KEY); } catch { return true; }
}
function markSeen() {
  try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
}

/* تلميح مرة واحدة فقط لكل متصفح: عند محاولة الخروج (الماوس يطلع من أعلى الشاشة)
   أو عند الوصول لآخر الصفحة (الهاتف). لا يظهر داخل أدوات العمل. */
export function GameHint() {
  const [show, setShow] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const inApp = /^\/(dashboard|admin|notifications|onboarding|game)/.test(pathname);

  useEffect(() => {
    if (inApp || alreadySeen()) return;
    let armed = false;
    const arm = setTimeout(() => { armed = true; }, 8000);
    const reveal = () => {
      if (!armed || alreadySeen()) return;
      markSeen();
      setShow(true);
      cleanup();
    };
    const onLeave = (e: MouseEvent) => { if (e.clientY <= 0) reveal(); };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max > 0.9) reveal();
    };
    const cleanup = () => {
      clearTimeout(arm);
      document.removeEventListener("mouseout", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
    document.addEventListener("mouseout", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return cleanup;
  }, [inApp]);

  if (inApp) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          dir="rtl"
          className="fixed bottom-[72px] sm:bottom-6 right-4 left-4 sm:left-auto sm:w-80 z-50 bg-charcoal text-ivory rounded-lg p-4 shadow-elegant flex items-center gap-3"
        >
          <Gamepad2 className="h-5 w-5 text-gold shrink-0" />
          <div className="flex-1 text-sm">
            <div className="font-serif font-bold">قبل ما تروحي… جرّبي تهربي من العريس!</div>
            <a href="/game/" className="text-gold underline underline-offset-2">العبي «اهربي يا عروس»</a>
          </div>
          <button onClick={() => setShow(false)} aria-label="إغلاق" className="text-ivory/70 hover:text-ivory">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
