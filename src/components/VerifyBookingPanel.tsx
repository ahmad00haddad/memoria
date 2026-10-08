import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MessageCircle, Mail, ShieldCheck } from "lucide-react";
import { verifyBookingEmailCode, resendBookingEmailCode } from "@/lib/booking.functions";

export type VerifyInfo = {
  whatsapp_number: string | null;
  whatsapp_code: string | null;
  email: boolean;
};

/**
 * تأكيد طلب الحجز: زر واتساب برسالة جاهزة (مجاني) أو رمز الإيميل.
 * onVerified يُستدعى بعد نجاح رمز الإيميل؛ تأكيد واتساب يصل عبر الـ webhook
 * فتكتشفه الصفحة بإعادة التحميل (زر "أرسلتُ الرسالة").
 */
export function VerifyBookingPanel({ token, verify, onVerified, onRecheck }: {
  token: string;
  verify: VerifyInfo;
  onVerified: () => void;
  onRecheck?: () => Promise<boolean>;
}) {
  const verifyFn = useServerFn(verifyBookingEmailCode);
  const resendFn = useServerFn(resendBookingEmailCode);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  // No channel open yet (e.g. page reopened later): let her ask for an email code
  const [emailOn, setEmailOn] = useState(verify.email);
  const [sending, setSending] = useState(false);

  const waHref = verify.whatsapp_number && verify.whatsapp_code
    ? `https://wa.me/${verify.whatsapp_number}?text=${encodeURIComponent(`رمز تأكيد حجزي في ميموريا: ${verify.whatsapp_code}`)}`
    : null;

  const submitCode = async () => {
    if (code.replace(/\D/g, "").length !== 6) return toast.error("الرمز يتكوّن من 6 أرقام");
    setBusy(true);
    try {
      await verifyFn({ data: { token, code } });
      toast.success("تم تأكيد طلبك ✅");
      onVerified();
    } catch (e: any) {
      toast.error(e?.message || "تعذّر التأكيد");
    } finally { setBusy(false); }
  };

  const recheck = async () => {
    if (!onRecheck) return;
    setChecking(true);
    try {
      const done = await onRecheck();
      if (done) { toast.success("تم تأكيد طلبك ✅"); onVerified(); }
      else toast("لم تصلنا الرسالة بعد — تأكدي أنكِ ضغطتِ إرسال في واتساب");
    } finally { setChecking(false); }
  };

  return (
    <div className="rounded-sm border border-gold/40 bg-gold/5 p-4 text-start space-y-4">
      <div className="flex items-start gap-2">
        <ShieldCheck className="h-5 w-5 text-gold shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold">خطوة أخيرة: أكّدي طلبك</div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            لن يصل الطلب للمصوّرة ولن يُحجز الموعد قبل التأكيد. لديكِ 30 دقيقة.
          </p>
        </div>
      </div>

      {waHref && (
        <div className="space-y-2">
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 rounded-sm bg-[#25D366] text-white py-3 font-medium hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" /> أكّدي عبر واتساب
          </a>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            يفتح واتساب برسالة جاهزة — اضغطي إرسال فقط. أرسليها من نفس الرقم الذي كتبتِه في الحجز، وسيصلك رابط التتبع على واتساب.
          </p>
          {onRecheck && (
            <button type="button" onClick={recheck} disabled={checking} className="w-full text-xs border border-border rounded-sm py-2 hover:bg-secondary disabled:opacity-50">
              {checking ? "جاري التحقق…" : "أرسلتُ الرسالة — تحقّقي"}
            </button>
          )}
        </div>
      )}

      {!waHref && !emailOn && (
        <button
          type="button"
          disabled={sending}
          onClick={async () => {
            setSending(true);
            try { await resendFn({ data: { token } }); setEmailOn(true); toast.success("أرسلنا رمز التأكيد لإيميلكِ"); }
            catch (e: any) { toast.error(e?.message || "تعذّر الإرسال"); }
            finally { setSending(false); }
          }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-sm bg-charcoal text-ivory py-3 text-sm disabled:opacity-50"
        >
          <Mail className="h-4 w-4" /> {sending ? "جاري الإرسال…" : "أرسلي لي رمز التأكيد على الإيميل"}
        </button>
      )}

      {emailOn && (
        <div className="space-y-2">
          {waHref && <div className="text-center text-[11px] text-muted-foreground">أو</div>}
          <label className="flex items-center gap-1.5 text-sm"><Mail className="h-4 w-4" /> أدخلي الرمز المرسل لإيميلك</label>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => { if (e.key === "Enter") submitCode(); }}
              placeholder="••••••"
              dir="ltr"
              className="flex-1 border border-border rounded-sm px-3 py-2 bg-background text-center tracking-[0.5em] font-mono"
            />
            <button type="button" onClick={submitCode} disabled={busy} className="bg-charcoal text-ivory px-4 rounded-sm disabled:opacity-50">
              {busy ? "…" : "تأكيد"}
            </button>
          </div>
          <button
            type="button"
            onClick={async () => {
              try { await resendFn({ data: { token } }); toast.success("أرسلنا رمزاً جديداً"); }
              catch (e: any) { toast.error(e?.message || "تعذّر الإرسال"); }
            }}
            className="text-[11px] text-muted-foreground underline underline-offset-2"
          >
            لم يصلني الرمز — أعيدي الإرسال
          </button>
        </div>
      )}
    </div>
  );
}
