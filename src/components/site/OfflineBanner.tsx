import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { t } from "@/i18n";

/** شريط صغير عند انقطاع الإنترنت: الصفحات تعمل من آخر نسخة محفوظة */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-charcoal px-3 py-1.5 text-xs text-ivory pt-[calc(0.375rem+env(safe-area-inset-top))]">
      <WifiOff className="h-3.5 w-3.5" />
      {t("بلا اتصال — نعرض آخر نسخة محفوظة")}
    </div>
  );
}
