import { BadgeCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = { variant?: "pill" | "icon"; className?: string };

const POINTS = [
  "هوية المصوّرة مطابقة لوثيقة رسمية",
  "أعمالها الظاهرة في الملف تعود لها فعلاً",
  "تمت مراجعة الملف يدوياً من فريق ميموريا",
];

export function VerifiedBadge({ variant = "pill", className = "" }: Props) {
  // داخل بطاقات قابلة للنقر (رابط) لا نضع زراً، فقط أيقونة مع تلميح.
  if (variant === "icon") {
    return (
      <span className={`inline-flex shrink-0 ${className}`} title="مصوّرة موثّقة من ميموريا" role="img" aria-label="مصوّرة موثّقة">
        <BadgeCheck className="h-5 w-5 text-sky-400" />
      </span>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="مصوّرة موثّقة من ميموريا، اضغطي لمعرفة المعنى"
          className={`inline-flex items-center gap-1.5 rounded-full border border-sky-400/60 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200 ${className}`}
        >
          <BadgeCheck className="h-4 w-4 text-sky-400" />
          مصوّرة موثّقة من ميموريا
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm" dir="rtl">
        <p className="mb-2 font-medium">ماذا تعني "موثّقة"؟</p>
        <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
          {POINTS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
