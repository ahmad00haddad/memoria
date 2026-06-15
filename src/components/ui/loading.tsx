import { Skeleton } from "@/components/ui/skeleton";

export function PageLoader({ label = "جارٍ التحميل…" }: { label?: string }) {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 rounded-full border-2 border-border border-t-gold animate-spin" />
        <span className="text-sm">{label}</span>
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
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="rounded-sm border border-border bg-card overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}