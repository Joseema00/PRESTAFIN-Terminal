import type { Capability,LimitKey,Plan } from '../src/lib/plans';
// Compatibility adapter for the shared analysis components. No billing or tier gates.
export function useSubscription(){return {plan:'pro' as Plan,planName:'Terminal',status:'local',subscription:null,isActive:true,isPastDue:false,loading:false,environment:'local',can:(_capability:Capability)=>true,limit:(key:LimitKey)=>key==='portfolios'?250:key==='assetsPerPortfolio'?500:Number.POSITIVE_INFINITY,refresh:()=>{}};}
