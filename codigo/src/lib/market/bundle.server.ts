import { getSeries } from "./store.server";
import {
  alignSeries,
  annualizedReturns,
  annualizedVols,
  computeMetrics,
  correlationMatrix,
  covarianceMatrix,
  toMonthly,
} from "./metrics";
import type { AssetSeries } from "./types";
import type { AssetBundle, MarketBundle, SourceInfo } from "./bundle";
import { lookbackYears, type Lookback } from "./provider-types";

/** Recorta la serie real a la ventana pedida. Nunca añade puntos que no existan. */
function trim(series: AssetSeries, years: number | null): AssetSeries {
  if (!years || !series.points.length) return series;
  const last = series.points[series.points.length - 1]!.d;
  const from = new Date(last);
  from.setFullYear(from.getFullYear() - years);
  const cut = from.toISOString().slice(0, 10);
  const points = series.points.filter((p) => p.d >= cut);
  if (points.length < 13) return series; // ventana insuficiente: se mantiene el histórico completo
  return {
    ...series,
    points,
    dividends: series.dividends.filter((d) => d.d >= cut),
    splits: series.splits.filter((s) => s.d >= cut),
    meta: { ...series.meta, firstDate: points[0]!.d, pointCount: points.length },
  };
}

/**
 * Descarga (o recupera de caché) las series reales de los símbolos pedidos y
 * calcula métricas y matriz de covarianzas SOBRE DATOS HISTÓRICOS REALES.
 */
export async function buildBundle(
  symbols: string[],
  opts: { riskFree: number; force: boolean; lookback?: Lookback },
): Promise<MarketBundle> {
  const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  const results = await Promise.all(unique.map((s) => getSeries(s, "daily", { force: opts.force })));
  const lookback: Lookback = opts.lookback ?? "max";
  const years = lookbackYears(lookback);

  const ok: AssetSeries[] = [];
  const sources: SourceInfo[] = [];
  const assets: AssetBundle[] = results.map((r, i) => {
    const symbol = unique[i]!;
    if (!r.ok) return { symbol, ok: false, error: r.error };
    const series = trim(r.series, years);
    ok.push(series);
    sources.push({
      symbol,
      provider: series.meta.provider,
      providerLabel: series.meta.providerLabel,
      lastDate: series.meta.lastDate,
      fetchedAt: series.meta.fetchedAt,
      quality: series.meta.quality,
      provenance: "REAL",
    });
    const pts = series.points;
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    return {
      symbol,
      ok: true,
      instrument: series.instrument,
      meta: series.meta,
      metrics: computeMetrics(series, { riskFree: opts.riskFree }),
      monthly: toMonthly(pts),
      ...(last
        ? {
            latest: {
              price: last.c,
              date: last.d,
              changePct: prev && prev.c > 0 ? ((last.c - prev.c) / prev.c) * 100 : null,
              currency: series.meta.currency,
            },
          }
        : {}),
    };
  });

  let matrix: MarketBundle["matrix"] = null;
  if (ok.length) {
    const aligned = alignSeries(ok);
    if (aligned.symbols.length && aligned.months >= 12) {
      const cov = covarianceMatrix(aligned);
      matrix = {
        symbols: aligned.symbols,
        annualizedReturns: annualizedReturns(aligned),
        annualizedVols: annualizedVols(cov),
        covariance: cov,
        correlation: correlationMatrix(cov),
        commonStart: aligned.commonStart,
        months: aligned.months,
        limitedBy: aligned.limitedBy,
        dropped: aligned.dropped,
        monthlyReturns: aligned.returns,
      };
    }
  }

  return { assets, matrix, lookback, sources, generatedAt: new Date().toISOString() };
}
