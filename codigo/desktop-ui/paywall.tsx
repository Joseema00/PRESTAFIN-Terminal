import type { ReactNode } from 'react';
import type { Capability, Plan } from '../src/lib/plans';
export function FeatureGate({children}:{children:ReactNode;capability:Capability;compact?:boolean;fallback?:ReactNode}) { return <>{children}</>; }
export function PlanBadge({className}:{className?:string}) { return <span className={className}>Escritorio local</span>; }
export function UpgradeCard(_props:{title?:string;description?:string;plan?:Plan;compact?:boolean;highlights?:string[]}) { return null; }
export function LimitNotice({message}:{message:string;plan?:Plan}) { return <p>{message}</p>; }
