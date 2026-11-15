import {assetById} from './assets';
import {INVESTMENT_PRODUCTS,productById,type ProductRole} from './investment-products';
import type {Holding} from './portfolio';
import type {RiskPosition} from './integrated-risk';

/** Only an exact catalogue identifier or share-class ISIN establishes identity. */
export function holdingProduct(h:Holding){
 const product=productById(h.assetId);if(product)return product;
 const identifier=h.meta?.isin?.trim()||h.meta?.symbol?.trim()||h.assetId.replace(/^market-/, '');
 const isin=identifier.toUpperCase();
 return /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(isin)?INVESTMENT_PRODUCTS.find(p=>p.isin===isin):undefined;
}

export function holdingName(h:Holding){return holdingProduct(h)?.name??h.meta?.name??assetById(h.assetId)?.name??h.assetId;}

/** A manual role is a planning assumption, not a provider-verified fund category. */
export function positionRisk(h:Holding):RiskPosition|null{
 const product=holdingProduct(h);
 if(product)return {id:h.assetId,name:product.name,amount:h.amount,role:product.role,fee:product.fee};
 const asset=assetById(h.assetId),cls=h.meta?.cls??asset?.cls;
 const kind=(h.meta?.kind??asset?.kind??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
 const role:ProductRole|null=h.planningRole??(cls?.startsWith('equity')||cls==='sector'?'equity':cls?.startsWith('bond')?'aggregate':cls==='cash'?'overnight':!cls&&['equity','stock','accion'].includes(kind)?'equity':!cls&&kind==='liquidez'?'overnight':null);
 return role?{id:h.assetId,name:holdingName(h),amount:h.amount,role,fee:asset?.ter??0}:null;
}
