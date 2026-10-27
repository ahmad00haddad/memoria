import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MessageCircle, Check, X } from "lucide-react";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { PageLoader } from "@/components/ui/loading";
import { PremiumLock, useSubscriptionLock } from "@/components/ui/PremiumLock";
import { listMyOffers, respondToOffer } from "@/lib/negotiation.functions";
import { locale } from "@/i18n";
import { t, tx } from "@/i18n";

export const Route = createFileRoute("/_authenticated/dashboard/offers")({ component: OffersPage });

const STATUS_LABEL: Record<string, string> = { pending: "بانتظار ردّك", accepted: "مقبول", declined: "مرفوض", expired: "منتهي" };

function waLink(phone: string, text: string) {
  let p = (phone || "").replace(/[^\d]/g, "");
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = "962" + p.slice(1);
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

function OffersPage() {
  const { isLocked, lockLoading } = useSubscriptionLock();
  const list = useServerFn(listMyOffers);
  const respond = useServerFn(respondToOffer);
  const [offers, setOffers] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try { setOffers(await list()); } catch (e: any) { toast.error(e?.message || t("تعذّر تحميل العروض")); setOffers([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (o: any, action: "accept" | "decline") => {
    setBusy(o.id);
    try {
      await respond({ data: { id: o.id, action, note: action === "decline" ? note || null : null } });
      toast.success(action === "accept" ? t("تم قبول العرض وإنشاء الحجز") : t("تم رفض العرض"));
      setNoteFor(null); setNote("");
      await load();
    } catch (e: any) {
      toast.error(e?.message || t("تعذّر تنفيذ الإجراء"));
    } finally { setBusy(null); }
  };

  if (offers === null || lockLoading) return <PageLoader />;
  const sorted = [...offers].sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1));
  const fmt = (n: number) => Number(n).toLocaleString(locale("ar-JO"));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 relative">
        {isLocked && <PremiumLock />}
        <div className="mb-4"><BackToDashboard /></div>
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">{t("عروض الأسعار")}</div>
        <h1 className="font-serif text-4xl mb-2">{t("عروض العرائس")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("لا يُحجز الموعد قبل قبولك. عند القبول يُنشأ الحجز بالسعر المعروض ويصل العروس رابط التتبّع. العرض صالح ٣ أيام.")}</p>

        {sorted.length === 0 && <div className="rounded-sm border border-border bg-card p-6 text-sm text-muted-foreground">{t("لا توجد عروض بعد.")}</div>}

        <div className="space-y-4">
          {sorted.map((o) => {
            const discount = o.listed_price > 0 ? Math.round((1 - o.offered_price / o.listed_price) * 100) : 0;
            const pending = o.status === "pending";
            return (
              <div key={o.id} className="rounded-sm border border-border bg-card p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="font-serif text-xl">{tx(o.client_name)}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">{tx(o.client_phone)} · {tx(o.client_email)}</div>
                  </div>
                  <span className={`text-xs rounded-full border px-3 py-1 ${pending ? "border-gold text-gold" : "border-border text-muted-foreground"}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm mb-3">
                  <div><span className="text-muted-foreground">{t("الباقة:")}{" "}</span>{tx(o.package_label)}</div>
                  <div><span className="text-muted-foreground">{t("التاريخ:")}{" "}</span>{tx(o.event_date)} · {String(o.start_time).slice(0, 5)}–{String(o.end_time).slice(0, 5)}</div>
                  {o.venue_address && <div className="sm:col-span-2"><span className="text-muted-foreground">{t("المكان:")}{" "}</span>{tx(o.venue_address)}</div>}
                  {o.client_notes && <div className="sm:col-span-2 whitespace-pre-line"><span className="text-muted-foreground">{t("ملاحظات:")}{" "}</span>{tx(o.client_notes)}</div>}
                </div>
                <div className="rounded-sm bg-secondary/50 border border-border p-3 text-sm flex flex-wrap gap-x-6 gap-y-1 mb-3">
                  <span>{t("السعر المعلن:")}{" "}<span className="line-through">{t("{0} د.أ", [fmt(o.listed_price)])}</span></span>
                  <span className="font-semibold">{t("المعروض:")}{" "}<span className="text-gold">{t("{0} د.أ", [fmt(o.offered_price)])}</span> (−{tx(discount)}%)</span>
                </div>
                {o.photographer_note && <div className="text-xs text-muted-foreground mb-3">{t("ملاحظتك: {0}", [o.photographer_note])}</div>}
                <div className="flex flex-wrap items-center gap-2">
                  {pending && (
                    <>
                      <button disabled={busy === o.id} onClick={() => act(o, "accept")} className="inline-flex items-center gap-1.5 rounded-sm bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700 disabled:opacity-50"><Check className="h-4 w-4" />{" "}{t("قبول")}</button>
                      <button disabled={busy === o.id} onClick={() => { setNoteFor(noteFor === o.id ? null : o.id); setNote(""); }} className="inline-flex items-center gap-1.5 rounded-sm border border-border px-4 py-2 text-sm hover:bg-secondary disabled:opacity-50"><X className="h-4 w-4" />{" "}{t("رفض")}</button>
                    </>
                  )}
                  <a href={waLink(o.client_phone, t("مرحباً {0}، بخصوص عرضكِ {1} د.أ لباقة {2}", [o.client_name, fmt(o.offered_price), o.package_label]))} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm bg-emerald-600 text-white px-3 py-2 rounded-sm hover:bg-emerald-700"><MessageCircle className="h-4 w-4" />{" "}{t("واتساب")}</a>
                </div>
                {noteFor === o.id && (
                  <div className="mt-3 space-y-2">
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} placeholder={t("ملاحظة للعروس (اختياري)")} className="w-full border border-border rounded-sm px-3 py-2 bg-background text-sm" />
                    <button disabled={busy === o.id} onClick={() => act(o, "decline")} className="rounded-sm bg-destructive text-white px-4 py-2 text-sm disabled:opacity-50">{t("تأكيد الرفض")}</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <Footer />
    </div>
  );
}
