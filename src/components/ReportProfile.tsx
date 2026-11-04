import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Flag, X } from "lucide-react";
import { submitProfileReport } from "@/lib/profile-reports.functions";
import { t as tr, tx } from "@/i18n";

// زر صغير هادئ أسفل صفحة المصوّرة: "الإبلاغ عن هذه الصفحة" — يصل البلاغ للإدارة فوراً.
const REASONS = [
  { v: "impersonation", t: "هذه الصفحة تنتحل مصوّرة أخرى" },
  { v: "scam", t: "أخذت عربوناً واختفت / احتيال" },
  { v: "stolen_photos", t: "الصور ليست من أعمالها" },
  { v: "other", t: "سبب آخر" },
];

export function ReportProfile({ photographerId }: { photographerId: string }) {
  const send = useServerFn(submitProfileReport);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ reason: "impersonation", details: "", reporter_name: "", reporter_contact: "", real_account_url: "" });

  const submit = async () => {
    setBusy(true);
    try {
      await send({ data: { photographer_id: photographerId, ...f } });
      setDone(true);
    } catch (e: any) { toast.error(e?.message || tr("تعذّر الإرسال")); }
    finally { setBusy(false); }
  };
  const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

  return (
    <>
      <div className="container-editorial pb-8 text-center">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Flag className="h-3.5 w-3.5" /> {tr("الإبلاغ عن هذه الصفحة")}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="report-title" onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
            <button onClick={() => setOpen(false)} aria-label={tr("إغلاق")} className="absolute end-3 top-3 text-muted-foreground"><X className="h-5 w-5" /></button>
            {done ? (
              <div className="py-6 text-center">
                <h2 id="report-title" className="font-serif text-xl">{tr("وصلنا بلاغكِ، شكراً لكِ")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{tr("فريق ميموريا يراجعه الآن، وإن ثبت نخفي الصفحة فوراً ونتواصل معكِ.")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h2 id="report-title" className="font-serif text-xl">{tr("الإبلاغ عن هذه الصفحة")}</h2>
                <p className="text-xs text-muted-foreground">{tr("يصل البلاغ لفريق ميموريا مباشرة، ولا تعرف صاحبة الصفحة من أرسله.")}</p>
                <div className="space-y-1.5">
                  {REASONS.map((r) => (
                    <label key={r.v} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input type="radio" name="report-reason" checked={f.reason === r.v} onChange={() => setF({ ...f, reason: r.v })} />
                      {tx(tr(r.t))}
                    </label>
                  ))}
                </div>
                <textarea value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} rows={3} maxLength={2000}
                  placeholder={tr("ماذا حدث؟ أي تفاصيل تساعدنا")} className={input} />
                {f.reason === "impersonation" && (
                  <input value={f.real_account_url} onChange={(e) => setF({ ...f, real_account_url: e.target.value })} dir="ltr" maxLength={500}
                    placeholder={tr("رابط الحساب الحقيقي (إنستغرام مثلاً) — اختياري")} className={input} />
                )}
                <input value={f.reporter_name} onChange={(e) => setF({ ...f, reporter_name: e.target.value })} maxLength={120}
                  placeholder={tr("اسمكِ (اختياري)")} className={input} />
                <input value={f.reporter_contact} onChange={(e) => setF({ ...f, reporter_contact: e.target.value })} maxLength={200} dir="ltr"
                  placeholder={tr("رقمكِ أو إيميلكِ لنتواصل معكِ")} className={input} />
                <button onClick={submit} disabled={busy || f.details.trim().length < 5 || f.reporter_contact.trim().length < 5}
                  className="w-full rounded-full bg-charcoal py-2.5 text-sm text-ivory disabled:opacity-50">{tr("إرسال البلاغ")}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
