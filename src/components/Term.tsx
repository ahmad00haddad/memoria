import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { t as tr } from "@/i18n";

// شرح قصير لمصطلح عند الضغط على "؟" بجانبه، بدل صفحة دليل طويلة
const GLOSSARY = {
  deposit: () => tr("العربون مبلغ صغير من سعر الباقة تحوّلينه للمصوّرة مباشرة بعد موافقتها، فيُثبَّت لكِ الموعد. يُخصم من المبلغ الكلّي."),
  balance: () => tr("باقي المبلغ هو السعر الكلّي ناقص العربون. تحوّلينه للمصوّرة بعد العرس، وبعض المصوّرات يسلّمن الصور بعد وصوله."),
  refund: () => tr("كل مصوّرة تحدّد ماذا يحدث للعربون إذا ألغيتِ: لا يُرجَع، أو يُرجَع جزء منه، أو كله. تقرئينها وتوافقين عليها قبل التحويل."),
  tracking: () => tr("رابط خاص بحجزكِ يصلكِ بعد الإرسال. منه تتابعين موافقة المصوّرة والعربون والعقد وصوركِ، بدون حساب أو كلمة سر."),
} as const;

export function Term({ k, className = "" }: { k: keyof typeof GLOSSARY; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={tr("ما معنى هذا؟")} className={`inline-grid h-5 w-5 place-items-center rounded-full text-muted-foreground hover:text-gold align-middle ${className}`}>
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm leading-relaxed">{GLOSSARY[k]()}</PopoverContent>
    </Popover>
  );
}
