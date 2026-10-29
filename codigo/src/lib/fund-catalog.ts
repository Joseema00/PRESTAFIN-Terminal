import { INVESTMENT_PRODUCTS } from './investment-products';
/** Exact share classes; no ETF proxies or other currencies. */
export const FUND_DETAILS:Record<string,{manager:string;benchmark:string;inception:string;portId?:string;page:string;documentDate:string}>={
 'research-fidelity':{manager:'Fidelity International',benchmark:'MSCI World',inception:'2018-03-20',page:'https://www.fidelityinternational.com/FILPS/Documents/en/current/ret.en.gb.IE00BYX5NX33.pdf',documentDate:'2026-03-31'},
 'research-vanguard-bond-fund':{manager:'Vanguard',benchmark:'Bloomberg Global Aggregate Float Adjusted and Scaled',inception:'2014-02-27',portId:'9197',page:'https://www.vanguard.co.uk/professional/product/fund/bond/9197/global-bond-index-fund-eur-hedged-acc',documentDate:'2026-10-29'},
 'fund-vanguard-world':{manager:'Vanguard',benchmark:'MSCI World',inception:'2002-12-10',portId:'9837',page:'https://www.vanguard.co.uk/professional/product/fund/equity/9837/global-stock-index-fund-eur-acc',documentDate:'2025-12-31'},
 'fund-vanguard-emerging':{manager:'Vanguard',benchmark:'MSCI Emerging Markets',inception:'2014-02-27',portId:'9229',page:'https://www.vanguard.co.uk/professional/product/fund/equity/9229/emerging-markets-stock-index-fund-eur-acc',documentDate:'2026-10-29'},
 'fund-vanguard-short':{manager:'Vanguard',benchmark:'Bloomberg Global Aggregate ex US MBS 1–5 Year',inception:'2014-03-31',portId:'9110',page:'https://www.vanguard.co.uk/professional/product/fund/bond/9110/global-short-term-bond-index-fund-eur-hedged-acc',documentDate:'2026-10-29'},
 'fund-vanguard-small':{manager:'Vanguard',benchmark:'MSCI World Small Cap',inception:'2012-12-11',portId:'9159',page:'https://www.vanguard.co.uk/professional/product/fund/equity/9159/global-small-cap-index-fund-eur-acc',documentDate:'2025-12-31'},
 'fund-vanguard-euro-gov':{manager:'Vanguard',benchmark:'Bloomberg Euro Government Float Adjusted',inception:'2000-09-29',portId:'9971',page:'https://www.vanguard.co.uk/professional/product/fund/bond/9971/euro-government-bond-index-fund-institutional-plus-eur-acc',documentDate:'2026-10-29'},
};
export const FUND_PRODUCTS=INVESTMENT_PRODUCTS.filter(p=>p.vehicle==='Fondo');
export const fundByIsin=(isin:string)=>FUND_PRODUCTS.find(p=>p.isin===isin);

/** Published calendar-year FUND returns, not the index row. EUR, net ongoing
 * charges, income reinvested. Rounded to one decimal by the issuer. These are
 * documentary observations, never daily NAVs or inputs to risk calculations.
 * Source: exact-ISIN UCITS KIIDs, page 2, dated 2026-02-17; checked 2026-10-29.
 */
const annualSnapshot=(isin:string,values:readonly number[])=>({
 isin,currency:'EUR' as const,documentDate:'2026-02-17',checkedAt:'2026-10-29',
 source:`https://fund-docs.vanguard.com/${isin.toLowerCase()}-en.pdf`,
 years:values.map((value,index)=>({year:2016+index,value})),
});
export const FUND_PUBLISHED_ANNUAL:Record<string,ReturnType<typeof annualSnapshot>>={
 'fund-vanguard-world':annualSnapshot('IE00B03HD191',[10.5,7.4,-4.3,29.9,6.3,31,-12.8,19.5,26.5,6.7]),
 'fund-vanguard-emerging':annualSnapshot('IE0031786696',[14.1,20.5,-10.6,20.3,8.2,4.5,-15.1,5.5,14.8,17.6]),
 'research-vanguard-bond-fund':annualSnapshot('IE00B18GC888',[2.4,1.2,-1.2,5.3,4.8,-2.8,-15.1,4.7,.8,2.8]),
 'fund-vanguard-short':annualSnapshot('IE00BH65QP47',[.5,-.3,-.8,1.4,2,-1.6,-7.1,3.6,2.7,3.2]),
 'fund-vanguard-small':annualSnapshot('IE00B42W4L06',[15.9,7.5,-9.7,28.2,6.2,24.4,-13.5,11.9,15.2,5.6]),
 'fund-vanguard-euro-gov':annualSnapshot('IE0007472990',[3,-.1,.8,6.2,4.7,-3.5,-18.3,7.1,1.8,.6]),
};
