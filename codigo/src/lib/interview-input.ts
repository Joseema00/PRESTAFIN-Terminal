/** Accept Spanish thousands/decimals and ungrouped decimal-point input. Never guess an ambiguous grouping. */
export function parseMoneyInput(raw:string):number|undefined {
  const s=raw.trim().replace(/[\s\u00a0\u202f€]/g,'');
  if(!s)return undefined;
  let normalized=s;
  if(s.includes(',')){
    if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(s))throw new Error('Usa hasta dos decimales: 1.234,56 o 1234,56.');
    normalized=s.replaceAll('.','').replace(',','.');
  } else if(/^\d{1,3}(?:\.\d{3})+$/.test(s)) normalized=s.replaceAll('.','');
  else if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw new Error('Introduce un importe positivo con un máximo de dos decimales.');
  const n=Number(normalized);
  if(!Number.isFinite(n)||n>1e10)throw new Error('El importe máximo es 10.000.000.000 €.');
  return Math.round(n*100)/100;
}
