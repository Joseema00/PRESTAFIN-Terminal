/**
 * Backtesting de la cartera con las series históricas reales de sus activos
 * (rebalanceo mensual sobre la ventana común disponible).
 */
import type { MarketBundle } from "./bundle";
import type { HydratedAsset } from "./hydrate";

export type PortfolioHistory = {
  months: { d: string; value: number }[];
  /** Rendimientos mensuales reales de la cartera. */
  returns: number[];
  cagr: number;
  vol: number;
  maxDrawdown: number;
  /** Peor y mejor ventana de 12 meses observada, %. */
  worst12m: number;
  best12m: number;
  /** VaR/CVaR empíricos anualizados a partir de meses reales, %. */
  var95: number;
  cvar95: number;
  positiveMonths: number;
  from: string;
  to: string;
  coverage: number;
};

export function backtestPortfolio(
  assets: HydratedAsset[],
  weights: number[],
  bundle: MarketBundle | null,
): PortfolioHistory | null {
  if (!bundle) return null;
  const series = new Map<string, Map<string, number>>();
  for (const a of bundle.assets) {
    if (!a.ok || !a.monthly?.length) continue;
    const m = new Map<string, number>();
    for (const p of a.monthly) m.set(p.d.slice(0, 7), p.a);
    series.set(a.symbol, m);
  }

  const used: { map: Map<string, number>; w: number }[] = [];
  let covered = 0;
  assets.forEach((a, i) => {
    const w = weights[i] ?? 0;
    const map = a.symbol ? series.get(a.symbol) : undefined;
    if (map && w > 0) {
      used.push({ map, w });
      covered += w;
    }
  });
  if (!used.length || covered <= 0) return null;

  const common = [...used[0]!.map.keys()]
    .filter((k) => used.every((u) => u.map.has(k)))
    .sort();
  if (common.length < 13) return null;

  const norm = used.map((u) => ({ ...u, w: u.w / covered }));
  const rets: number[] = [];
  const path: { d: string; value: number }[] = [{ d: common[0]!, value: 100 }];
  for (let i = 1; i < common.length; i++) {
    let r = 0;
    for (const u of norm) {
      const prev = u.map.get(common[i - 1]!)!;
      const cur = u.map.get(common[i]!)!;
      if (prev > 0) r += u.w * (cur / prev - 1);
    }
    rets.push(r);
    path.push({ d: common[i]!, value: path[path.length - 1]!.value * (1 + r) });
  }

  let peak = -Infinity;
  let mdd = 0;
  for (const p of path) {
    peak = Math.max(peak, p.value);
    mdd = Math.min(mdd, p.value / peak - 1);
  }

  const years = rets.length / 12;
  const growth = path[path.length - 1]!.value / path[0]!.value;
  const cagr = (growth ** (1 / years) - 1) * 100;
  const m = rets.reduce((a, b) => a + b, 0) / rets.length;
  const vol =
    Math.sqrt(rets.reduce((s, x) => s + (x - m) ** 2, 0) / (rets.length - 1)) * Math.sqrt(12) * 100;

  const rolling: number[] = [];
  for (let i = 11; i < path.length; i++) {
    rolling.push((path[i]!.value / path[i - 11]!.value - 1) * 100);
  }
  const sorted = [...rets].sort((a, b) => a - b);
  const idx = Math.max(0, Math.floor(sorted.length * 0.05) - 1);
  const var95 = (sorted[idx] ?? 0) * 100;
  const tail = sorted.slice(0, idx + 1);
  const cvar95 = (tail.reduce((a, b) => a + b, 0) / Math.max(1, tail.length)) * 100;

  return {
    months: path,
    returns: rets,
    cagr,
    vol,
    maxDrawdown: mdd * 100,
    worst12m: rolling.length ? Math.min(...rolling) : 0,
    best12m: rolling.length ? Math.max(...rolling) : 0,
    var95,
    cvar95,
    positiveMonths: rets.filter((r) => r > 0).length / rets.length,
    from: common[0]!,
    to: common[common.length - 1]!,
    coverage: covered,
  };
}
