import type { MarketBundle, MarketSearchResult } from '../src/lib/market/bundle';
import type { Lookback } from '../src/lib/market/provider-types';
import type { Workspace } from './use-portfolios';
declare global {
  interface Window {
    prestafin?: {
      loadWorkspace(): Promise<Workspace | null>;
      saveWorkspace(value: Workspace): Promise<{ savedAt: number }>;
      exportWorkspace(): Promise<boolean>;
      importWorkspace(): Promise<Workspace | null>;
      marketBundle(input: { symbols: string[]; riskFree: number; lookback?: Lookback; force?: boolean }): Promise<MarketBundle>;
      marketSearch(query: string): Promise<MarketSearchResult>;
      fundHistory(input:{id:string;force?:boolean}):Promise<import('../src/lib/market/types').SeriesResult>;
      appInfo(): Promise<{ version: string; dataPath: string; mode: string }>;
    };
  }
}
export {};
