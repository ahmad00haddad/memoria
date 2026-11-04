import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { requestBrideCode } from "@/lib/stepup.functions";
import { t } from "@/i18n";

// رمز تأكيد يصل لبريد العروس قبل الإجراءات المالية بالرابط (إلغاء بعد العربون، موافقة على ملحق بمبلغ).
// رابط المتابعة تراه المصوّرة أيضاً، أما بريد العروس فلا؛ فالرمز يثبت أن العروس نفسها هي من يضغط.
export function StepUpBox({ token, purpose, code, onCode }: {
  token: string; purpose: "cancel" | "addendum"; code: string; onCode: (v: string) => void;
}) {
  const request = useServerFn(requestBrideCode);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    try {
      const r: any = await request({ data: { token, purpose } });
      if (r?.required === false) { toast.message(t("لا حاجة لرمز لهذا الحجز.")); return; }
      setHint(r?.hint ?? "");
      toast.success(t("أرسلنا الرمز إلى بريدكِ"));
    } catch (e: any) {
      toast.error(e?.message || t("تعذّر إرسال الرمز"));
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-2" dir="rtl">
      <p className="text-xs text-muted-foreground">
        {t("لحمايتكِ، نؤكّد أنكِ أنتِ بنفسكِ برمز يصل إلى بريدكِ الإلكتروني. لا تشاركيه مع أحد، حتى المصوّرة.")}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={send} disabled={busy}
          className="rounded-full border border-border px-4 py-1.5 text-xs hover:bg-muted disabled:opacity-50">
          {busy ? t("جارٍ الإرسال…") : hint === null ? t("أرسلي لي الرمز") : t("أعيدي الإرسال")}
        </button>
        <input
          inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
          onChange={(e) => onCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="______" dir="ltr"
          className="w-32 rounded-md border border-border bg-background px-3 py-1.5 text-center tracking-[0.4em] text-sm"
        />
      </div>
      {hint !== null && hint !== "" && (
        <p className="text-xs text-muted-foreground" dir="ltr">{hint}</p>
      )}
    </div>
  );
}
