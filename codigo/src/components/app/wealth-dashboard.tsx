import { usePeople } from '../../../desktop-ui/use-portfolios';
import { personWealth } from '@/lib/portfolio-monitor';
import { useMemo, useState } from "react";
import { trackAdsEventOncePerSession } from "@/lib/analytics/gtag";
import { Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Banknote,
  Coins,
  Flag,
  HeartPulse,
  Landmark,
  PiggyBank,
  Target,
  Trophy,
  Wallet,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { NumberField } from "@/components/app/number-field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureGate } from "@/components/app/paywall";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/app/stat-card";
import { usePortfolios } from "@/hooks/use-portfolios";
import { resolve, statsFor } from "@/lib/portfolio";
import { useMarketData } from "@/hooks/use-market-data";
import { dateFromMonth, eur, monthsLabel } from "@/lib/finance";
import {
  amortizationByYear,
  compareStrategies,
  freedomPoint,
  healthScore,
  projectionBands,
  runWealth,
  type WealthInputs,
} from "@/lib/wealth";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
  fontSize: 12,
} as const;

const PIE_COLORS = ["var(--brand)", "var(--gold)", "var(--debt)", "var(--muted-foreground)"];

export function WealthDashboard() {
  const store = usePortfolios();
  // Google Ads: simulator engagement (no personal data is sent).
  const markSimStart = () => trackAdsEventOncePerSession("simulator_start", "simulator_start");
  const markSimComplete = () => trackAdsEventOncePerSession("simulator_complete", "simulator_complete");

  const { mortgage, setMortgage: setMortgageRaw } = store;
  const setMortgage: typeof setMortgageRaw = (m) => {
    markSimStart();
    setMortgageRaw(m);
  };
  const principal = mortgage.principal;
  const rate = mortgage.rate;
  const years = mortgage.years;
  const extraPayment = mortgage.extraMonthly;
  const setPrincipal = (v: number) => setMortgage({ ...mortgage, principal: v });
  const setRate = (v: number) => setMortgage({ ...mortgage, rate: v });
  const setYears = (v: number) => setMortgage({ ...mortgage, years: v });
  const setExtraPayment = (v: number) => setMortgage({ ...mortgage, extraMonthly: v });
  const { settings, setSettings: setSettingsRaw } = store;
  const setSettings: typeof setSettingsRaw = (v) => {
    markSimStart();
    setSettingsRaw(v);
  };
  const { contribGrowth, inflation, taxRate, expenses, share, realTerms } = settings;
  const setContribGrowth = (v: number) => setSettings({ ...settings, contribGrowth: v });
  const setInflation = (v: number) => setSettings({ ...settings, inflation: v });
  const setTaxRate = (v: number) => setSettings({ ...settings, taxRate: v });
  const setExpenses = (v: number) => setSettings({ ...settings, expenses: v });
  const setShare = (v: number) => setSettings({ ...settings, share: v });
  const setRealTerms = (v: boolean) => setSettings({ ...settings, realTerms: v });
  const [mcPaths, setMcPaths] = useState(400);


  const people=usePeople();
  const wealth=people.active?personWealth(people.active):null;
  const [er,setEr]=useState(5),[vol,setVol]=useState(10);
  const stats={total:wealth?.investments??0,assets:wealth?.accounts.flatMap(c=>c.holdings)??[],sharpe:(er-2.2)/(vol||1)};

  const inputs: WealthInputs = useMemo(
    () => ({
      principal,
      rate,
      years,
      cash: store.profile.cash,
      otherAssets: store.profile.otherAssets,
      portfolio: stats?.total ?? 0,
      monthly: store.profile.monthlyContribution,
      contribGrowth,
      extraPayment,
      er,
      vol,
      inflation,
      taxRate,
      monthlyExpenses: expenses,
      cashRate: 1.5,
    }),
    [
      principal,
      rate,
      years,
      store.profile,
      stats?.total,
      contribGrowth,
      extraPayment,
      er,
      vol,
      inflation,
      taxRate,
      expenses,
    ],
  );

  const run = useMemo(() => runWealth(inputs, share), [inputs, share]);
  const strategies = useMemo(() => compareStrategies(inputs), [inputs]);
  const bands = useMemo(() => projectionBands(inputs, share, mcPaths), [inputs, share, mcPaths]);
  const amort = useMemo(() => amortizationByYear(inputs, share), [inputs, share]);
  const health = useMemo(
    () => healthScore(inputs, run, stats?.assets.length ?? 0),
    [inputs, run, stats?.assets.length],
  );
  const freedom = useMemo(() => freedomPoint(run, expenses), [run, expenses]);

  const best = strategies.reduce((a, b) => (b.run.netAfterTax > a.run.netAfterTax ? b : a));
  const deflator = realTerms ? Math.pow(1 + inflation / 100, years) : 1;
  const fmt = (v: number) => eur(v / deflator);

  const netWorth =
    store.profile.cash + (stats?.total ?? 0) + store.profile.otherAssets - principal;

  const chartData = run.series
    .filter((p) => p.month % 3 === 0)
    .map((p) => ({
      year: +(p.month / 12).toFixed(2),
      Deuda: Math.round(p.debt),
      Patrimonio: Math.round(p.portfolio + p.cash),
      Neto: Math.round(p.net),
    }));
  const cross = run.crossoverMonth !== null ? run.series[run.crossoverMonth] : null;

  const allocation = [
    { name: "Cartera", value: Math.round(stats?.total ?? 0) },
    { name: "Liquidez", value: Math.round(store.profile.cash) },
    { name: "Otros activos", value: Math.round(store.profile.otherAssets) },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="surface-card p-5"><strong>Patrimonio registrado y escenarios.</strong><p>Los saldos suman las cuentas con seguimiento. Las curvas futuras utilizan una rentabilidad y volatilidad supuestas, editables debajo; no son evolución observada. La ficha de la persona muestra las valoraciones registradas.</p></div>
      {store.active?.proposal&&<div className="surface-card p-5" role="status"><strong>La cartera seleccionada es una propuesta sin ejecutar.</strong><p>Sus importes no se añaden al patrimonio. Aquí se muestran los saldos y el préstamo registrados; la composición propuesta y sus condiciones están en Carteras.</p></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Patrimonio neto"
          value={eur(netWorth)}
          hint="Activos menos deuda del prestamo"
          icon={Coins}
          accent={netWorth >= 0 ? "brand" : "debt"}
        />
        <StatCard
          label="Cartera invertida"
          value={eur(stats?.total ?? 0)}
          hint={`${er.toFixed(1)}% supuesto · ${vol.toFixed(1)}% volatilidad`}
          icon={Wallet}
          accent="brand"
        />
        <StatCard
          label="Liquidez"
          value={eur(store.profile.cash)}
          hint={`${health.emergencyMonths.toFixed(1)} meses de gastos`}
          icon={PiggyBank}
        />
        <StatCard
          label="Deuda pendiente"
          value={eur(principal)}
          hint={`Cuota ${eur(run.payment)}/mes${extraPayment ? ` + ${eur(extraPayment)} extra` : ""}`}
          icon={Landmark}
          accent="debt"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="surface-card h-fit space-y-6 p-6">
          <h3 className="eyebrow">Tu prestamo</h3>
          <NumberField label="Capital pendiente" value={principal} min={0} max={800000} step={500} unit="€" decimals={2} hardMax={10000000} onChange={setPrincipal} />
          <NumberField label="Tipo de interés" value={rate} min={0.5} max={8} step={0.05} unit="%" decimals={2} hardMax={25} onChange={setRate} />
          <NumberField label="Años restantes" value={years} min={3} max={40} step={1} unit="años" decimals={0} hardMax={50} onChange={setYears} />
          <NumberField label="Amortización extra fija" value={extraPayment} min={0} max={2000} step={25} unit="€/mes" decimals={2} hardMax={100000} onChange={setExtraPayment} />

          <hr className="border-border" />
          <h3 className="eyebrow">Tu patrimonio</h3>
          <NumberField label="Liquidez" value={store.profile.cash} min={0} max={200000} step={500} unit="€" decimals={2} hardMax={10000000} onChange={(v) => store.setProfile({ ...store.profile, cash: v })} />
          <NumberField label="Otros activos" value={store.profile.otherAssets} min={0} max={500000} step={1000} unit="€" decimals={2} hardMax={10000000} onChange={(v) => store.setProfile({ ...store.profile, otherAssets: v })} />
          <NumberField label="Aportación mensual" value={store.profile.monthlyContribution} min={0} max={5000} step={50} unit="€" decimals={2} hardMax={200000} onChange={(v) => store.setProfile({ ...store.profile, monthlyContribution: v })} />
          <NumberField label="Subida anual de aportación" value={contribGrowth} min={0} max={10} step={0.5} unit="%" decimals={2} hardMax={25} onChange={setContribGrowth} />
          <NumberField label="Gastos mensuales" value={expenses} min={500} max={8000} step={50} unit="€" decimals={2} hardMax={200000} onChange={setExpenses} />

          <hr className="border-border" />
          <h3 className="eyebrow">Supuestos</h3>
          <NumberField label="Rentabilidad anual supuesta" value={er} min={-20} max={20} step={.1} unit="%" decimals={2} onChange={setEr} />
          <NumberField label="Volatilidad anual supuesta" value={vol} min={0} max={50} step={.1} unit="%" decimals={2} onChange={setVol} />
          <NumberField label="Inflación" value={inflation} min={0} max={6} step={0.1} unit="%" decimals={2} hardMax={20} onChange={setInflation} />
          <NumberField label="Impuesto sobre plusvalías" value={taxRate} min={0} max={30} step={1} unit="%" decimals={2} onChange={setTaxRate} />
          <NumberField label="Ahorro destinado a amortizar" value={share * 100} min={0} max={100} step={5} unit="%" decimals={1} onChange={(v) => setShare(v / 100)} />
          <NumberField
            label="Simulaciones Monte Carlo"
            value={mcPaths}
            min={1}
            max={100000}
            step={100}
            unit="rutas"
            decimals={0}
            onChange={(v) => setMcPaths(Math.max(1, Math.round(v)))}
          />

          <div className="flex items-center justify-between rounded-xl bg-surface-2 p-4">
            <div>
              <p className="text-sm font-medium">Euros de hoy</p>
              <p className="text-xs text-muted-foreground">Ajustar por inflación</p>
            </div>
            <Switch checked={realTerms} onCheckedChange={setRealTerms} />
          </div>

          <div className="space-y-2 rounded-xl bg-surface-2 p-4">
            <p className="text-xs text-muted-foreground">Cartera activa</p>
            <select
              value={store.activeId}
              onChange={(e) => store.setActiveId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium"
              aria-label="Seleccionar cartera activa"
            >
              {store.portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {stats?.assets.length ?? 0} activos · {er.toFixed(1)}% supuesto · Sharpe{" "}
              {(stats?.sharpe ?? 0).toFixed(2)}
            </p>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link to="/portfolio-lab">Editar en Portfolio Lab</Link>
            </Button>
          </div>
        </aside>

        <Tabs
          defaultValue="resumen"
          className="space-y-6"
          onValueChange={(v) => {
            markSimStart();
            if (v === "proyeccion" || v === "estrategias") markSimComplete();
          }}
        >
          <TabsList className="flex w-full flex-wrap justify-start">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="proyeccion">Proyección</TabsTrigger>
            <TabsTrigger value="estrategias">Estrategias</TabsTrigger>
            <TabsTrigger value="prestamo">Prestamo</TabsTrigger>
            <TabsTrigger value="salud">Salud financiera</TabsTrigger>
          </TabsList>

          {/* -------- Resumen -------- */}
          <TabsContent value="resumen" className="space-y-6">
            <div className="surface-card overflow-hidden">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border p-6">
                <div>
                  <h3 className="font-display text-xl">Patrimonio vs deuda</h3>
                  <p className="text-sm text-muted-foreground">
                    Proyección con las hipótesis elegidas; cartera seleccionada:{" "}
                    <span className="text-foreground">{store.active?.name}</span>
                  </p>
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <p className="text-xs text-muted-foreground">Cartera = deuda</p>
                    <p className="font-semibold text-brand first-letter:uppercase">
                      {dateFromMonth(run.crossoverMonth)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Prestamo cancelado</p>
                    <p className="font-semibold first-letter:uppercase">{dateFromMonth(run.payoffMonth)}</p>
                  </div>
                </div>
              </div>
              <div className="h-[340px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
                    <defs>
                      <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--gain)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--gain)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="year" type="number" domain={[0, "dataMax"]} tickCount={7} tickFormatter={(v: number) => `${Math.round(v)} a`} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={52} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [eur(v), n]} labelFormatter={(l: number) => `Año ${Math.round(l)}`} />
                    <Area type="monotone" dataKey="Patrimonio" stroke="var(--gain)" strokeWidth={2.5} fill="url(#nwFill)" />
                    <Line type="monotone" dataKey="Deuda" stroke="var(--debt)" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="Neto" stroke="var(--brand)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                    {cross ? (
                      <ReferenceDot x={+(cross.month / 12).toFixed(2)} y={Math.round(cross.debt)} r={7} fill="var(--gain)" stroke="var(--background)" strokeWidth={3} isFront />
                    ) : null}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              {run.crossoverMonth !== null ? (
                <div className="animate-rise m-4 mt-0 flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/10 p-4">
                  <Trophy className="mt-0.5 size-5 shrink-0 text-brand" />
                  <div>
                    <p className="font-semibold text-brand">
                      Tu cartera igualará la deuda en {monthsLabel(run.crossoverMonth)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      En <span className="first-letter:uppercase">{dateFromMonth(run.crossoverMonth)}</span>{" "}
                      podrías cancelar el prestamo ({eur(cross?.debt ?? 0)}) con tu patrimonio invertido.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="surface-card p-5">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Distribución del patrimonio
                </p>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                        {allocation.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [eur(v), n]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {allocation.map((a, idx) => (
                    <li key={a.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        {a.name}
                      </span>
                      <span className="tabular-nums text-foreground">{eur(a.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <StatCard label="Intereses futuros" value={eur(run.interest)} hint="Con el plan actual" icon={Banknote} accent="debt" />
              <StatCard label="Patrimonio neto proyectado" value={fmt(run.finalNet)} hint={`En ${years} años${realTerms ? " · euros de hoy" : ""}`} icon={Coins} accent="brand" />
            </div>
          </TabsContent>

          {/* -------- Proyección -------- */}
          <TabsContent value="proyeccion" className="space-y-6">
            <FeatureGate capability="canRunMonteCarlo">
            <div className="surface-card overflow-hidden">
              <div className="border-b border-border p-6">
                <h3 className="font-display text-xl">Bandas de probabilidad (Monte Carlo)</h3>
                <p className="text-sm text-muted-foreground">
                  {mcPaths.toLocaleString("es-ES")} simulaciones con {er.toFixed(1)}% de rentabilidad y{" "}
                  {vol.toFixed(1)}% de volatilidad.
                </p>
              </div>
              <div className="h-[320px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bands.data} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
                    <defs>
                      <linearGradient id="mcBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="year" tickFormatter={(v: number) => `${Math.round(v)} a`} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={52} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [eur(v), n]} labelFormatter={(l: number) => `Año ${Math.round(Number(l))}`} />
                    <Area type="monotone" dataKey="p90" stroke="none" fill="url(#mcBand)" name="Escenario optimista" />
                    <Area type="monotone" dataKey="p10" stroke="none" fill="var(--background)" name="Escenario pesimista" />
                    <Area type="monotone" dataKey="p50" stroke="var(--brand)" strokeWidth={2.5} fill="none" name="Mediana" />
                    <Area type="monotone" dataKey="debt" stroke="var(--debt)" strokeWidth={2} fill="none" name="Deuda" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Escenario pesimista (P10)" value={fmt(bands.p10)} hint="1 de cada 10 casos por debajo" accent="debt" />
              <StatCard label="Escenario medio (P50)" value={fmt(bands.p50)} hint="Resultado central" accent="brand" />
              <StatCard label="Escenario optimista (P90)" value={fmt(bands.p90)} hint="1 de cada 10 casos por encima" />
              <StatCard label="Probabilidad de cubrir la deuda" value={`${Math.round(bands.successRate * 100)}%`} hint="Cartera final ≥ capital pendiente" icon={Target} accent="brand" />
            </div>

            <div className="surface-card p-6">
              <div className="flex items-center gap-2">
                <Flag className="size-4 text-brand" />
                <h3 className="eyebrow">Independencia financiera (regla del 4%)</h3>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Capital objetivo</p>
                  <p className="text-xl font-semibold tabular-nums">{eur(freedom.target)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Momento estimado</p>
                  <p className="text-xl font-semibold first-letter:uppercase">{dateFromMonth(freedom.month)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tiempo restante</p>
                  <p className="text-xl font-semibold">{monthsLabel(freedom.month)}</p>
                </div>
              </div>
            </div>
            </FeatureGate>
          </TabsContent>

          {/* -------- Estrategias -------- */}
          <TabsContent value="estrategias" className="space-y-6">
            <div className="surface-card overflow-hidden">
              <div className="border-b border-border p-6">
                <h3 className="font-display text-xl">Amortizar vs invertir</h3>
                <p className="text-sm text-muted-foreground">
                  Patrimonio neto tras impuestos al final del horizonte. Mejor opción simulada:{" "}
                  <span className="text-brand">{best.name}</span>.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground uppercase">
                    <tr className="border-b border-border">
                      <th className="p-4 text-left font-medium">Estrategia</th>
                      <th className="p-4 text-right font-medium">Intereses</th>
                      <th className="p-4 text-right font-medium">Prestamo cancelado</th>
                      <th className="p-4 text-right font-medium">Cartera final</th>
                      <th className="p-4 text-right font-medium">Neto tras impuestos</th>
                      <th className="p-4 text-right font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategies.map((s) => (
                      <tr key={s.id} className="border-b border-border/60 last:border-0">
                        <td className="p-4 font-medium">{s.name}</td>
                        <td className="p-4 text-right tabular-nums text-debt">{eur(s.run.interest)}</td>
                        <td className="p-4 text-right tabular-nums first-letter:uppercase">
                          {monthsLabel(s.run.payoffMonth)}
                        </td>
                        <td className="p-4 text-right tabular-nums">{fmt(s.run.finalPortfolio)}</td>
                        <td className={`p-4 text-right font-semibold tabular-nums ${s.id === best.id ? "text-brand" : ""}`}>
                          {fmt(s.run.netAfterTax)}
                        </td>
                        <td className="p-4 text-right">
                          <Button size="sm" variant={share === s.share ? "default" : "outline"} onClick={() => setShare(s.share)}>
                            Aplicar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="surface-card p-4">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={strategies.map((s) => ({ name: s.name, Neto: Math.round(s.run.netAfterTax / deflator) }))} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} interval={0} height={50} />
                    <YAxis tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={52} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [eur(v), "Neto"]} />
                    <Bar dataKey="Neto" fill="var(--brand)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* -------- Prestamo -------- */}
          <TabsContent value="prestamo" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Cuota mensual" value={eur(run.payment)} hint={`${rate.toFixed(2)}% a ${years} años`} icon={Landmark} />
              <StatCard label="Intereses totales" value={eur(run.interest)} hint="Con amortizaciones incluidas" accent="debt" icon={Banknote} />
              <StatCard label="Ahorro vs plan base" value={eur(Math.max(0, strategies[0]!.run.interest - run.interest))} hint="Intereses evitados frente a solo invertir" accent="brand" icon={Trophy} />
            </div>
            <div className="surface-card overflow-hidden">
              <div className="border-b border-border p-6">
                <h3 className="font-display text-xl">Cuadro de amortización anual</h3>
                <p className="text-sm text-muted-foreground">Intereses y capital amortizado año a año.</p>
              </div>
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface-2 text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="p-3 text-left font-medium">Año</th>
                      <th className="p-3 text-right font-medium">Intereses</th>
                      <th className="p-3 text-right font-medium">Capital</th>
                      <th className="p-3 text-right font-medium">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amort.map((r) => (
                      <tr key={r.year} className="border-b border-border/60 last:border-0">
                        <td className="p-3">{r.year}</td>
                        <td className="p-3 text-right tabular-nums text-debt">{eur(r.interest)}</td>
                        <td className="p-3 text-right tabular-nums">{eur(r.principal)}</td>
                        <td className="p-3 text-right tabular-nums font-medium">{eur(r.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* -------- Salud financiera -------- */}
          <TabsContent value="salud" className="space-y-6">
            <FeatureGate capability="canUseWealthScore">
            <div className="surface-card p-6">
              <div className="flex items-center gap-3">
                <HeartPulse className="size-5 text-brand" />
                <div>
                  <h3 className="font-display text-xl">Health Score financiero</h3>
                  <p className="text-sm text-muted-foreground">
                    Puntuación global sobre 100 según liquidez, deuda, ahorro y diversificación.
                  </p>
                </div>
                <p className="ml-auto text-4xl font-semibold tabular-nums text-brand">{health.total}</p>
              </div>
              <div className="mt-6 space-y-4">
                {health.parts.map((p) => (
                  <div key={p.label}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{p.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {Math.round(p.score)} / {p.max}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${(p.score / p.max) * 100}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Colchón de emergencia" value={`${health.emergencyMonths.toFixed(1)} meses`} hint="Recomendado: 6 meses" icon={PiggyBank} />
              <StatCard label="Cobertura de la deuda" value={`${Math.round(health.coverage * 100)}%`} hint="Activos líquidos frente al prestamo" icon={Target} accent="brand" />
              <StatCard label="Peso de la cuota" value={`${Math.round(health.dti * 100)}%`} hint="Cuota sobre tu flujo mensual" icon={Landmark} accent="debt" />
            </div>
            </FeatureGate>
          </TabsContent>
        </Tabs>
      </div>

      <p className="text-xs text-muted-foreground">
        Simulaciones educativas basadas en supuestos. No constituyen asesoramiento financiero personalizado.
      </p>
    </div>
  );
}
