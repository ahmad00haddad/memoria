import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 rounded-sm border border-dashed border-border bg-card/30 ${className}`}>
      {Icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-secondary text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="font-serif text-xl text-foreground">{title}</h3>
      {description && <p className="mt-2 text-sm text-muted-foreground max-w-md leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}