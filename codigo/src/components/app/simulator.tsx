import { useMemo, useState } from "react";
import { trackAdsEvent } from "@/lib/analytics/gtag";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Banknote,
  Coins,
  Flame,
  Landmark,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NumberField } from "@/components/app/number-field";
import { StatCard } from "@/components/app/stat-card";
import { cn } from "@/lib/utils";
import {
  dateFromMonth,
  eur,
  monthlyPayment,
  monthsLabel,
  runAll,
  type Inputs,
} from "@/lib/finance";

const DEFAULTS: Inputs = {
  principal: 180000,
  annualRate: 3.1,
  years: 25,
  monthlySavings: 600,
  currentSavings: 20000,
  expectedReturn: 7,
  inflation: 2.5,
  taxRate: 20,
};

type FieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
};

function Field({ label, value, min, max, step, suffix, onChange }: FieldProps) {
  return (
    <NumberField
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      unit={suffix.trim()}
      decimals={suffix === "€" ? 2 : suffix === "%" ? 2 : 0}
      onChange={onChange}
    />
  );
}

export function Simulator({savedInputs,onInputsChange}:{savedInputs?:Inputs;onInputsChange?:(inputs:Inputs)=>void} = {}) {
  const [localInputs, setLocalInputs] = useState<Inputs>(DEFAULTS);
  const inputs = savedInputs ?? localInputs;
  const [selected, setSelected] = useState("dynamic");

  const results = useMemo(() => runAll(inputs), [inputs]);
  const ranked = useMemo(
    () => [...results].sort((a, b) => b.netWorthAfterTax - a.netWorthAfterTax),
    [results],
  );
  const best = ranked[0]!;
  const active = results.find((r) => r.id === selected) ?? results[0]!;
  const payment = monthlyPayment(inputs.principal, inputs.annualRate, inputs.years);

  const chartData = useMemo(
    () =>
      active.series
        .filter((p) => p.month % 3 === 0)
        .map((p) => ({
          year: +(p.month / 12).toFixed(2),
          Deuda: Math.round(p.debt),
          Patrimonio: Math.round(p.portfolio),
        })),
    [active],
  );

  const crossPoint =
    active.crossoverMonth !== null
      ? (active.series[Math.min(active.crossoverMonth, active.series.length - 1)] ?? null)
      : null;

  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);

  const markStart = () => {
    if (started) return;
    setStarted(true);
    trackAdsEvent("simulator_start");
  };

  const markComplete = () => {
    if (completed) return;
    setCompleted(true);
    trackAdsEvent("simulator_complete");
  };

  const set = (k: keyof Inputs) => (v: number) => {
    markStart();
    const next = { ...inputs, [k]: v };
    if (onInputsChange) onInputsChange(next); else setLocalInputs(next);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <aside className="surface-card h-fit space-y-6 p-6 lg:sticky lg:top-6">
        <div>
          <h3 className="text-sm font-semibold">Tus datos</h3>
          <p className="text-xs text-muted-foreground">
            {"\n"}
          </p>
        </div>
        <Field
          label="Capital pendiente"
          value={inputs.principal}
          min={0}
          max={800000}
          step={5000}
          suffix="€"
          onChange={set("principal")}
        />
        <Field
          label="Tipo de interés"
          value={inputs.annualRate}
          min={0}
          max={8}
          step={0.05}
          suffix="%"
          onChange={set("annualRate")}
        />
        <Field
          label="Años restantes"
          value={inputs.years}
          min={1}
          max={40}
          step={1}
          suffix=" años"
          onChange={set("years")}
        />
        <Field
          label="Ahorro mensual disponible"
          value={inputs.monthlySavings}
          min={0}
          max={4000}
          step={50}
          suffix="€"
          onChange={set("monthlySavings")}
        />
        <Field
          label="Ahorro actual"
          value={inputs.currentSavings}
          min={0}
          max={300000}
          step={1000}
          suffix="€"
          onChange={set("currentSavings")}
        />
        <Field
          label="Rentabilidad esperada"
          value={inputs.expectedReturn}
          min={0}
          max={12}
          step={0.25}
          suffix="%"
          onChange={set("expectedReturn")}
        />
        <Field
          label="Fiscalidad sobre plusvalías"
          value={inputs.taxRate}
          min={0}
          max={30}
          step={1}
          suffix="%"
          onChange={set("taxRate")}
        />
        <div className="rounded-xl bg-surface-2 p-4">
          <p className="text-xs text-muted-foreground">Cuota mensual estimada</p>
          <p className="text-xl font-semibold tabular-nums">{eur(payment)}</p>
        </div>
      </aside>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Deuda restante"
            value={eur(inputs.principal)}
            hint={`Cancelación en ${monthsLabel(active.payoffMonth)}`}
            icon={Landmark}
            accent="debt"
          />
          <StatCard
            label="Intereses futuros"
            value={eur(active.totalInterest)}
            hint="Con esta estrategia"
            icon={Banknote}
          />
          <StatCard
            label="Patrimonio final"
            value={eur(active.finalPortfolio)}
            hint={`Aportado ${eur(active.invested)}`}
            icon={TrendingUp}
            accent="brand"
          />
          <StatCard
            label="Patrimonio neto (tras impuestos)"
            value={eur(active.netWorthAfterTax)}
            hint={`Beneficio ${eur(active.finalPortfolio - active.invested)}`}
            icon={Coins}
            accent="brand"
          />
        </div>

        <div className="surface-card overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border p-6">
            <div>
              <h3 className="text-lg font-semibold">Deuda vs Patrimonio invertido</h3>
              <p className="text-sm text-muted-foreground">
                Estrategia: <span className="text-foreground">{active.name}</span>
              </p>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-xs text-muted-foreground">Cartera = deuda</p>
                <p className="font-semibold text-brand first-letter:uppercase">
                  {dateFromMonth(active.crossoverMonth)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prestamo cancelado</p>
                <p className="font-semibold first-letter:uppercase">{dateFromMonth(active.payoffMonth)}</p>
              </div>
            </div>
          </div>

          <div className="h-[340px] w-full p-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="fillPat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gain)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--gain)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="year"
                  type="number"
                  domain={[0, "dataMax"]}
                  tickCount={7}
                  tickFormatter={(v: number) => `${Math.round(v)} a`}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                  formatter={(v: number, name: string) => [eur(v), name]}
                  labelFormatter={(l: number) => `Año ${Math.round(l)}`}
                />
                <Area
                  type="monotone"
                  dataKey="Patrimonio"
                  stroke="var(--gain)"
                  strokeWidth={2.5}
                  fill="url(#fillPat)"
                />
                <Line
                  type="monotone"
                  dataKey="Deuda"
                  stroke="var(--debt)"
                  strokeWidth={2.5}
                  dot={false}
                />
                {crossPoint ? (
                  <ReferenceDot
                    x={+(crossPoint.month / 12).toFixed(2)}
                    y={Math.round(crossPoint.debt)}
                    r={7}
                    fill="var(--gain)"
                    stroke="var(--background)"
                    strokeWidth={3}
                    isFront
                  />
                ) : null}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {active.crossoverMonth !== null ? (
            <div className="animate-rise m-4 mt-0 flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/10 p-4">
              <Trophy className="mt-0.5 size-5 shrink-0 text-brand" />
              <div>
                <p className="font-semibold text-brand">
                  Independencia frente a tu prestamo en {monthsLabel(active.crossoverMonth)}
                </p>
                <p className="text-sm text-muted-foreground">
                  En <span className="first-letter:uppercase">{dateFromMonth(active.crossoverMonth)}</span> tu
                  cartera igualará la deuda pendiente ({eur(crossPoint?.debt ?? 0)}). A partir de ahí
                  podrías cancelar el prestamo cuando quisieras.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="surface-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Comparador de escenarios</h3>
            <Badge className="gap-1 bg-brand/15 text-brand hover:bg-brand/15">
              <Sparkles className="size-3" /> Mejor: {best.name}
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="pb-3 font-medium">Escenario</th>
                  <th className="pb-3 text-right font-medium">Intereses</th>
                  <th className="pb-3 text-right font-medium">Cancelación</th>
                  <th className="pb-3 text-right font-medium">Cruce</th>
                  <th className="pb-3 text-right font-medium">Patrimonio neto</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => {
                        markStart();
                        markComplete();
                        setSelected(r.id);
                      }}
                      className={cn(
                        "cursor-pointer border-t border-border transition-colors hover:bg-surface-2",
                        r.id === selected && "bg-brand/5",
                      )}
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 font-medium">
                          {r.id === best.id ? <Flame className="size-3.5 text-brand" /> : null}
                          {r.name}
                        </div>
                        <p className="max-w-md text-xs text-muted-foreground">{r.description}</p>
                      </td>
                      <td className="py-3 text-right tabular-nums text-debt">
                        {eur(r.totalInterest)}
                      </td>
                      <td className="py-3 text-right tabular-nums">{monthsLabel(r.payoffMonth)}</td>
                      <td className="py-3 text-right tabular-nums">
                        {monthsLabel(r.crossoverMonth)}
                      </td>
                      <td
                        className={cn(
                          "py-3 text-right font-semibold tabular-nums",
                          r.id === best.id && "text-brand",
                        )}
                      >
                        {eur(r.netWorthAfterTax)}
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <Target className="mt-0.5 size-3.5 shrink-0" />
            Proyecciones educativas basadas en tus supuestos. Rentabilidades pasadas no garantizan
            resultados futuros. Esto no es asesoramiento financiero personalizado.
          </p>
        </div>
      </div>
    </div>
  );
}
