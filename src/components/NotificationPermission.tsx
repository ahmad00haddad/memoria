/**
 * مكوّن طلب إذن الإشعارات (Push Notifications).
 * يُعرض في لوحة التحكم (Dashboard) لدعوة المصوّرة لتفعيل الإشعارات.
 * حالياً يعتمد على Notification API للمتصفح فقط.
 */
import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";

export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    // تحقق إذا كان المستخدم رفض سابقاً وتم حفظ ذلك
    try {
      if (localStorage.getItem("memoria_notif_dismissed") === "1") {
        setDismissed(true);
      }
    } catch {}
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        setDismissed(true);
      }
    } catch {
      console.error("[NotificationPermission] failed to request permission");
    }
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("memoria_notif_dismissed", "1");
    } catch {}
  };

  // لا تعرض إذا تم التفعيل أو الرفض أو الإخفاء أو عدم الدعم
  if (dismissed || permission === "granted" || permission === "unsupported") {
    return null;
  }

  // لا تعرض إذا رفض المتصفح نهائياً (denied)
  if (permission === "denied") {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded-sm border border-gold/30 bg-gold/5 px-4 py-3 text-sm">
      <Bell className="h-4 w-4 text-gold shrink-0" />
      <span className="flex-1">
        فعّلي إشعارات المتصفح لتبقَي على اطلاع بالحجوزات الجديدة فوراً.
      </span>
      <button
        onClick={requestPermission}
        className="shrink-0 rounded-sm bg-charcoal text-ivory px-3 py-1.5 text-xs font-medium hover:bg-charcoal/90 transition-colors"
      >
        تفعيل
      </button>
      <button
        onClick={dismiss}
        className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="إخفاء"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
