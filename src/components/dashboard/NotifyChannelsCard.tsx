import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mail, Send, CheckCircle2, Smartphone, Loader2 } from "lucide-react";
import { getNotifyChannels, getTelegramLinkUrl, unlinkTelegram, sendTelegramTest, type NotifyChannels } from "@/lib/telegram.functions";
import { CopyButton } from "@/components/ui/copy-button";
import { t } from "@/i18n";

// قنوات إشعارات الحجوزات: الإيميل دائماً مفعّل ولا يمكن إيقافه، وتيليغرام يُربط بخطوات واضحة.
// promptOnly: يظهر فقط إذا تيليغرام غير مربوط (للوحة التحكم الرئيسية)، ويختفي بعد الربط.
export function NotifyChannelsCard({ promptOnly = false }: { promptOnly?: boolean }) {
  const fetchChannels = useServerFn(getNotifyChannels);
  const linkUrl = useServerFn(getTelegramLinkUrl);
  const unlink = useServerFn(unlinkTelegram);
  const test = useServerFn(sendTelegramTest);
  const [c, setC] = useState<NotifyChannels | null>(null);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<{ url: string; code: string; bot: string } | null>(null);
  const [justLinked, setJustLinked] = useState(false);

  const refresh = () => fetchChannels().then(setC).catch(() => {});
  useEffect(() => { refresh(); }, []);

  // بعد طلب الربط: نتحقق كل 3 ثوانٍ لمدة 10 دقائق حتى تضغط Start أو ترسل الرمز
  useEffect(() => {
    if (!link) return;
    let n = 0;
    const id = setInterval(async () => {
      n++;
      const r = await fetchChannels().catch(() => null);
      if (r?.telegram.linked) {
        setC(r);
        setLink(null);
        setJustLinked(true);
        toast.success(t("تم ربط تيليغرام ✓"));
      }
      if (n >= 200) setLink(null);
    }, 3000);
    return () => clearInterval(id);
  }, [link]);

  if (!c) return null;
  if (promptOnly && (!c.telegram.configured || (c.telegram.linked && !justLinked))) return null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); } catch (e: any) { toast.error(e?.message || t("حدث خطأ")); } finally { setBusy(false); }
  };

  const start = () => run(async () => {
    // نفتح النافذة قبل الطلب حتى لا يحجبها المتصفح
    const w = window.open("", "_blank");
    const r = await linkUrl();
    setLink(r);
    if (w) w.location.href = r.url; else window.location.href = r.url;
  });

  const telegram = c.telegram.configured && (
    c.telegram.linked ? (
      <div className="mt-2 rounded-lg bg-card p-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Send className="h-4 w-4 shrink-0 text-sky-500" />
          <span className="flex-1 min-w-0">
            {t("تيليغرام")}
            <span className="block text-xs text-emerald-600">{t("مربوط ✓ — الطلبات توصلك فوراً على تيليغرام")}</span>
          </span>
          <span className="flex gap-2">
            <button disabled={busy} onClick={() => run(async () => { await test(); toast.success(t("أُرسلت رسالة تجربة — شوفي تيليغرام")); })} className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary">{t("رسالة تجربة")}</button>
            {!promptOnly && (
              <button disabled={busy} onClick={() => run(async () => { await unlink(); await refresh(); })} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary">{t("فصل")}</button>
            )}
          </span>
        </div>
      </div>
    ) : (
      <div className="mt-2 rounded-lg border border-sky-500/30 bg-card p-4 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <Send className="h-4 w-4 text-sky-500" />
          {t("وصّلي الطلبات على تيليغرام — بدقيقة وحدة")}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("حتى لو كنتِ بالتصوير، الطلب بيوصلك كرسالة على موبايلك وما بيفوتك.")}</p>

        <ol className="mt-4 space-y-3">
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky-500 text-xs font-bold text-white">1</span>
            <div className="flex-1">
              <div>{t("اضغطي الزر الأزرق")}</div>
              <button
                disabled={busy}
                onClick={start}
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {link ? t("فتح تيليغرام مرة ثانية") : t("فتح تيليغرام والربط")}
              </button>
              <div className="mt-1.5 text-xs text-muted-foreground">
                {t("ما عندك تيليغرام؟ نزّليه أولاً:")}{" "}
                <a href="https://apps.apple.com/app/telegram-messenger/id686449807" target="_blank" rel="noreferrer" className="underline">iPhone</a>
                {" · "}
                <a href="https://play.google.com/store/apps/details?id=org.telegram.messenger" target="_blank" rel="noreferrer" className="underline">Android</a>
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky-500 text-xs font-bold text-white">2</span>
            <div>{t("بتفتح محادثة «Memoria ميموريا» — اضغطي زر")}{" "}<b>START</b>{" "}{t("(أو «ابدأ») أسفل الشاشة")}</div>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky-500 text-xs font-bold text-white">3</span>
            <div>{t("خلص! بتوصلك رسالة «تم الربط ✅» وبتتحدّث هالصفحة لحالها")}</div>
          </li>
        </ol>

        {link && (
          <div className="mt-4 rounded-lg bg-secondary/60 p-3">
            <div className="flex items-center gap-2 text-xs text-sky-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("بانتظار الضغط على START…")}
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                {t("ما فتحت المحادثة؟ أو فاتحة من الكمبيوتر؟ افتحي تيليغرام على موبايلك، ابحثي عن")}{" "}
                <b dir="ltr">@{link.bot}</b>{t("، وابعتيله هالرمز:")}
                <div className="mt-2 flex items-center gap-2">
                  <span dir="ltr" className="rounded-md bg-background px-3 py-1.5 font-mono text-base tracking-[0.25em]">{link.code}</span>
                  <CopyButton value={link.code} label={t("نسخ")} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  );

  if (promptOnly) return <div className="mb-8">{telegram}</div>;

  return (
    <div className="mb-4 rounded-xl border border-gold/30 bg-gold/5 p-4">
      <div className="text-sm font-medium">{t("إشعارات الحجوزات")}</div>
      <p className="mt-1 text-xs text-muted-foreground">{t("طلبات الحجز والعربون وتذكيرات الرد تصلك دائماً — عندك 24 ساعة لتردّي على كل طلب.")}</p>

      <div className="mt-3 flex items-center gap-3 rounded-lg bg-card p-3 text-sm">
        <Mail className="h-4 w-4 shrink-0 text-gold" />
        <span className="flex-1 min-w-0 truncate">{t("الإيميل")}{c.email ? ` — ${c.email}` : ""}</span>
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />{" "}{t("مفعّل دائماً")}</span>
      </div>

      {telegram}
    </div>
  );
}
