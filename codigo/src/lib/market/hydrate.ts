/**
 * Fusiona el catálogo de activos con los datos históricos reales.
 * Regla de oro: si hay serie real, manda la serie real. Si no la hay, el activo
 * queda marcado como "sin datos" para que la interfaz lo advierta.
 */
import type { Asset } from "@/lib/assets";
import { correlation } from "@/lib/assets";
import type { MarketBundle, AssetBundle } from "./bundle";
import { symbolForAsset } from "./symbols";

export type HydratedAsset = Asset & {
  symbol: string | null;
  /** true si er/vol proceden de la serie histórica real. */
  real: boolean;
  data?: AssetBundle;
};

export type HydratedUniverse = {
  assets: HydratedAsset[];
  cov: number[][];
  corr: number[][];
  /** Activos con datos reales. */
  realCount: number;
  /** Activos sin serie real disponible. */
  missing: { id: string; ticker: string; reason: string }[];
  commonStart: string | null;
  months: number;
  limitedBy: string[];
};

export function symbolsFor(assets: Asset[]): string[] {
  return assets.map(symbolOf).filter((s): s is string => Boolean(s));
}

/** Símbolo real del activo: el propio (búsqueda) o el del catálogo. */
export function symbolOf(a: Asset): string | null {
  return a.symbol ?? symbolForAsset(a.id);
}

export function hydrate(assets: Asset[], bundle: MarketBundle | null | undefined): HydratedUniverse {
  const bySymbol = new Map<string, AssetBundle>();
  for (const b of bundle?.assets ?? []) bySymbol.set(b.symbol, b);
  const matrix = bundle?.matrix ?? null;
  const idx = new Map<string, number>();
  matrix?.symbols.forEach((s, i) => idx.set(s, i));

  const missing: HydratedUniverse["missing"] = [];
  const hydrated: HydratedAsset[] = assets.map((a) => {
    const symbol = symbolOf(a);
    const data = symbol ? bySymbol.get(symbol) : undefined;
    const m = data?.metrics;
    const usable = Boolean(data?.ok && m && m.cagr !== null && m.vol !== null);
    if (!usable && symbol) {
      missing.push({
        id: a.id,
        ticker: a.ticker,
        reason: data?.error ?? (m ? "Histórico insuficiente para calcular métricas" : "Sin datos del proveedor"),
      });
    }
    if (!usable) return { ...a, symbol, real: false, ...(data ? { data } : {}) };
    return {
      ...a,
      symbol,
      real: true,
      er: m!.cagr!,
      vol: m!.vol!,
      yield: m!.dividendYield ?? a.yield,
      data: data!,
    };
  });

  const n = hydrated.length;
  const cov: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const corr: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const ai = hydrated[i]!;
      const aj = hydrated[j]!;
      const mi = ai.symbol ? idx.get(ai.symbol) : undefined;
      const mj = aj.symbol ? idx.get(aj.symbol) : undefined;
      let c: number;
      if (i === j) c = 1;
      else if (matrix && mi !== undefined && mj !== undefined) c = matrix.correlation[mi]![mj]!;
      else c = correlation(ai, aj); // sin histórico común: correlación de referencia por clase
      corr[i]![j] = c;
      cov[i]![j] = (ai.vol / 100) * (aj.vol / 100) * c;
    }
  }

  return {
    assets: hydrated,
    cov,
    corr,
    realCount: hydrated.filter((a) => a.real).length,
    missing,
    commonStart: matrix?.commonStart ?? null,
    months: matrix?.months ?? 0,
    limitedBy: matrix?.limitedBy ?? [],
  };
}
