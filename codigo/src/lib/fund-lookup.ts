/** ISO 6166 check digit; accepting a code is not confirmation of a fund's identity. */
export function normalizeIsin(value:unknown):string{
 if(typeof value!=='string'||value.length>64)throw new Error('Introduce un ISIN de 12 caracteres.');
 const isin=value.replace(/\s/g,'').toUpperCase();
 if(!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin))throw new Error('El ISIN debe tener 12 caracteres: dos letras de país y su código completo.');
 const digits=isin.replace(/[A-Z]/g,c=>String(c.charCodeAt(0)-55));
 let sum=0;
 for(let i=digits.length-1,j=0;i>=0;i--,j++){let n=Number(digits[i]);if(j%2)n*=2;sum+=n>9?n-9:n;}
 if(sum%10)throw new Error('El dígito de control del ISIN no es válido. Revisa el código.');
 return isin;
}
export type FundProfile={
 isin:string;name:string;currency:string;providerId:string;source:string;checkedAt:string;
 income:'Acumulación'|'Distribución'|'No confirmado';category:string|null;domicile:string|null;
 ongoingCharge:number|null;launchDate:string|null;
};
export type FundLookupResult={ok:true;profile:FundProfile;warning?:string}|{ok:false;error:string};
export const fundSource=(isin:string,currency?:string)=>'https://markets.ft.com/data/funds/tearsheet/summary?s='+encodeURIComponent(isin+(currency?':'+currency:''));
/** Disk and IPC data must not supply arbitrary provider URLs or identifiers. */
export function validateFundProfile(value:unknown):FundProfile{
 const p=value as FundProfile;
 if(!p||normalizeIsin(p.isin)!==p.isin||typeof p.name!=='string'||!p.name.trim()||p.name.length>500||
   !/^[A-Z]{3}$/.test(p.currency)||!/^\d{1,16}$/.test(p.providerId)||
   p.source!==fundSource(p.isin,p.currency)||!Number.isFinite(Date.parse(p.checkedAt))||
   !['Acumulación','Distribución','No confirmado'].includes(p.income)||
   [p.category,p.domicile,p.launchDate].some(v=>v!==null&&(typeof v!=='string'||v.length>300))||
   p.ongoingCharge!==null&&(typeof p.ongoingCharge!=='number'||!Number.isFinite(p.ongoingCharge)||p.ongoingCharge<0||p.ongoingCharge>100))throw new Error('Ficha de fondo no válida.');
 return {isin:p.isin,name:p.name,currency:p.currency,providerId:p.providerId,source:p.source,checkedAt:p.checkedAt,income:p.income,category:p.category,domicile:p.domicile,ongoingCharge:p.ongoingCharge,launchDate:p.launchDate};
}
