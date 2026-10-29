/**
 * Analítica profesional adicional del Portfolio Lab: comparación contra índice
 * de referencia, drawdowns reales, años naturales, exposición por divisa,
 * impacto de costes, puntuación de calidad y comparador de carteras.
 */
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Award,
  Coins,
  Globe,
  LineChart as LineChartIcon,
  Percent,
  Scale,
  TrendingDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/app/stat-card";
import { Panel } from "@/components/app/portfolio-analytics";
import { cn } from "@/lib/utils";
import { eur } from "@/lib/finance";
import type { Asset } from "@/lib/assets";
import { CLASS_LABEL } from "@/lib/assets";
import type { PortfolioHistory } from "@/lib/market/backtest";
import { useBenchmarkSeries } from "@/hooks/use-market-data";
import {
  averageCorrelation,
  benchmarkAnalysis,
  calendarYears,
  costAnalysis,
  currencyExposure,
  drawdownSeries,
  portfolioScore,
  rollingReturns,
  worstDrawdowns,
} from "@/lib/portfolio-advanced";
import { resolve, statsFor, type Portfolio } from "@/lib/portfolio";

const pct = (n: number) => `${n.toFixed(1)}%`;
const signPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
  fontSize: 12,
} as const;

const monthLabel = (d: string) =>
  new Date(`${d}-01T00:00:00`).toLocaleDateString("es-ES", { month: "short", year: "2-digit" });

/* ============================ Benchmark ============================ */

const BENCHMARKS: { symbol: string; label: string }[] = [
  { symbol: "IWDA.AS", label: "MSCI World" },
  { symbol: "VWCE.DE", label: "All-World" },
  { symbol: "CSPX.L", label: "S&P 500" },
  { symbol: "EQQQ.DE", label: "Nasdaq 100" },
  { symbol: "AGGH.MI", label: "Bonos globales" },
  { symbol: "SGLN.L", label: "Oro" },
];

export function BenchmarkPanel({ history }: { history: PortfolioHistory | null }) {
  const [symbol, setSymbol] = useState(BENCHMARKS[0]!.symbol);
  const [custom, setCustom] = useState("");
  const bench = useBenchmarkSeries(symbol);

  const analysis = useMemo(
    () => (history && bench.monthly.length ? benchmarkAnalysis(history, bench.monthly) : null),
    [history, bench.monthly],
  );

  const years = useMemo(
    () => (history ? calendarYears(history.months, analysis?.series ?? null) : []),
    [history, analysis],
  );
  const dd = useMemo(() => (history ? drawdownSeries(history.months) : []), [history]);
  const rolling = useMemo(
    () => (history && history.months.length > 37 ? rollingReturns(history.months, 36) : []),
    [history],
  );
  const episodes = useMemo(() => (history ? worstDrawdowns(history.months, 5) : []), [history]);

  if (!history) {
    return (
      <Panel title="Comparación con índice" subtitle="Necesitas activos con histórico real suficiente (12 meses o más)." icon={LineChartIcon}>
        <p className="p-8 text-center text-sm text-muted-foreground">
          Añade activos con datos históricos para comparar tu cartera con un índice de referencia.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Índice de referencia"
        subtitle="Compara tu cartera real con el índice que quieras batir."
        icon={LineChartIcon}
      >
        <div className="flex flex-wrap items-center gap-2 p-5">
          {BENCHMARKS.map((b) => (
            <button
              key={b.symbol}
              onClick={() => setSymbol(b.symbol)}
              className={cn(
                "rounded-full border border-border px-3.5 py-1.5 text-sm transition-colors hover:bg-surface-2",
                symbol === b.symbol && "border-brand/40 bg-brand/10 text-brand",
              )}
            >
              {b.label}
            </button>
          ))}
          <form
            className="ml-auto flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (custom.trim()) setSymbol(custom.trim().toUpperCase());
            }}
          >
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Otro ticker (p. ej. SPY)"
              className="h-9 w-48"
            />
            <Badge variant="secondary" className="font-mono">{symbol}</Badge>
          </form>
        </div>
      </Panel>

      {bench.isLoading ? (
        <p className="text-center text-sm text-muted-foreground">Descargando el histórico del índice…</p>
      ) : null}
      {bench.error ? <p className="text-center text-sm text-debt">{bench.error}</p> : null}

      {analysis ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Tu cartera (anualizado)" value={pct(analysis.portfolioCagr)} hint={`${analysis.months} meses comunes`} icon={LineChartIcon} accent="brand" />
            <StatCard label="Índice (anualizado)" value={pct(analysis.benchmarkCagr)} hint={`Vol. ${pct(analysis.benchmarkVol)}`} icon={Scale} />
            <StatCard label="Alfa de Jensen" value={signPct(analysis.alpha)} hint={`Beta ${analysis.beta.toFixed(2)} · R² ${(analysis.r2 * 100).toFixed(0)}%`} icon={Award} accent={analysis.alpha >= 0 ? "brand" : "debt"} />
            <StatCard label="Tracking error" value={pct(analysis.trackingError)} hint={`Information ratio ${analysis.informationRatio.toFixed(2)}`} icon={Percent} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Captura al alza" value={pct(analysis.upCapture)} hint="Del movimiento positivo del índice" icon={LineChartIcon} accent="brand" />
            <StatCard label="Captura a la baja" value={pct(analysis.downCapture)} hint="Cuanto más bajo, mejor defensa" icon={TrendingDown} accent="debt" />
            <StatCard label="Meses ganados al índice" value={pct(analysis.battingAverage)} hint="Batting average" icon={Award} />
            <StatCard label="Peor caída del índice" value={pct(analysis.benchmarkMaxDrawdown)} hint={`Tu cartera ${pct(history.maxDrawdown)}`} icon={TrendingDown} accent="debt" />
          </div>

          <Panel
            title="Crecimiento comparado de 100 €"
            subtitle={`Ventana común real: ${monthLabel(analysis.from)} – ${monthLabel(analysis.to)}`}
            icon={LineChartIcon}
          >
            <div className="h-[340px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analysis.series} margin={{ top: 12, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="d" tickFormatter={monthLabel} minTickGap={40} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} width={56} tickLine={false} axisLine={false} tickFormatter={(v: number) => Math.round(v).toString()} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={monthLabel} formatter={(v: number, n: string) => [`${v.toFixed(1)}`, n]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line dataKey="cartera" name="Tu cartera" stroke="var(--brand)" strokeWidth={2.4} dot={false} />
                  <Line dataKey="indice" name="Índice" stroke="var(--muted-foreground)" strokeWidth={1.8} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </>
      ) : null}

      <Panel title="Caídas desde máximos (drawdown real)" subtitle="Profundidad de cada corrección de tu cartera mes a mes." icon={TrendingDown}>
        <div className="h-[260px] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dd} margin={{ top: 12, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="d" tickFormatter={monthLabel} minTickGap={40} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} width={48} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v)}%`} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={monthLabel} formatter={(v: number) => [`${v.toFixed(1)}%`, "Drawdown"]} />
              <Area dataKey="dd" stroke="var(--debt)" fill="var(--debt)" fillOpacity={0.18} strokeWidth={1.8} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {episodes.length ? (
          <div className="overflow-x-auto border-t border-border p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="pb-3 font-medium">Inicio</th>
                  <th className="pb-3 font-medium">Suelo</th>
                  <th className="pb-3 font-medium">Recuperación</th>
                  <th className="pb-3 text-right font-medium">Caída</th>
                  <th className="pb-3 text-right font-medium">Duración</th>
                </tr>
              </thead>
              <tbody>
                {episodes.map((e) => (
                  <tr key={`${e.from}-${e.trough}`} className="border-t border-border">
                    <td className="py-2.5">{monthLabel(e.from)}</td>
                    <td className="py-2.5">{monthLabel(e.trough)}</td>
                    <td className="py-2.5">{e.to ? monthLabel(e.to) : "En curso"}</td>
                    <td className="py-2.5 text-right tabular-nums text-debt">{e.depth.toFixed(1)}%</td>
                    <td className="py-2.5 text-right tabular-nums">{e.months} meses</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>

      <Panel title="Rentabilidad por año natural" subtitle="Comparativa anual real frente al índice seleccionado." icon={Scale}>
        <div className="h-[300px] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={years} margin={{ top: 12, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="year" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} width={48} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v)}%`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${v.toFixed(1)}%`, n]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Bar dataKey="portfolio" name="Tu cartera" radius={[4, 4, 0, 0]}>
                {years.map((y) => (
                  <Cell key={y.year} fill={y.portfolio >= 0 ? "var(--brand)" : "var(--debt)"} />
                ))}
              </Bar>
              {years.some((y) => y.benchmark !== null) ? (
                <Bar dataKey="benchmark" name="Índice" fill="var(--muted-foreground)" fillOpacity={0.45} radius={[4, 4, 0, 0]} />
              ) : null}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {rolling.length ? (
        <Panel title="Rentabilidad móvil a 3 años" subtitle="Anualizada; muestra la consistencia de la estrategia en el tiempo." icon={LineChartIcon}>
          <div className="h-[260px] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rolling} margin={{ top: 12, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="d" tickFormatter={monthLabel} minTickGap={40} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} width={48} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v)}%`} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={monthLabel} formatter={(v: number) => [`${v.toFixed(1)}%`, "3 años anualizado"]} />
                <ReferenceLine y={0} stroke="var(--border)" />
                <Line dataKey="value" stroke="var(--brand)" strokeWidth={2.2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

/* ======================= Exposición y costes ======================= */

export function ExposurePanel({
  assets,
  weights,
  total,
  ter,
  er,
  monthly,
}: {
  assets: Asset[];
  weights: number[];
  total: number;
  ter: number;
  er: number;
  monthly: number;
}) {
  const [years, setYears] = useState(20);
  const currencies = useMemo(() => currencyExposure(assets, weights, total), [assets, weights, total]);
  const costs = useMemo(() => costAnalysis(total, ter, er, monthly, years), [total, ter, er, monthly, years]);
  const top = useMemo(
    () =>
      assets
        .map((a, i) => ({ a, w: weights[i] ?? 0 }))
        .sort((x, y) => y.w - x.w)
        .slice(0, 5),
    [assets, weights],
  );
  const top5 = top.reduce((s, r) => s + r.w, 0) * 100;
  const nonEur = currencies.filter((c) => c.key !== "EUR").reduce((s, c) => s + c.weight, 0) * 100;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Exposición fuera del euro" value={pct(nonEur)} hint="Riesgo de divisa sin cubrir" icon={Globe} accent={nonEur > 70 ? "debt" : "brand"} />
        <StatCard label="Peso de las 5 mayores" value={pct(top5)} hint={`${assets.length} posiciones en total`} icon={Scale} />
        <StatCard label="Coste anual estimado" value={eur(costs.annualCost)} hint={`TER medio ponderado ${ter.toFixed(2)}%`} icon={Coins} accent="debt" />
        <StatCard label={`Coste acumulado en ${years} años`} value={eur(costs.totalCost)} hint={`${costs.finalGap.toFixed(1)}% del capital final`} icon={Percent} accent="debt" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Exposición por divisa" subtitle="Divisa de cotización de cada posición." icon={Globe}>
          <div className="space-y-3 p-5">
            {currencies.map((c) => (
              <div key={c.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono">{c.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {pct(c.weight * 100)} · {eur(c.value)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${c.weight * 100}%` }} />
                </div>
              </div>
            ))}
            {currencies.length === 0 ? <p className="text-sm text-muted-foreground">Sin posiciones.</p> : null}
          </div>
        </Panel>

        <Panel title="Mayores posiciones" subtitle="Concentración real de la cartera." icon={Scale}>
          <div className="space-y-3 p-5">
            {top.map(({ a, w }) => (
              <div key={a.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-mono text-xs font-semibold">{a.ticker}</span>{" "}
                    <span className="text-muted-foreground">{CLASS_LABEL[a.cls]}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">{pct(w * 100)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${w * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Impacto de los costes a largo plazo"
        subtitle="Diferencia entre la cartera bruta y la cartera después de comisiones."
        icon={Coins}
        action={
          <div className="flex items-center gap-1.5">
            {[10, 20, 30].map((y) => (
              <button
                key={y}
                onClick={() => setYears(y)}
                className={cn(
                  "rounded-full border border-border px-3 py-1 text-xs transition-colors hover:bg-surface-2",
                  years === y && "border-brand/40 bg-brand/10 text-brand",
                )}
              >
                {y} años
              </button>
            ))}
          </div>
        }
      >
        <div className="h-[300px] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={costs.years} margin={{ top: 12, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="year" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v} a`} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} width={56} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(l: number) => `Año ${l}`} formatter={(v: number, n: string) => [eur(v), n]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area dataKey="sinCostes" name="Sin costes" stroke="var(--muted-foreground)" fill="var(--muted-foreground)" fillOpacity={0.1} strokeDasharray="4 3" />
              <Area dataKey="conCostes" name="Con costes" stroke="var(--brand)" fill="var(--brand)" fillOpacity={0.18} strokeWidth={2.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}

/* ============================ Score ============================ */

export function ScorePanel({
  assets,
  weights,
  sharpe,
  vol,
  ter,
  corr,
  realCoverage,
}: {
  assets: Asset[];
  weights: number[];
  sharpe: number;
  vol: number;
  ter: number;
  corr: number[][];
  realCoverage: number;
}) {
  const hhi = weights.reduce((s, w) => s + w * w, 0) || 1;
  const score = useMemo(
    () =>
      portfolioScore({
        assets,
        weights,
        sharpe,
        vol,
        ter,
        effectiveAssets: 1 / hhi,
        avgCorrelation: averageCorrelation(corr),
        realCoverage,
      }),
    [assets, weights, sharpe, vol, ter, hhi, corr, realCoverage],
  );

  return (
    <Panel title="Calidad de la cartera" subtitle="Puntuación global sobre 100 con el desglose de cada criterio." icon={Award}>
      <div className="grid gap-6 p-5 md:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl bg-surface-2 p-6">
          <p className="font-display text-5xl tabular-nums text-brand">{score.total}</p>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">sobre 100</p>
          <Badge className="mt-3">Nota {score.grade}</Badge>
        </div>
        <div className="space-y-4">
          {score.items.map((i) => (
            <div key={i.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{i.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {i.score.toFixed(0)} / {i.max}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${(i.score / i.max) * 100}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{i.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

/* ====================== Comparador de carteras ====================== */

export function ComparePanel({ portfolios, activeId }: { portfolios: Portfolio[]; activeId: string }) {
  const rows = useMemo(
    () =>
      portfolios.map((p) => {
        const { assets, amounts } = resolve(p);
        const total = amounts.reduce((s, v) => s + v, 0);
        const weights = total > 0 ? amounts.map((a) => a / total) : assets.map(() => 0);
        const s = statsFor(assets, weights);
        return { p, total, positions: assets.length, ...s };
      }),
    [portfolios],
  );

  return (
    <Panel title="Comparador de carteras" subtitle="Todas tus carteras guardadas, lado a lado." icon={Scale}>
      <div className="overflow-x-auto p-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
              <th className="pb-3 font-medium">Cartera</th>
              <th className="pb-3 text-right font-medium">Valor</th>
              <th className="pb-3 text-right font-medium">Posiciones</th>
              <th className="pb-3 text-right font-medium">Rent.</th>
              <th className="pb-3 text-right font-medium">Vol.</th>
              <th className="pb-3 text-right font-medium">Sharpe</th>
              <th className="pb-3 text-right font-medium">Dividendo</th>
              <th className="pb-3 text-right font-medium">Coste</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.p.id} className={cn("border-t border-border", r.p.id === activeId && "bg-brand/5")}>
                <td className="py-2.5">
                  {r.p.name}
                  {r.p.id === activeId ? <Badge variant="secondary" className="ml-2">Activa</Badge> : null}
                </td>
                <td className="py-2.5 text-right tabular-nums">{eur(r.total)}</td>
                <td className="py-2.5 text-right tabular-nums">{r.positions}</td>
                <td className="py-2.5 text-right tabular-nums text-brand">{pct(r.er)}</td>
                <td className="py-2.5 text-right tabular-nums text-debt">{pct(r.vol)}</td>
                <td className="py-2.5 text-right tabular-nums">{r.sharpe.toFixed(2)}</td>
                <td className="py-2.5 text-right tabular-nums">{pct(r.yield)}</td>
                <td className="py-2.5 text-right tabular-nums">{r.ter.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
