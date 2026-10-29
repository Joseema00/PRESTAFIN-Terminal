import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Gauge, Scale, Shield, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { StatCard } from "@/components/app/stat-card";
import { cn } from "@/lib/utils";
import { eur } from "@/lib/finance";
import type { PortfolioHistory } from "@/lib/market/backtest";
import type { Asset } from "@/lib/assets";
import {
  incomeProjection,
  rebalancePlan,
  riskContributions,
  riskMetrics,
  stressTest,
} from "@/lib/portfolio-analytics";

const pct = (n: number) => `${n.toFixed(1)}%`;

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
  fontSize: 12,
} as const;

export function Panel({
  title,
  subtitle,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: typeof Shield;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-brand/12">
              <Icon className="size-4 text-brand" />
            </div>
          ) : null}
          <div>
            <h3 className="font-semibold">{title}</h3>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ------------------------- Métricas de riesgo ------------------------- */

export function MetricsPanel({
  assets,
  weights,
  total,
  yieldPct,
  cov,
  history,
}: {
  assets: Asset[];
  weights: number[];
  total: number;
  yieldPct: number;
  /** Covarianzas reales de las series históricas. */
  cov?: number[][];
  /** Backtest de la cartera con datos reales. */
  history?: PortfolioHistory | null;
}) {
  const m = useMemo(() => riskMetrics(assets, weights, cov), [assets, weights, cov]);
  const rc = useMemo(() => riskContributions(assets, weights, cov), [assets, weights, cov]);
  const income = useMemo(() => incomeProjection(total, yieldPct, m.er - yieldPct, 20), [total, yieldPct, m.er]);

  return (
    <div className="space-y-6">
      {history ? (
        <Panel
          title="Comportamiento histórico real de esta cartera"
          subtitle={`Rebalanceo mensual entre ${history.from} y ${history.to} · ${(history.coverage * 100).toFixed(0)}% del capital con serie histórica`}
          icon={Gauge}
        >
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Rentabilidad anualizada real" value={pct(history.cagr)} hint="Datos históricos, no proyección" icon={Sparkles} accent="brand" />
            <StatCard label="Volatilidad realizada" value={pct(history.vol)} hint={`${(history.positiveMonths * 100).toFixed(0)}% de meses en positivo`} icon={Gauge} accent="debt" />
            <StatCard label="Máxima caída real" value={pct(history.maxDrawdown)} hint="Peor caída desde máximos" icon={AlertTriangle} accent="debt" />
            <StatCard label="Peor / mejor 12 meses" value={`${pct(history.worst12m)} / ${pct(history.best12m)}`} hint="Ventanas móviles observadas" icon={Scale} />
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="VaR 95% anual" value={pct(history ? history.var95 : m.var95)} hint="Pérdida no superada el 95% de los años" icon={AlertTriangle} accent="debt" />
        <StatCard label="CVaR 95% (cola)" value={pct(history ? history.cvar95 : m.cvar95)} hint="Pérdida media en el peor 5%" icon={AlertTriangle} accent="debt" />
        <StatCard label={history ? "Máxima caída real" : "Máxima caída estimada"} value={pct(history ? history.maxDrawdown : -m.maxDrawdown)} hint={`Recuperación ~${m.recoveryYears.toFixed(1)} años`} icon={Gauge} accent="debt" />
        <StatCard label="Ratio de Sortino" value={m.sortino.toFixed(2)} hint="Rentabilidad por unidad de riesgo bajista" icon={Sparkles} accent="brand" />
        <StatCard label="Ratio de diversificación" value={m.diversificationRatio.toFixed(2)} hint="Por encima de 1,3 es buena diversificación" icon={Shield} accent="brand" />
        <StatCard label="Activos efectivos" value={m.effectiveAssets.toFixed(1)} hint={`Concentración HHI ${(m.concentration * 100).toFixed(0)}`} icon={Scale} />
        <StatCard label={history ? "Peor 12 meses real" : "Peor año esperado"} value={pct(history ? history.worst12m : m.worstYear)} hint="Percentil 2,5 anual" icon={AlertTriangle} accent="debt" />
        <StatCard label={history ? "Mejor 12 meses real" : "Mejor año esperado"} value={pct(history ? history.best12m : m.bestYear)} hint="Percentil 97,5 anual" icon={Sparkles} accent="brand" />
      </div>

      <Panel
        title="Contribución al riesgo por activo"
        subtitle="Cuánto riesgo aporta cada posición, no solo cuánto dinero pesa."
        icon={Gauge}
      >
        <div className="space-y-5 p-5">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rc.map((r) => ({ name: r.asset.ticker, Riesgo: r.share * 100, Peso: r.weight * 100 }))} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-25} height={50} textAnchor="end" />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${v.toFixed(1)}%`, n]} />
                <Bar dataKey="Peso" fill="var(--muted-foreground)" opacity={0.35} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Riesgo" fill="var(--brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="pb-3 font-medium">Activo</th>
                  <th className="pb-3 text-right font-medium">Peso</th>
                  <th className="pb-3 text-right font-medium">Riesgo marginal</th>
                  <th className="pb-3 text-right font-medium">% del riesgo</th>
                  <th className="pb-3 text-right font-medium">Diagnóstico</th>
                </tr>
              </thead>
              <tbody>
                {rc.map((r) => {
                  const over = r.share - r.weight;
                  return (
                    <tr key={r.asset.id} className="border-t border-border">
                      <td className="py-2.5 font-mono text-xs">{r.asset.ticker}</td>
                      <td className="py-2.5 text-right tabular-nums">{pct(r.weight * 100)}</td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground">{r.mctr.toFixed(2)}</td>
                      <td className="py-2.5 text-right tabular-nums font-medium">{pct(r.share * 100)}</td>
                      <td className="py-2.5 text-right">
                        <Badge variant="secondary" className={cn("text-[11px]", over > 0.05 && "text-debt")}>
                          {over > 0.05 ? "Aporta más riesgo que peso" : over < -0.03 ? "Estabilizador" : "Equilibrado"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      <Panel title="Rentas estimadas" subtitle="Dividendos y cupones proyectados si reinviertes la revalorización." icon={Wallet}>
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_260px]">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={income} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="year" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v} a`} />
                <YAxis yAxisId="income" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                <YAxis yAxisId="capital" orientation="right" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [eur(v), n === "income" ? "Renta anual" : "Capital"]} labelFormatter={(l: number) => `Año ${l}`} />
                <Bar yAxisId="income" dataKey="income" fill="var(--brand)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="capital" dataKey="capital" stroke="var(--muted-foreground)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 self-center">
            <div>
              <p className="text-xs text-muted-foreground">Renta anual actual</p>
              <p className="text-2xl font-semibold tabular-nums text-brand">{eur((total * yieldPct) / 100)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Renta mensual media</p>
              <p className="text-lg font-semibold tabular-nums">{eur((total * yieldPct) / 1200)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Renta en 20 años</p>
              <p className="text-lg font-semibold tabular-nums">{eur(income[income.length - 1]?.income ?? 0)}</p>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------- Estrés ------------------------- */

export function StressPanel({ assets, weights, total }: { assets: Asset[]; weights: number[]; total: number }) {
  const rows = useMemo(() => stressTest(assets, weights, total), [assets, weights, total]);
  const worst = rows[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Peor escenario" value={pct(worst?.impactPct ?? 0)} hint={worst?.scenario.name ?? ""} icon={AlertTriangle} accent="debt" />
        <StatCard label="Pérdida en euros" value={eur(worst?.impactEur ?? 0)} hint={`Quedarían ${eur(worst?.after ?? 0)}`} icon={Wallet} accent="debt" />
        <StatCard
          label="Impacto medio bajista"
          value={pct(
            rows.filter((r) => r.impactPct < 0).reduce((s, r) => s + r.impactPct, 0) /
              Math.max(1, rows.filter((r) => r.impactPct < 0).length),
          )}
          hint="Media de los escenarios negativos"
          icon={Gauge}
        />
      </div>

      <Panel title="Escenarios de estrés históricos" subtitle="Cómo se habría comportado tu cartera actual en cada crisis." icon={AlertTriangle}>
        <div className="divide-y divide-border">
          {rows.map((r) => {
            const neg = r.impactPct < 0;
            const width = Math.min(100, Math.abs(r.impactPct) * 1.6);
            return (
              <div key={r.scenario.id} className="grid gap-3 p-5 md:grid-cols-[1fr_240px] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-medium">{r.scenario.name}</h4>
                    <Badge variant="secondary" className="text-[11px]">{r.scenario.period}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{r.scenario.description}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${width}%`, background: neg ? "var(--debt)" : "var(--gain)" }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("text-2xl font-semibold tabular-nums", neg ? "text-debt" : "text-gain")}>
                    {r.impactPct > 0 ? "+" : ""}
                    {r.impactPct.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {eur(r.impactEur)} → {eur(r.after)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------- Rebalanceo ------------------------- */

export function RebalancePanel({
  assets,
  amounts,
  targetWeights,
  total,
  onApply,
  targetLabel,
}: {
  assets: Asset[];
  amounts: number[];
  targetWeights: number[];
  total: number;
  targetLabel: string;
  onApply: (weights: number[]) => void;
}) {
  const [band, setBand] = useState(3);
  const [contribution, setContribution] = useState(0);
  const capital = total + contribution;
  const orders = useMemo(
    () => rebalancePlan(assets, amounts, targetWeights, capital, band),
    [assets, amounts, targetWeights, capital, band],
  );
  const toTrade = orders.filter((o) => o.action !== "Mantener");
  const turnover = toTrade.reduce((s, o) => s + Math.abs(o.delta), 0) / Math.max(1, capital);

  return (
    <div className="space-y-6">
      <Panel
        title="Plan de rebalanceo"
        subtitle={`Objetivo: ${targetLabel}. Se ignoran desviaciones dentro de la banda de tolerancia.`}
        icon={Scale}
        action={
          <Button size="sm" onClick={() => onApply(targetWeights)} disabled={toTrade.length === 0}>
            Aplicar rebalanceo
          </Button>
        }
      >
        <div className="grid gap-6 p-5 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Banda de tolerancia</span>
              <span className="text-sm font-semibold tabular-nums">±{band}%</span>
            </div>
            <Slider value={[band]} min={0} max={10} step={0.5} onValueChange={(v) => setBand(v[0] ?? band)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Aportación extra a repartir</span>
              <span className="text-sm font-semibold tabular-nums">{eur(contribution)}</span>
            </div>
            <Slider value={[contribution]} min={0} max={50000} step={500} onValueChange={(v) => setContribution(v[0] ?? contribution)} />
          </div>
        </div>
        <div className="overflow-x-auto border-t border-border p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="pb-3 font-medium">Activo</th>
                <th className="pb-3 text-right font-medium">Actual</th>
                <th className="pb-3 text-right font-medium">Objetivo</th>
                <th className="pb-3 text-right font-medium">Desvío</th>
                <th className="pb-3 text-right font-medium">Orden</th>
                <th className="pb-3 text-right font-medium">Importe</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.asset.id} className="border-t border-border">
                  <td className="py-2.5">
                    <span className="font-mono text-xs font-semibold">{o.asset.ticker}</span>
                    <p className="max-w-[220px] truncate text-xs text-muted-foreground">{o.asset.name}</p>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{pct(o.currentWeight * 100)}</td>
                  <td className="py-2.5 text-right tabular-nums">{pct(o.targetWeight * 100)}</td>
                  <td className={cn("py-2.5 text-right tabular-nums", Math.abs(o.drift) >= band && (o.drift > 0 ? "text-debt" : "text-brand"))}>
                    {o.drift > 0 ? "+" : ""}
                    {o.drift.toFixed(1)}%
                  </td>
                  <td className="py-2.5 text-right">
                    <Badge
                      variant="secondary"
                      className={cn("text-[11px]", o.action === "Comprar" && "text-brand", o.action === "Vender" && "text-debt")}
                    >
                      {o.action}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{o.action === "Mantener" ? "—" : eur(Math.abs(o.delta))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-5 flex flex-wrap gap-6 text-sm">
            <span className="text-muted-foreground">
              Operaciones necesarias: <span className="font-semibold text-foreground">{toTrade.length}</span>
            </span>
            <span className="text-muted-foreground">
              Rotación de cartera: <span className="font-semibold text-foreground tabular-nums">{pct(turnover * 100)}</span>
            </span>
            <span className="text-muted-foreground">
              Capital tras aportación: <span className="font-semibold text-foreground tabular-nums">{eur(capital)}</span>
            </span>
          </div>
        </div>
      </Panel>
    </div>
  );
}
