/**
 * Capa de proveedores de datos de mercado. Cada proveedor implementa la misma
 * interfaz y el motor los recorre por prioridad. Nunca se inventan datos: si
 * ningún proveedor devuelve una serie real, se propaga el error.
 */
import type { DividendPoint, Frequency, Instrument, InstrumentKind, SeriePoint, SplitPoint } from "./types";
import { fundByIsin,FUND_DETAILS } from '../fund-catalog';
import { fetchVanguardHistory } from './fund-provider.server';

export type ProviderSeries = {
  instrument: Instrument;
  points: SeriePoint[];
  dividends: DividendPoint[];
  splits: SplitPoint[];
  frequency: Frequency;
  currency: string;
  adjusted: boolean;
};

export interface DataProvider {
  id: string;
  label: string;
  /** Tipos de instrumento que el proveedor cubre razonablemente bien. */
  supports: (kind?: InstrumentKind) => boolean;
  search(query: string, limit: number): Promise<Instrument[]>;
  history(symbol: string, opts: { frequency: Frequency }): Promise<ProviderSeries>;
}

/* --------------------------- utilidades comunes --------------------------- */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

/** Rate limiting sencillo por proveedor + deduplicación de peticiones en vuelo. */
const lastCall = new Map<string, number>();
const inFlight = new Map<string, Promise<unknown>>();

async function throttle(provider: string, minMs: number) {
  const prev = lastCall.get(provider) ?? 0;
  const wait = prev + minMs - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall.set(provider, Date.now());
}

export function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

async function getJson(url: string, timeoutMs = 12000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const iso = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 10);



/** Deduce la frecuencia real de la serie (el proveedor puede degradarla). */
function inferFrequency(points: SeriePoint[], requested: Frequency): Frequency {
  if (points.length < 5) return requested;
  const gaps: number[] = [];
  for (let i = 1; i < Math.min(points.length, 60); i++) {
    gaps.push((new Date(points[i]!.d).getTime() - new Date(points[i - 1]!.d).getTime()) / 864e5);
  }
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)] ?? 1;
  if (median >= 20) return "monthly";
  if (median >= 5) return "weekly";
  return "daily";
}

/** Normaliza divisas menores (GBp/ZAc/ILA se cotizan en céntimos). */
function normalizeCurrency(currency: string, points: SeriePoint[], dividends: DividendPoint[]) {
  const minor: Record<string, string> = { GBp: "GBP", ZAc: "ZAR", ILA: "ILS" };
  const target = minor[currency];
  if (!target) return { currency, points, dividends };
  const f = 100;
  return {
    currency: target,
    points: points.map((p) => ({
      ...p,
      c: p.c / f,
      a: p.a / f,
      ...(p.o != null ? { o: p.o / f } : {}),
      ...(p.h != null ? { h: p.h / f } : {}),
      ...(p.l != null ? { l: p.l / f } : {}),
    })),
    dividends: dividends.map((d) => ({ ...d, amount: d.amount / f })),
  };
}

/* ------------------------------ Yahoo Finance ----------------------------- */

const YAHOO_KIND: Record<string, InstrumentKind> = {
  EQUITY: "Acción",
  ETF: "ETF",
  MUTUALFUND: "Fondo",
  INDEX: "Índice",
  CRYPTOCURRENCY: "Cripto",
  CURRENCY: "Divisa",
  FUTURE: "Materia prima",
  COMMODITY: "Materia prima",
};

const YAHOO_INTERVAL: Record<Frequency, string> = {
  daily: "1d",
  weekly: "1wk",
  monthly: "1mo",
};

type YahooQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchange?: string;
  exchDisp?: string;
  typeDisp?: string;
  isin?: string;
};

export const yahooProvider: DataProvider = {
  id: "yahoo",
  label: "Yahoo Finance",
  supports: () => true,
  async search(query, limit) {
    await throttle("yahoo", 120);
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      query,
    )}&quotesCount=${limit}&newsCount=0&enableFuzzyQuery=true`;
    const data = (await getJson(url)) as { quotes?: YahooQuote[] };
    const quotes = data.quotes ?? [];
    return quotes
      .filter((q) => q.symbol)
      .map<Instrument>((q) => ({
        symbol: q.symbol!,
        name: q.longname ?? q.shortname ?? q.symbol!,
        shortName: q.shortname ?? null,
        kind: YAHOO_KIND[q.quoteType ?? ""] ?? "Otro",
        isin: q.isin ?? null,
        exchange: q.exchDisp ?? q.exchange ?? null,
        currency: "",
        provider: "yahoo",
        providerId: q.symbol!,
      }));
  },
  async history(symbol, { frequency }) {
    await throttle("yahoo", 150);
    const interval = YAHOO_INTERVAL[frequency];
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol,
    )}?period1=0&period2=9999999999&interval=${interval}&events=div%2Csplit&includeAdjustedClose=true`;
    const data = (await getJson(url)) as {
      chart?: {
        error?: { description?: string } | null;
        result?: Array<{
          meta: Record<string, unknown>;
          timestamp?: number[];
          indicators: {
            quote?: Array<{ open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }>;
            adjclose?: Array<{ adjclose?: (number | null)[] }>;
          };
          events?: {
            dividends?: Record<string, { amount: number; date: number }>;
            splits?: Record<string, { numerator: number; denominator: number; date: number }>;
          };
        }>;
      };
    };
    const err = data.chart?.error?.description;
    if (err) throw new Error(err);
    const r = data.chart?.result?.[0];
    if (!r || !r.timestamp?.length) throw new Error("El proveedor no devolvió serie histórica");

    const q = r.indicators.quote?.[0] ?? {};
    const adj = r.indicators.adjclose?.[0]?.adjclose;
    const points: SeriePoint[] = [];
    for (let i = 0; i < r.timestamp.length; i++) {
      const close = q.close?.[i];
      if (close == null || !Number.isFinite(close)) continue; // hueco real: no se rellena
      const point: SeriePoint = {
        d: iso(r.timestamp[i]!),
        c: close,
        a: adj?.[i] ?? close,
      };
      const o = q.open?.[i];
      const h = q.high?.[i];
      const l = q.low?.[i];
      const v = q.volume?.[i];
      if (o != null) point.o = o;
      if (h != null) point.h = h;
      if (l != null) point.l = l;
      if (v != null) point.v = v;
      points.push(point);
    }
    if (points.length < 2) throw new Error("Histórico insuficiente en el proveedor");

    const dividends: DividendPoint[] = Object.values(r.events?.dividends ?? {})
      .map((d) => ({ d: iso(d.date), amount: d.amount }))
      .sort((a, b) => (a.d < b.d ? -1 : 1));
    const splits: SplitPoint[] = Object.values(r.events?.splits ?? {})
      .map((s) => ({ d: iso(s.date), ratio: `${s.numerator}:${s.denominator}` }))
      .sort((a, b) => (a.d < b.d ? -1 : 1));

    const meta = r.meta;
    const instrument: Instrument = {
      symbol: (meta["symbol"] as string) ?? symbol,
      name: (meta["longName"] as string) ?? (meta["shortName"] as string) ?? symbol,
      shortName: (meta["shortName"] as string) ?? null,
      kind: YAHOO_KIND[(meta["instrumentType"] as string) ?? ""] ?? "Otro",
      exchange: (meta["fullExchangeName"] as string) ?? null,
      currency: (meta["currency"] as string) ?? "USD",
      provider: "yahoo",
      providerId: symbol,
    };

    const norm = normalizeCurrency(instrument.currency, points, dividends);
    instrument.currency = norm.currency;
    return {
      instrument,
      points: norm.points,
      dividends: norm.dividends,
      splits,
      frequency: inferFrequency(norm.points, frequency),
      currency: norm.currency,
      adjusted: Boolean(adj),
    };
  },
};

/** Réplica sobre el host alternativo de Yahoo: cubre cortes puntuales de query2. */
export const yahooMirrorProvider: DataProvider = {
  ...yahooProvider,
  id: "yahoo-mirror",
  label: "Yahoo Finance (secundario)",
  async search(query, limit) {
    await throttle("yahoo-mirror", 150);
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      query,
    )}&quotesCount=${limit}&newsCount=0`;
    const data = (await getJson(url)) as { quotes?: YahooQuote[] };
    return (data.quotes ?? [])
      .filter((q) => q.symbol)
      .map<Instrument>((q) => ({
        symbol: q.symbol!,
        name: q.longname ?? q.shortname ?? q.symbol!,
        shortName: q.shortname ?? null,
        kind: YAHOO_KIND[q.quoteType ?? ""] ?? "Otro",
        isin: q.isin ?? null,
        exchange: q.exchDisp ?? q.exchange ?? null,
        currency: "",
        provider: "yahoo-mirror",
        providerId: q.symbol!,
      }));
  },
  async history(symbol, { frequency }) {
    await throttle("yahoo-mirror", 200);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol,
    )}?period1=0&period2=9999999999&interval=${YAHOO_INTERVAL[frequency]}&events=div%2Csplit&includeAdjustedClose=true`;
    const raw = (await getJson(url)) as unknown;
    // Reutiliza el parser de Yahoo inyectando la respuesta ya descargada.
    return parseYahooChart(symbol, frequency, raw, "yahoo-mirror");
  },
};

function parseYahooChart(
  symbol: string,
  frequency: Frequency,
  raw: unknown,
  providerId: string,
): ProviderSeries {
  const data = raw as Parameters<typeof JSON.stringify>[0] as {
    chart?: { error?: { description?: string } | null; result?: unknown[] };
  };
  if (data.chart?.error?.description) throw new Error(data.chart.error.description);
  const clone = { chart: data.chart } as never;
  // Delegación: se replica la lógica principal a través de yahooProvider.
  const parsed = yahooParse(clone, symbol, frequency);
  parsed.instrument.provider = providerId;
  return parsed;
}

/** Parser compartido (extraído para poder reutilizarlo entre hosts). */
function yahooParse(data: never, symbol: string, frequency: Frequency): ProviderSeries {
  const d = data as unknown as {
    chart?: { result?: Array<Record<string, never>> };
  };
  const r = d.chart?.result?.[0] as unknown as {
    meta: Record<string, unknown>;
    timestamp?: number[];
    indicators: {
      quote?: Array<{ open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }>;
      adjclose?: Array<{ adjclose?: (number | null)[] }>;
    };
    events?: {
      dividends?: Record<string, { amount: number; date: number }>;
      splits?: Record<string, { numerator: number; denominator: number; date: number }>;
    };
  };
  if (!r?.timestamp?.length) throw new Error("El proveedor no devolvió serie histórica");
  const q = r.indicators.quote?.[0] ?? {};
  const adj = r.indicators.adjclose?.[0]?.adjclose;
  const points: SeriePoint[] = [];
  for (let i = 0; i < r.timestamp.length; i++) {
    const close = q.close?.[i];
    if (close == null || !Number.isFinite(close)) continue;
    points.push({ d: iso(r.timestamp[i]!), c: close, a: adj?.[i] ?? close });
  }
  if (points.length < 2) throw new Error("Histórico insuficiente en el proveedor");
  const dividends = Object.values(r.events?.dividends ?? {})
    .map((x) => ({ d: iso(x.date), amount: x.amount }))
    .sort((a, b) => (a.d < b.d ? -1 : 1));
  const splits = Object.values(r.events?.splits ?? {})
    .map((s) => ({ d: iso(s.date), ratio: `${s.numerator}:${s.denominator}` }))
    .sort((a, b) => (a.d < b.d ? -1 : 1));
  const rawCurrency = (r.meta["currency"] as string) ?? "USD";
  const norm = normalizeCurrency(rawCurrency, points, dividends);
  const currency = norm.currency;
  return {
    instrument: {
      symbol: (r.meta["symbol"] as string) ?? symbol,
      name: (r.meta["longName"] as string) ?? (r.meta["shortName"] as string) ?? symbol,
      shortName: (r.meta["shortName"] as string) ?? null,
      kind: YAHOO_KIND[(r.meta["instrumentType"] as string) ?? ""] ?? "Otro",
      exchange: (r.meta["fullExchangeName"] as string) ?? null,
      currency,
      provider: "yahoo",
      providerId: symbol,
    },
    points: norm.points,
    dividends: norm.dividends,
    splits,
    frequency: inferFrequency(norm.points, frequency),
    currency,
    adjusted: Boolean(adj),
  };
}

/* ---------------------------- Registro y cadena --------------------------- */

export const PROVIDERS: DataProvider[] = [yahooProvider, yahooMirrorProvider];

export type ChainResult =
  | { ok: true; series: ProviderSeries; provider: string; attempts: string[] }
  | { ok: false; error: string; attempts: string[] };

/** Recorre los proveedores por prioridad hasta obtener datos reales. */
export async function fetchHistoryChain(
  symbol: string,
  frequency: Frequency,
  kind?: InstrumentKind,
): Promise<ChainResult> {
  const attempts: string[] = [];
  const fund=fundByIsin(symbol);
  if(fund&&FUND_DETAILS[fund.id]?.portId){
    try{return {ok:true,series:await fetchVanguardHistory(symbol),provider:'vanguard',attempts:['vanguard']};}
    catch(e){return {ok:false,error:e instanceof Error?e.message:String(e),attempts:['vanguard']};}
  }
  if(fund){
    const matches=await searchChain(symbol,12),exact=matches.find(x=>x.isin===symbol&&x.kind==='Fondo');
    if(!exact||exact.symbol===symbol)return {ok:false,error:'El proveedor no identifica la clase exacta '+symbol+'. No se sustituye por otra clase.',attempts:['identity-check']};
    const result=await fetchHistoryChain(exact.symbol,frequency,'Fondo');
    if(result.ok){if(result.series.currency!=='EUR'||result.series.instrument.kind!=='Fondo')return {ok:false,error:'La divisa o el tipo de instrumento no coincide con la clase solicitada.',attempts:result.attempts};result.series.instrument={...result.series.instrument,symbol,isin:symbol,name:fund.name};}
    return result;
  }
  let lastError = "Sin proveedores disponibles";
  for (const p of PROVIDERS) {
    if (!p.supports(kind)) continue;
    attempts.push(p.id);
    try {
      const series = await dedupe(`${p.id}:${symbol}:${frequency}`, () =>
        p.history(symbol, { frequency }),
      );
      return { ok: true, series, provider: p.id, attempts };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, error: lastError, attempts };
}

export async function searchChain(query: string, limit = 12): Promise<Instrument[]> {
  for (const p of PROVIDERS) {
    try {
      const res = await dedupe(`search:${p.id}:${query}`, () => p.search(query, limit));
      if (res.length) return res;
    } catch {
      /* siguiente proveedor */
    }
  }
  return [];
}

/* ---------------------------------- FX ------------------------------------ */

/** Tipo de cambio real (BCE vía Frankfurter). Sin dato → null, nunca 1 por defecto. */
export async function fetchFxRate(
  base: string,
  quote: string,
): Promise<{ rate: number; date: string; provider: string } | null> {
  if (base === quote) return { rate: 1, date: new Date().toISOString().slice(0, 10), provider: "identity" };
  try {
    await throttle("frankfurter", 200);
    const data = (await getJson(
      `https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${quote}`,
    )) as { date?: string; rates?: Record<string, number> };
    const rate = data.rates?.[quote];
    if (!rate) return null;
    return { rate, date: data.date ?? new Date().toISOString().slice(0, 10), provider: "frankfurter" };
  } catch {
    return null;
  }
}
