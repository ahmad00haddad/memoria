import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

/**
 * زر رجوع موحّد وواضح من أي صفحة فرعية إلى "لوحتي".
 * يُستخدم في كل صفحات /dashboard/* لتجربة تنقّل متّسقة.
 *
 * ملاحظة (للـ UI في Lovable): التصميم هنا مبسّط ووظيفي عمداً —
 * يمكن تجميله لاحقاً مع الحفاظ على وجود زر رجوع ظاهر في كل صفحة فرعية.
 */
export function BackToDashboard({ label = "العودة إلى لوحتي" }: { label?: string }) {
  return (
    <Link
      to="/dashboard"
      className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
    >
      {/* في الواجهة RTL يشير السهم لليمين = رجوع */}
      <ChevronRight className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}
