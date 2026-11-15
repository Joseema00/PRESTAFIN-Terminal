import type { MarketBundle, MarketSearchResult } from '../src/lib/market/bundle';
import type { Lookback } from '../src/lib/market/provider-types';
import type { Workspace } from './use-portfolios';
declare global {
  interface Window {
    prestafin?: {
      workspaceIdentity():Promise<{configured:boolean;userId:string|null;storage?:'cloud'|'local'}>;
      confirmReloadWorkspace():Promise<boolean>;
      recoverLegacyWorkspace(owner:string):Promise<boolean>;
      loadWorkspace(owner?:string|null): Promise<Workspace | null>;
      saveWorkspace(value: Workspace,owner?:string|null): Promise<{ savedAt: number }>;
      exportWorkspace(): Promise<boolean>;
      importWorkspace(owner?:string|null): Promise<Workspace | null>;
      marketBundle(input: { symbols: string[]; riskFree: number; lookback?: Lookback; force?: boolean }): Promise<MarketBundle>;
      marketSearch(query: string): Promise<MarketSearchResult>;
      fundLookup(isin:string):Promise<import('../src/lib/fund-lookup').FundLookupResult>;
      fundList():Promise<import('../src/lib/fund-lookup').FundProfile[]>;
      fundHistory(input:{id:string;force?:boolean}):Promise<import('../src/lib/market/types').SeriesResult>;
      billingStatus(): Promise<import('./billing').BillingState>;
      billingRedeemCode(code:string):Promise<boolean>;
      authSignIn(email:string,password:string):Promise<boolean>;
      authSignUp(email:string,password:string):Promise<{confirmationRequired:boolean}>;
      authConfirmEmail(email:string,proof:string):Promise<boolean>;
      authResendConfirmation(email:string):Promise<boolean>;
      authRequestPasswordReset(email:string):Promise<boolean>;
      authResetPassword(email:string,proof:string,password:string):Promise<boolean>;
      billingCheckout(plan:'month'|'year'):Promise<boolean>;
      billingPortal():Promise<boolean>;
      billingLogout():Promise<boolean>;
      appInfo(): Promise<{ version: string; dataPath: string; mode: string }>;
    };
  }
}
export {};
