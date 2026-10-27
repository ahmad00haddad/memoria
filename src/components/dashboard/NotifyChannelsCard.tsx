import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mail, Send, CheckCircle2 } from "lucide-react";
import { getNotifyChannels, getTelegramLinkUrl, unlinkTelegram, sendTelegramTest, type NotifyChannels } from "@/lib/telegram.functions";
import { t } from "@/i18n";

// قنوات إشعارات الحجوزات: الإيميل دائماً مفعّل ولا يمكن إيقافه، وتيليغرام يُربط بنقرة.
// إشعارات الحجز (طلب جديد، عربون، تذكير بالرد، إلغاء) إلزامية حتى لا يفوت المصوّرة أي طلب.
export function NotifyChannelsCard() {
  const fetchChannels = useServerFn(getNotifyChannels);
  const linkUrl = useServerFn(getTelegramLinkUrl);
  const unlink = useServerFn(unlinkTelegram);
  const test = useServerFn(sendTelegramTest);
  const [c, setC] = useState<NotifyChannels | null>(null);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const refresh = () => fetchChannels().then(setC).catch(() => {});
  useEffect(() => { refresh(); }, []);

  // بعد فتح تيليغرام: نتحقق كل 3 ثوانٍ لدقيقتين حتى يكتمل الربط
  useEffect(() => {
    if (!waiting) return;
    let n = 0;
    const id = setInterval(async () => {
      n++;
      const r = await fetchChannels().catch(() => null);
      if (r) setC(r);
      if (r?.telegram.linked) { setWaiting(false); toast.success(t("تم ربط تيليغرام ✓")); }
      if (n >= 40) setWaiting(false);
    }, 3000);
    return () => clearInterval(id);
  }, [waiting]);

  if (!c) return null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); } catch (e: any) { toast.error(e?.message || t("حدث خطأ")); } finally { setBusy(false); }
  };

  return (
    <div className="mb-4 rounded-xl border border-gold/30 bg-gold/5 p-4">
      <div className="text-sm font-medium">{t("إشعارات الحجوزات")}</div>
      <p className="mt-1 text-xs text-muted-foreground">{t("طلبات الحجز والعربون وتذكيرات الرد تصلك دائماً — عندك 24 ساعة لتردّي على كل طلب.")}</p>

      <div className="mt-3 flex items-center gap-3 rounded-lg bg-card p-3 text-sm">
        <Mail className="h-4 w-4 shrink-0 text-gold" />
        <span className="flex-1 min-w-0 truncate">{t("الإيميل")}{c.email ? ` — ${c.email}` : ""}</span>
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />{" "}{t("مفعّل دائماً")}</span>
      </div>

      {c.telegram.configured && (
        <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg bg-card p-3 text-sm">
          <Send className="h-4 w-4 shrink-0 text-sky-500" />
          <span className="flex-1 min-w-0">
            {t("تيليغرام")}
            <span className="block text-xs text-muted-foreground">{c.telegram.linked ? t("الإشعارات تصلك فوراً على تيليغرام") : t("أسرع طريقة — يصلك الطلب حتى لو كنتِ بالتصوير")}</span>
          </span>
          {c.telegram.linked ? (
            <span className="flex gap-2">
              <button disabled={busy} onClick={() => run(async () => { await test(); toast.success(t("أُرسلت رسالة تجربة")); })} className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary">{t("تجربة")}</button>
              <button disabled={busy} onClick={() => run(async () => { await unlink(); await refresh(); })} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary">{t("فصل")}</button>
            </span>
          ) : (
            <button
              disabled={busy}
              onClick={() => run(async () => {
                // نفتح النافذة قبل الطلب حتى لا يحجبها المتصفح
                const w = window.open("", "_blank");
                const { url } = await linkUrl();
                if (w) w.location.href = url; else window.location.href = url;
                setWaiting(true);
              })}
              className="rounded-full bg-sky-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-sky-600 disabled:opacity-60"
            >
              {waiting ? t("بانتظار الضغط على Start…") : t("ربط تيليغرام")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
