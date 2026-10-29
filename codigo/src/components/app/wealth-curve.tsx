import { cn } from "@/lib/utils";

/**
 * Editorial wealth visual: net worth rising against a declining mortgage,
 * with the crossover marked in champagne. Purely illustrative.
 */
const W = 560;
const H = 320;

function path(points: number[], min: number, max: number) {
  const n = points.length - 1;
  return points
    .map((p, i) => {
      const x = (i / n) * W;
      const y = H - ((p - min) / (max - min)) * (H - 24) - 12;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

const wealth = [18, 32, 48, 66, 88, 112, 140, 172, 208, 248, 292, 340];
const debt = [300, 282, 262, 240, 216, 190, 162, 132, 100, 68, 36, 8];
const MIN = 0;
const MAX = 350;

export function WealthCurve({ compact = false }: { compact?: boolean }) {
  // crossover ~ index 7.4
  const cx = (6.355 / 11) * W;
  const cy = H - ((151.4 - MIN) / (MAX - MIN)) * (H - 24) - 12;

  return (
    <figure className={cn("surface-card overflow-hidden", compact ? "p-5" : "p-7")}>
      {!compact && (
        <figcaption className="mb-6 flex items-baseline justify-between gap-4">
          <span className="eyebrow">Patrimonio vs deuda</span>
          <span className="text-xs text-muted-foreground">Simulación ilustrativa</span>
        </figcaption>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="animate-draw h-auto w-full"
        role="img"
        aria-label="Curva de patrimonio creciente cruzando la deuda del prestamo decreciente"
      >
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1="0"
            x2={W}
            y1={H * g}
            y2={H * g}
            className="stroke-border"
            strokeWidth="1"
          />
        ))}
        <path
          d={path(debt, MIN, MAX)}
          fill="none"
          className="stroke-debt"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path d={path(wealth, MIN, MAX)} fill="none" className="stroke-brand" strokeWidth="2" />
        <circle cx={cx} cy={cy} r="16" className="fill-gold" fillOpacity="0.1" />
        <circle cx={cx} cy={cy} r="3.5" className="fill-gold" />
      </svg>
      <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-px w-6 bg-brand" /> Patrimonio
        </span>
        <span className="flex items-center gap-2">
          <span className="h-px w-6 border-t border-dashed border-debt" /> Deuda
        </span>
        <span className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-gold" /> Punto de cruce
        </span>
      </div>
    </figure>
  );
}
