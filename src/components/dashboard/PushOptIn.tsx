import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { g } from "@/hooks/use-gender";
import { t } from "@/i18n";
import { ensurePushSubscription, pushSupported } from "@/lib/push-client";
import { sendTestPush } from "@/lib/push.functions";

const KEY = "memoria_push_optin_dismissed";

/** بطاقة واحدة في «اليوم»: كل طلب جديد يصل إشعاراً على الهاتف */
export function PushOptIn() {
  const testFn = useServerFn(sendTestPush);
  const [state, setState] = useState<"hidden" | "ask" | "busy">("hidden");

  useEffect(() => {
    if (!pushSupported()) return;
    if (Notification.permission === "granted") { void ensurePushSubscription(); return; }
    if (Notification.permission === "denied") return;
    try { if (localStorage.getItem(KEY)) return; } catch { /* ignore */ }
    setState("ask");
  }, []);

  if (state === "hidden") return null;

  const enable = async () => {
    setState("busy");
    const res = await Notification.requestPermission().catch(() => "denied" as NotificationPermission);
    if (res !== "granted") { setState("hidden"); return; }
    const ok = await ensurePushSubscription();
    setState("hidden");
    if (!ok) { toast.error(t("تعذّر تفعيل الإشعارات على هذا الجهاز")); return; }
    toast.success(g(t("تم! سيصلكِ إشعار تجربة الآن"), t("تم! سيصلك إشعار تجربة الآن")));
    testFn().catch(() => {});
  };
  const dismiss = () => { setState("hidden"); try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } };

  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/5 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/15 text-gold"><Bell className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{g(t("لا تفوّتي أي طلب"), t("لا تفوّت أي طلب"))}</div>
        <div className="text-xs text-muted-foreground">{t("إشعار على هاتفك لحظة وصول طلب أو عربون")}</div>
      </div>
      <button type="button" onClick={enable} disabled={state === "busy"} className="min-h-10 shrink-0 rounded-full bg-gold px-4 text-sm font-medium text-charcoal disabled:opacity-60">{t("تفعيل")}</button>
      <button type="button" onClick={dismiss} aria-label={t("إغلاق")} className="grid h-10 w-8 shrink-0 place-items-center text-muted-foreground"><X className="h-4 w-4" /></button>
    </div>
  );
}
