import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MessageCircle, X } from "lucide-react";
import { askPhotographer } from "@/lib/questions.functions";
import { CopyButton } from "@/components/ui/copy-button";
import { t as tr } from "@/i18n";

// "اسألي سؤالاً قبل الحجز": بدون كشف الأرقام. بعد الإرسال تحصل العروس على رابط خاص لقراءة الرد.
export function AskPhotographer({ photographerId, name }: { photographerId: string; name: string }) {
  const ask = useServerFn(askPhotographer);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", email: "", question: "" });
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
  const submit = async () => {
    setBusy(true);
    try {
      const r = await ask({ data: { photographer_id: photographerId, ...f } });
      setUrl(r.url);
      try { localStorage.setItem(`memoria_ask_${photographerId}`, r.url); } catch { /* ignore */ }
    } catch (e: any) { toast.error(e?.message || tr("تعذّر الإرسال")); }
    finally { setBusy(false); }
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="h-12 px-5 inline-flex items-center gap-2 rounded-full border border-border text-sm hover:bg-secondary">
        <MessageCircle className="h-5 w-5" />{tr("اسأليها قبل الحجز")}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-background p-6 text-start shadow-2xl">
            <button onClick={() => setOpen(false)} aria-label={tr("إغلاق")} className="absolute end-3 top-3 text-muted-foreground"><X className="h-5 w-5" /></button>
            {url ? (
              <div className="space-y-3">
                <h2 className="font-serif text-xl">{tr("وصل سؤالكِ لـ {0}", [name])}</h2>
                <p className="text-sm text-muted-foreground">{tr("احفظي هذا الرابط: عليه يظهر الرد. ونبعته لإيميلكِ إذا كتبتِه.")}</p>
                <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 p-2 text-xs" dir="ltr">
                  <span className="min-w-0 flex-1 truncate">{url}</span>
                  <CopyButton value={url} />
                </div>
                <a href={url} className="inline-block rounded-full bg-charcoal px-5 py-2 text-xs text-ivory">{tr("فتح الرابط")}</a>
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="font-serif text-xl">{tr("اسألي {0} قبل الحجز", [name])}</h2>
                <p className="text-xs text-muted-foreground">{tr("سؤال عن الباقات أو التوفّر أو الأسلوب. رقمكِ لا يظهر لها، والرد يصلكِ هنا على رابط خاص.")}</p>
                <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={120} placeholder={tr("اسمكِ")} className={input} />
                <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} maxLength={200} dir="ltr" type="email" placeholder={tr("إيميلكِ (اختياري، ليصلكِ تنبيه بالرد)")} className={input} />
                <textarea value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} rows={4} maxLength={1500} placeholder={tr("سؤالكِ…")} className={input} />
                <button onClick={submit} disabled={busy || f.name.trim().length < 2 || f.question.trim().length < 5} className="w-full rounded-full bg-charcoal py-2.5 text-sm text-ivory disabled:opacity-50">{tr("إرسال السؤال")}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
