import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  aspectRatio?: "3/4" | "4/3" | "1/1" | "16/9" | "4/5";
  className?: string;
  lines?: number;
}

export function SkeletonCard({
  aspectRatio = "3/4",
  className,
  lines = 2,
}: SkeletonCardProps) {
  return (
    <div className={cn("rounded-sm overflow-hidden border border-border/50", className)}>
      <div
        className="skeleton w-full"
        style={{ aspectRatio }}
      />
      <div className="p-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-3.5 rounded-full skeleton",
              i === 0 ? "w-3/4" : "w-1/2"
            )}
          />
        ))}
      </div>
    </div>
  );
}
