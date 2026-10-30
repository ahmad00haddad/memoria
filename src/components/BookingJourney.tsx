import { t as tr, locale } from "@/i18n";
import { Term } from "@/components/Term";

// خطوات الحجز كما تحدث فعلاً، تُعرض للعروس قبل إرسال الطلب حتى لا تتفاجأ بأي خطوة.
// الترتيب يطابق مسار الموافقة: طلب ← تأكيد الرقم ← موافقة (24 س) ← عربون (48 س) ← العرس ← المتبقي ← التسليم.
export function BookingJourney({ deposit, remaining }: { deposit: number; remaining: number }) {
  const n = (v: number) => v.toLocaleString(locale("ar-JO"));
  const steps = [
    tr("ترسلين الطلب الآن، ولا تدفعين شيئاً."),
    tr("تؤكّدين رقمكِ برسالة واتساب أو برمز يصلكِ على الإيميل."),
    tr("المصوّرة توافق أو تعتذر خلال 24 ساعة. التاريخ محجوز لكِ خلالها."),
    deposit > 0
      ? tr("بعد موافقتها تحوّلين العربون ({0} د.أ) لها مباشرة خلال 48 ساعة، وترفعين صورة الإيصال.", [n(deposit)])
      : tr("بعد موافقتها يتأكّد حجزكِ."),
    remaining > 0
      ? tr("بعد العرس تحوّلين باقي المبلغ ({0} د.أ).", [n(remaining)])
      : tr("يوم العرس تصوّركِ المصوّرة كما اتفقتما."),
    tr("تستلمين صوركِ من صفحة متابعة الحجز."),
  ];
  return (
    <details open className="sm:col-span-2 rounded-sm border border-border p-3 text-sm group">
      <summary className="cursor-pointer list-none font-medium flex items-center justify-between">
        {tr("ماذا يحدث بعد إرسال الطلب؟")}
        <span className="text-xs text-muted-foreground group-open:hidden">{tr("اعرضي")}</span>
      </summary>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${i === 0 ? "bg-gold text-charcoal" : "bg-secondary text-muted-foreground"}`}>
              {(i + 1).toLocaleString(locale("ar-JO"))}
            </span>
            <span className={i === 0 ? "font-medium" : "text-muted-foreground"}>{s}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">{tr("تتابعين كل خطوة من رابط يصلكِ بعد الإرسال.")} <Term k="tracking" /></p>
    </details>
  );
}
