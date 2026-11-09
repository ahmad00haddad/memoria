import { Skeleton } from "@/components/ui/skeleton";
import { t, tx } from "@/i18n";

// هيكل صفحة بدل الدوّار: الصفحة «موجودة» فوراً بشكلها، والمحتوى يملؤها (إحساس تطبيق)
export function PageLoader({ label = t("جارٍ التحميل…") }: { label?: string }) {
  return (
    <div className="container-editorial max-w-4xl py-6 sm:py-12" role="status" aria-live="polite">
      <span className="sr-only">{tx(label)}</span>
      <Skeleton className="h-4 w-20 mb-4" />
      <Skeleton className="h-9 w-48 mb-3" />
      <Skeleton className="h-4 w-3/4 mb-8" />
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3.5 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-sm border border-border bg-card p-6 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-sm border border-border bg-card p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="break-inside-avoid mb-4 rounded-sm border border-border bg-card overflow-hidden" style={{ aspectRatio: i % 5 === 2 ? "3/4" : i % 5 === 4 ? "4/5" : "3/4" }}>
          <Skeleton className="w-full h-full" />
        </div>
      ))}
    </div>
  );
}