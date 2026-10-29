import { cn } from "@/lib/utils";
// Local brand assets supplied in the source project.
import isotipoUrl from "@/assets/isotipo.png";
import wordmarkUrl from "@/assets/wordmark.png";

/**
 * Prestafin isotype: the serif P monogram with the ascending wealth stroke.
 */
export function BrandMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <img
      src={isotipoUrl}
      alt="Prestafin"
      width={size}
      height={size}
      className={cn("shrink-0 object-contain dark:brightness-0 dark:invert", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function BrandLockup({ className, height = 28 }: { className?: string; size?: number; height?: number }) {
  return (
    <img
      src={wordmarkUrl}
      alt="Prestafin"
      width={1920}
      height={589}
      className={cn("w-auto object-contain dark:brightness-0 dark:invert", className)}
      style={{ height }}
    />
  );
}
