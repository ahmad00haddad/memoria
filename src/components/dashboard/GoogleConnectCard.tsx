import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { g } from "@/hooks/use-gender";
import { getGoogleStatus, getGoogleConnectUrl, syncGoogleNow, disconnectGoogle, type GoogleLinkStatus } from "@/lib/google-calendar.functions";
import { locale } from "@/i18n";
import { t, tx } from "@/i18n";

// ربط Google Calendar بنقرة واحدة (OAuth): بلا روابط ولا نسخ.
// يقرأ أوقات الانشغال فقط، ويكتب الحجوزات فوراً في تقويم «Memoria» منفصل.
export function GoogleConnectCard({ onChanged }: { onChanged?: () => void }) {
  const fetchStatus = useServerFn(getGoogleStatus);
  const connectUrl = useServerFn(getGoogleConnectUrl);
  const syncNow = useServerFn(syncGoogleNow);
  const disconnect = useServerFn(disconnectGoogle);
  const [s, setS] = useState<GoogleLinkStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => fetchStatus().then(setS).catch(() => {});

  useEffect(() => {
    refresh();
    // نتيجة الرجوع من Google
    const q = new URLSearchParams(window.location.search).get("google");
    if (!q) return;
    const msg: Record<string, [boolean, string]> = {
      connected: [true, t("تم ربط Google Calendar ✓")],
      denied: [false, t("أُلغي الربط من صفحة Google")],
      scopes: [false, g(t("يجب الموافقة على الصلاحيتين معاً — أعيدي المحاولة"), t("يجب الموافقة على الصلاحيتين معاً — أعد المحاولة"))],
      expired: [false, g(t("انتهت مهلة الربط — أعيدي المحاولة"), t("انتهت مهلة الربط — أعد المحاولة"))],
      error: [false, t("تعذّر الربط مع Google")],
    };
    const [ok, text] = msg[q] ?? msg.error;
    ok ? toast.success(text) : toast.error(text);
    window.history.replaceState(null, "", window.location.pathname);
    onChanged?.();
  }, []);

  if (!s?.configured) return null;

  const start = async () => {
    setBusy(true);
    try {
      const { url } = await connectUrl();
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message || t("تعذّر الربط"));
      setBusy(false);
    }
  };

  const doSync = async () => {
    setBusy(true);
    try {
      const r = await syncNow();
      toast.success(t("تمت المزامنة — {0} يوماً مشغولاً، {1} حجزاً في Google", [r.blocked, r.pushed]));
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || t("تعذّرت المزامنة"));
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const doDisconnect = async () => {
    setBusy(true);
    try {
      await disconnect();
      toast.success(t("أُلغي ربط Google"));
      onChanged?.();
    } finally {
      setBusy(false);
      refresh();
    }
  };

  return (
    <div className="rounded-xl border-2 border-gold/50 bg-gold/5 p-5 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <GoogleMark />
        <h3 className="font-serif text-lg">{t("Google Calendar — ربط مباشر")}</h3>
        <span className="ms-auto rounded-full bg-gold px-2 py-0.5 text-[10px] font-medium text-charcoal">{t("الأسهل")}</span>
      </div>

      {!s.connected ? (
        <>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            {g(
              t("نقرة واحدة وتسجيل دخول بحساب Google. نحجب تلقائياً الأيام المشغولة في تقويمكِ، وتظهر حجوزاتكِ فوراً في تقويم «Memoria» على هاتفكِ. لا نرى عناوين مواعيدكِ — فقط إن كان الوقت مشغولاً."),
              t("نقرة واحدة وتسجيل دخول بحساب Google. نحجب تلقائياً الأيام المشغولة في تقويمك، وتظهر حجوزاتك فوراً في تقويم «Memoria» على هاتفك. لا نرى عناوين مواعيدك — فقط إن كان الوقت مشغولاً."),
            )}
          </p>
          <button onClick={start} disabled={busy} className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-charcoal px-6 text-sm text-ivory disabled:opacity-60 active:scale-95 transition dark:bg-gold dark:text-charcoal">
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <GoogleMark />}{" "}{t("الربط مع Google")}
          </button>
        </>
      ) : (
        <div className={`rounded-xl border p-3 text-sm ${s.lastError ? "border-destructive/40 bg-destructive/10" : "border-emerald-300/60 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"}`}>
          {s.lastError ? (
            <>
              <div className="font-medium text-destructive">{t("مشكلة في الربط")}</div>
              <div className="text-xs text-destructive/90 mt-0.5">{tx(s.lastError)}</div>
            </>
          ) : (
            <>
              <div className="font-medium text-emerald-800 dark:text-emerald-300">{t("✓ مربوط")}{ s.email ? ` — ${s.email}` : ""}</div>
              <div className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                {typeof s.busyDays === "number" && <>{t("{0} يوماً مشغولاً محجوباً ·", [s.busyDays])}{" "}</>}
                {s.lastSyncAt ? t("آخر مزامنة {0}", [new Date(s.lastSyncAt).toLocaleString(locale("ar-JO"), { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })]) : t("بانتظار أول مزامنة")}
                {" "}{t("· الحجوزات تُكتب فوراً، والانشغال يُقرأ كل ٣٠ دقيقة")}
              </div>
            </>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={doSync} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 text-xs disabled:opacity-60">
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />{" "}{t("مزامنة الآن")}
            </button>
            {s.lastError && (
              <button onClick={start} disabled={busy} className="inline-flex min-h-11 items-center rounded-full bg-charcoal px-4 text-xs text-ivory dark:bg-gold dark:text-charcoal">{t("إعادة الربط")}</button>
            )}
            <button onClick={doDisconnect} disabled={busy} className="min-h-11 px-2 text-xs text-muted-foreground underline-offset-2 hover:underline">{t("إلغاء الربط")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.6l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
    </svg>
  );
}
