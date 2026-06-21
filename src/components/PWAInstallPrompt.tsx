import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

// App-install prompt:
//  * Android / desktop Chrome: captures `beforeinstallprompt` and offers a button.
//  * iOS Safari (no such event): shows an "Add to Home Screen" hint.
// Hidden when already installed (standalone) or previously dismissed.

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "ec_install_dismissed";

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as any).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

export function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* ignore */
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS never fires beforeinstallprompt — show a manual hint after a short delay.
    let t: ReturnType<typeof setTimeout> | undefined;
    if (isIOS()) {
      t = setTimeout(() => {
        setIosHint(true);
        setShow(true);
      }, 2500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      if (t) clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } finally {
      setDeferred(null);
      dismiss();
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur sm:p-4">
        <img src="/app-icon-512.png" alt="" className="h-10 w-10 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">ثبّتي تطبيق EliteCapture</p>
          {iosHint ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              اضغطي <Share className="inline h-3.5 w-3.5" /> ثم «إضافة إلى الشاشة الرئيسية»
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">وصول أسرع، ويعمل دون اتصال.</p>
          )}
        </div>
        {!iosHint && (
          <button
            onClick={install}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gold px-3 py-2 text-sm font-medium text-charcoal hover:opacity-90"
          >
            <Download className="h-4 w-4" /> تثبيت
          </button>
        )}
        <button onClick={dismiss} aria-label="إغلاق" className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-secondary">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
