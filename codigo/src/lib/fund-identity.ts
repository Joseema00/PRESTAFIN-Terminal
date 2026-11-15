import type {Holding} from './portfolio';
import {normalizeIsin} from './fund-lookup';
/** Exact provider identifiers checked on 15 November 2026 against the named
 * share class in FT and official CNMV/issuer documents. Never name matching. */
export const VERIFIED_FUND_ALIASES:Record<string,{isin:string;source:string}>={
 '0P0001T8V7.F':{isin:'ES0165243025',source:'https://www.cnmv.es/portal/consultas/iic/fondo?com=0&nif=V16923583&vista=3'},
 '0P0001A94F.F':{isin:'LU1598720172',source:'https://www.cobasam.com/productos/cobas-lux-sicav/lux_large_cap_eur/'}
};
export function holdingFundIsin(h:Holding):string|null{
 if((h.meta?.kind??'').toLowerCase()!=='fondo')return null;
 if(h.meta?.isin?.trim())return normalizeIsin(h.meta.isin);
 const symbol=(h.meta?.symbol??h.assetId.replace(/^market-/, '')).trim().toUpperCase();
 if(/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(symbol))return normalizeIsin(symbol);
 return VERIFIED_FUND_ALIASES[symbol]?.isin??null;
}
