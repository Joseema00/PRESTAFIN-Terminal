import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  accent?: "brand" | "debt";
  className?: string;
}) {
  return (
    <div className={cn("surface-card p-6", className)}>
      <div className="flex items-center gap-2 eyebrow">
        {Icon ? <Icon className="size-3.5 text-gold" /> : null}
        {label}
      </div>
      <div
        className={cn(
          "mt-4 font-display text-[1.75rem] leading-none tabular-nums",
          accent === "brand" && "text-brand",
          accent === "debt" && "text-debt",
        )}
      >
        {value}
      </div>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
