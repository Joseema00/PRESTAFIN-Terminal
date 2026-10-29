import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, FileText, Loader2, Lock, ShieldCheck } from "lucide-react";
import isotipoUrl from "@/assets/isotipo.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NumberField } from "@/components/app/number-field";
import { useAuth } from "@/hooks/use-auth";
import { useBenchmarkSeries, useMarketData } from "@/hooks/use-market-data";
import { usePortfolios } from "@/hooks/use-portfolios";
import { useSubscription } from "@/hooks/use-subscription";
import { resolve } from "@/lib/portfolio";
import { buildReportData } from "@/lib/report/build";
import { reportFileName, renderReportPdf } from "@/lib/report/pdf";
import { reportSectionsFor, UPGRADE_HINTS, type ReportSectionKey } from "@/lib/report/sections";
import type { Plan } from "@/lib/plans";

const SECTION_LABEL: Record<ReportSectionKey, string> = {
  basic_summary: "Resumen ejecutivo y KPIs",
  situation: "Situación patrimonial y Health Score",
  mortgage_basic: "Datos del préstamo y calendario",
  mortgage_analysis: "Análisis de amortización por años",
  portfolio_basic: "Composición de la cartera",
  portfolio_analysis: "Rentabilidad, riesgo y correlaciones",
  portfolio_history: "Backtest histórico, drawdowns y años naturales",
  portfolio_benchmark: "Comparación contra índice de referencia",
  portfolio_costs: "Exposición por divisa e impacto de costes",
  portfolio_quality: "Puntuación de calidad de la cartera",
  risk_parity: "Cartera de paridad de riesgo",
  advanced_metrics: "Métricas avanzadas (Sharpe, Sortino, VaR)",
  portfolio_optimization: "Optimización Markowitz y frontera eficiente",
  scenario_analysis: "Comparativa amortizar vs invertir",
  monte_carlo: "Simulación Monte Carlo",
  advanced_projections: "Proyección patrimonial avanzada",
  basic_action_plan: "Plan de acción básico",
  advanced_action_plan: "Plan de acción avanzado y seguimiento",
  conclusion: "Conclusión y supuestos",
  upgrade_note: "Nota sobre secciones no incluidas",
};

async function logoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(isotipoUrl);
    const blob = await res.blob();
    return await new Promise<string>((ok, err) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result));
      r.onerror = () => err(new Error("logo"));
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const BENCHMARK = { symbol: "IWDA.AS", label: "MSCI World (IWDA)" };

export function ReportPanel({recipient}:{recipient?:{name:string;email:string|null}} = {}) {
  const { user } = useAuth();
  const { plan, planName, loading } = useSubscription();
  const store = usePortfolios();
  const { active } = store;
  const [paths, setPaths] = useState(2000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolved = useMemo(
    () => (active ? resolve(active) : { assets: [], amounts: [] }),
    [active],
  );
  const market = useMarketData(resolved.assets);
  const benchmark = useBenchmarkSeries(BENCHMARK.symbol);
  const sections = reportSectionsFor(plan);
  const hints = plan === "pro" ? [] : UPGRADE_HINTS[plan as Exclude<Plan, "pro">];

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = buildReportData({
        plan,
        userName:
          recipient?.name ?? (user?.user_metadata?.["full_name"] as string | undefined) ?? null,
        userEmail: recipient?.email ?? user?.email ?? null,
        mortgage: store.mortgage,
        profile: store.profile,
        settings: store.settings,
        portfolioName: active?.name ?? null,
        universe: market.universe,
        amounts: resolved.amounts,
        montecarloPaths: paths,
        bundle: market.bundle,
        benchmarkLabel: BENCHMARK.label,
        benchmarkSymbol: BENCHMARK.symbol,
        benchmarkMonthly: benchmark.monthly,
      });
      const logo = await logoDataUrl();
      const doc = renderReportPdf(data, { logo });
      doc.save(reportFileName(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido generar el informe.");
    } finally {
      setBusy(false);
    }
  };

  const ready = store.hydrated && !market.isLoading && !loading;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
      <div className="rounded-2xl border border-border bg-card p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="eyebrow">Informe ejecutivo</p>
            <h2 className="mt-3 font-display text-2xl">Tu análisis patrimonial en PDF</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Generamos un documento profesional con tus datos reales: patrimonio, préstamo,
              cartera, escenarios y plan de acción. Nada se inventa: si un dato no está calculado,
              el informe lo indica.
            </p>
          </div>
          <Badge variant="secondary">Plan {planName}</Badge>
        </div>

        <div className="mt-8 max-w-sm">
          <NumberField
            label="Rutas de simulación Monte Carlo"
            value={paths}
            onChange={setPaths}
            min={200}
            max={20000}
            step={100}
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button size="lg" onClick={generate} disabled={busy || !ready}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {busy ? "Generando informe…" : "Descargar informe PDF"}
          </Button>
          {!ready && (
            <span className="text-xs text-muted-foreground">Cargando tus datos y series de mercado…</span>
          )}
        </div>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          El informe se genera en tu dispositivo con los datos de tu cuenta.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8">
        <h3 className="font-display text-lg">Incluido en tu plan</h3>
        <ul className="mt-5 space-y-2.5 text-sm">
          {sections
            .filter((s) => s !== "upgrade_note")
            .map((s) => (
              <li key={s} className="flex gap-2.5 text-muted-foreground">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                <span>{SECTION_LABEL[s]}</span>
              </li>
            ))}
        </ul>

        {hints.length > 0 && (
          <div className="mt-8 border-t border-border pt-6">
            <h4 className="text-sm font-medium">Disponible al subir de plan</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {hints.map((h) => (
                <li key={h} className="flex gap-2.5 text-muted-foreground">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/suscripcion">Ver planes</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
