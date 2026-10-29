import { FUND_DETAILS,fundByIsin } from '../fund-catalog';
import { cleanFundPoints } from '../fund-performance';
import type { ProviderSeries } from './providers.server';
/** Public NAV endpoint used by the issuer's own historical-price download.
 * No credentials, account data, proxy substitution or synthetic return series.
 */
export function parseVanguardHistory(raw:unknown,isin:string):ProviderSeries{
 const product=fundByIsin(isin),details=product&&FUND_DETAILS[product.id];
 if(!product||!details?.portId)throw new Error('Clase sin identificador de histórico del emisor');
 const response=raw as {errors?:unknown[];data?:{funds?:Array<{portId?:string;profile?:{fundCurrency?:string};pricingDetails?:{navPrices?:{items?:Array<{asOfDate:string;price:number;currencyCode:string}>}}}>}};
 if(response.errors?.length)throw new Error('El emisor no pudo servir el histórico');
 const fund=response.data?.funds?.find(f=>f.portId===details.portId),items=fund?.pricingDetails?.navPrices?.items;
 if(fund?.profile?.fundCurrency!=='EUR'||!items?.length||items.some(x=>x.currencyCode!=='EUR'))throw new Error('No se ha confirmado la clase EUR solicitada');
 const points=cleanFundPoints(items.map(x=>({d:x.asOfDate,c:x.price,a:x.price})));
 if(points.length<2)throw new Error('Histórico insuficiente para esta clase');
 return {instrument:{symbol:isin,isin,name:product.name,kind:'Fondo',currency:'EUR',provider:'vanguard',providerId:details.portId},points,dividends:[],splits:[],frequency:'daily',currency:'EUR',adjusted:true};
}
export async function fetchVanguardHistory(isin:string):Promise<ProviderSeries>{
 const p=fundByIsin(isin),details=p&&FUND_DETAILS[p.id];if(!details?.portId)throw new Error('Clase sin cobertura directa del emisor');
 const query='query HistoricalPricesQuery($portIds: [String!]!) { funds(portIds: $portIds) { portId profile { fundCurrency } pricingDetails { navPrices(limit: -1) { items { price currencyCode asOfDate } } } } }';
 const response=await fetch('https://www.vanguard.co.uk/gpx/graphql',{method:'POST',headers:{'content-type':'application/json','accept':'application/json','X-Consumer-ID':'uk2'},body:JSON.stringify({query,variables:{portIds:[details.portId]}}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error(`Histórico del emisor: HTTP ${response.status}`);
 return parseVanguardHistory(await response.json(),isin);
}
