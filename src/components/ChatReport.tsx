import { useState } from "react";
import { toast } from "sonner";
import { Flag, X } from "lucide-react";
import { t as tr } from "@/i18n";

// رابط هادئ تحت المحادثة: "إبلاغ عن إساءة" — يصل للإدارة فوراً، والطرف الآخر لا يعرف
export function ChatReport({ send, label }: { send: (details: string) => Promise<unknown>; label?: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { await send(text); setDone(true); }
    catch (e: any) { toast.error(e?.message || tr("تعذّر الإرسال")); }
    finally { setBusy(false); }
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
        <Flag className="h-3 w-3" /> {label ?? tr("إبلاغ عن إساءة")}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl">
            <button onClick={() => setOpen(false)} aria-label={tr("إغلاق")} className="absolute end-3 top-3 text-muted-foreground"><X className="h-5 w-5" /></button>
            {done ? (
              <div className="py-4 text-center">
                <h2 className="font-serif text-xl">{tr("وصلنا بلاغكِ")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{tr("فريق ميموريا يراجعه ويتواصل معكِ. الطرف الآخر لا يعرف بالبلاغ.")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="font-serif text-xl">{tr("إبلاغ عن إساءة")}</h2>
                <p className="text-xs text-muted-foreground">{tr("كلام مسيء، ضغط أو تهديد، طلب دفع خارج المنصّة، أو رابط مشبوه. الرسائل محفوظة عندنا، فاكتبي باختصار ماذا حدث.")}</p>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} placeholder={tr("ماذا حدث؟")}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                <button onClick={submit} disabled={busy || text.trim().length < 5} className="w-full rounded-full bg-charcoal py-2.5 text-sm text-ivory disabled:opacity-50">{tr("إرسال البلاغ")}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
