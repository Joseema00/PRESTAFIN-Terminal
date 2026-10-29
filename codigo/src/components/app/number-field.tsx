import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/** Parsea números escritos a la española ("23.423,56") o a la inglesa ("23423.56"). */
export function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return null;
  let s = cleaned;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g)?.length ?? 0) > 1) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const format = (v: number, decimals: number) =>
  v.toLocaleString("es-ES", { maximumFractionDigits: decimals });

/**
 * Campo numérico con barra deslizante y entrada de texto editable:
 * el usuario puede arrastrar o escribir el valor exacto (decimales incluidos).
 */
export function NumberField({
  label,
  value,
  min,
  max,
  step,
  unit,
  decimals = 2,
  hardMax,
  onChange,
  className,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  decimals?: number;
  /** Límite absoluto al escribir (por defecto, el máximo de la barra). */
  hardMax?: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(() => format(value, decimals));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(format(value, decimals));
  }, [value, decimals, focused]);

  const upper = hardMax ?? max;

  function commit(raw: string) {
    const parsed = parseNumber(raw);
    if (parsed === null) {
      setDraft(format(value, decimals));
      return;
    }
    const clamped = Math.min(upper, Math.max(min, parsed));
    const rounded = +clamped.toFixed(decimals);
    onChange(rounded);
    setDraft(format(rounded, decimals));
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm text-muted-foreground">{label}</label>
        <div className="flex items-center gap-1.5">
          <input
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => {
              setFocused(true);
              e.currentTarget.select();
            }}
            onBlur={(e) => {
              setFocused(false);
              commit(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            aria-label={label}
            className="w-28 rounded-lg border border-border bg-surface-2 px-2 py-1 text-right text-sm font-semibold tabular-nums outline-none transition-colors focus:border-brand/60"
          />
          {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
        </div>
      </div>
      <Slider
        value={[Math.min(Math.max(value, min), max)]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
    </div>
  );
}
