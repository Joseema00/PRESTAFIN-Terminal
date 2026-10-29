export type HistoricalData={portfolioId:string;source:string;importedAt:number;currency:'EUR';columns:string[];rows:{month:string;returns:number[]}[]};
const mean=(x:number[])=>x.reduce((s,v)=>s+v,0)/x.length;
export function validateHistory(input:unknown):HistoricalData {
  const d=input as HistoricalData;
  if(!d||typeof d.portfolioId!=='string'||d.portfolioId.length>160||typeof d.source!=='string'||!d.source.trim()||d.source.length>300||d.currency!=='EUR'||!Number.isSafeInteger(d.importedAt)||d.importedAt<0||!Array.isArray(d.columns)||!d.columns.length||d.columns.length>40||d.columns.some(x=>typeof x!=='string'||!x.trim()||x.length>160)||new Set(d.columns).size!==d.columns.length||!Array.isArray(d.rows)||d.rows.length<24||d.rows.length>1200)throw new Error('Histórico no válido: se necesitan 24–1.200 meses y entre 1 y 40 posiciones distintas.');
  let previous=-1;
  const rows=d.rows.map(r=>{
    if(!r||!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month)||!Array.isArray(r.returns)||r.returns.length!==d.columns.length||r.returns.some(x=>!Number.isFinite(x)||x<=-1||x>10))throw new Error('Mes o rentabilidad no válidos. Usa meses AAAA-MM y variaciones mayores de -100 %.');
    const month=Number(r.month.slice(0,4))*12+Number(r.month.slice(5));
    if(previous!==-1&&month!==previous+1)throw new Error('Los meses deben estar ordenados, sin duplicados ni huecos.');
    previous=month;return {month:r.month,returns:[...r.returns]};
  });
  if(rows.at(-1)!.month>=new Date(d.importedAt).toISOString().slice(0,7))throw new Error('Utiliza meses cerrados anteriores a la fecha de importación.');
  return {portfolioId:d.portfolioId,source:d.source.trim(),importedAt:d.importedAt,currency:'EUR',columns:[...d.columns],rows};
}
export function parseHistoryCSV(csv:string,portfolioId:string,source:string,now=Date.now()):HistoricalData {
  if(csv.length>1500000)throw new Error('El CSV supera el tamaño permitido.');
  const lines=csv.replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(x=>x.trim());
  const header=lines.shift()?.split(';').map(x=>x.trim())??[];
  if(header[0]?.toLowerCase()!=='mes')throw new Error('La primera columna debe llamarse mes. Separa las columnas con punto y coma.');
  const columns=header.slice(1);
  const rows=lines.map((line,index)=>{
    const cells=line.split(';').map(x=>x.trim());
    if(cells.length!==columns.length+1)throw new Error('Número de columnas incorrecto en la línea '+(index+2));
    const month=cells.shift()!;
    const returns=cells.map(v=>{if(!/^-?\d+(?:[.,]\d+)?$/.test(v))throw new Error('Rentabilidad vacía o no numérica en la línea '+(index+2));return Number(v.replace(',','.'))/100;});
    return {month,returns};
  });
  return validateHistory({portfolioId,source,importedAt:now,currency:'EUR',columns,rows});
}
/** Empirical loss quantile and integrated upper tail; boundary mass is fractional. */
export function tailRisk(returns:number[],confidence:number){
  if(!returns.length||returns.some(x=>!Number.isFinite(x))||confidence<=0||confidence>=1)throw new Error('Muestra o confianza no válidas');
  const losses=returns.map(r=>-r).sort((a,b)=>a-b),n=losses.length;
  const valueAtRisk=losses[Math.max(0,Math.ceil(confidence*n)-1)]!;
  const mass=(1-confidence)*n;let remaining=mass,sum=0;
  for(let i=n-1;i>=0&&remaining>1e-12;i--){const take=Math.min(remaining,1);sum+=take*losses[i]!;remaining-=take;}
  return {var:valueAtRisk,es:sum/mass,tailObservations:mass};
}
export function covariance(rows:number[][],method:'sample'|'shrinkage'|'gerber'='sample',threshold=.5){
  if(rows.length<2||!rows[0]?.length||rows.some(r=>r.length!==rows[0]!.length||r.some(x=>!Number.isFinite(x))))throw new Error('Matriz de rendimientos no válida');
  const n=rows.length,k=rows[0]!.length,means=Array.from({length:k},(_,j)=>mean(rows.map(r=>r[j]!)));
  const sample=Array.from({length:k},(_,i)=>Array.from({length:k},(_,j)=>rows.reduce((s,r)=>s+(r[i]!-means[i]!)*(r[j]!-means[j]!),0)/(n-1)));
  if(method==='sample')return sample;
  if(method==='shrinkage')return sample.map((r,i)=>r.map((v,j)=>i===j?v:v*.75)); // explicit fixed 25% diagonal shrinkage
  if(!(threshold>0&&threshold<=2))throw new Error('Umbral de Gerber no válido');
  const sd=sample.map((r,i)=>Math.sqrt(Math.max(0,r[i]!)));
  const states=rows.map(r=>r.map((v,j)=>sd[j]===0?0:v>=threshold*sd[j]!?1:v<=-threshold*sd[j]!?-1:0));
  return sample.map((r,i)=>r.map((_,j)=>{
    let numerator=0,denominator=0;
    for(const s of states){numerator+=s[i]!*s[j]!;if(s[i]!==0||s[j]!==0)denominator++;}
    return denominator?sd[i]!*sd[j]!*numerator/denominator:0; // Gerber et al., Appendix A-3; excludes only joint-neutral observations
  }));
}
export function riskContributions(cov:number[][],weights:number[]){
  const marginal=weights.map((_,i)=>weights.reduce((s,w,j)=>s+w*cov[i]![j]!,0));
  const variance=weights.reduce((s,w,i)=>s+w*marginal[i]!,0);
  return {volatility:Math.sqrt(Math.max(0,variance)*12),shares:weights.map((w,i)=>variance>1e-18?w*marginal[i]!/variance:0)};
}
export function analyseHistory(data:HistoricalData,holdings:{assetId:string;amount:number}[],method:'sample'|'shrinkage'|'gerber'='sample'){
  if(holdings.some(h=>h.assetId==='interview-cash-pending'))throw new Error('Primero asigna o retira el dinero pendiente: no tiene un histórico de inversión.');
  const d=validateHistory(data),positive=holdings.filter(h=>h.amount>0);
  if(positive.some(h=>!Number.isFinite(h.amount))||new Set(positive.map(h=>h.assetId)).size!==positive.length||positive.length!==d.columns.length||positive.some(h=>!d.columns.includes(h.assetId)))throw new Error('El histórico debe cubrir exactamente todas las posiciones con importe positivo de esta cartera.');
  const total=positive.reduce((s,h)=>s+h.amount,0);
  if(!(total>0))throw new Error('La cartera necesita capital positivo.');
  const weights=d.columns.map(id=>positive.find(h=>h.assetId===id)!.amount/total),rows=d.rows.map(r=>r.returns);
  const series=rows.map(r=>r.reduce((s,x,i)=>s+x*weights[i]!,0)); // constant weights, rebalanced monthly; not account performance
  const avg=mean(series),variance=series.reduce((s,x)=>s+(x-avg)**2,0)/(series.length-1);
  let wealth=1,peak=1,drawdown=0;
  for(const r of series){wealth*=1+r;peak=Math.max(peak,wealth);drawdown=Math.min(drawdown,wealth/peak-1);}
  const sd=Math.sqrt(variance),acf=(values:number[])=>{const m=mean(values),den=values.reduce((s,x)=>s+(x-m)**2,0);return den?values.slice(1).reduce((s,x,i)=>s+(x-m)*(values[i]!-m),0)/den:0;};
  let ewma=series[0]!**2;for(const x of series.slice(1))ewma=.94*ewma+.06*x*x;
  const window=60,backtest=series.slice(window).map((r,i)=>({loss:-r,limit:tailRisk(series.slice(i,i+window),.95).var}));
  const cov=covariance(rows,method),contributions=riskContributions(cov,weights);
  return {total,weights,months:series.length,start:d.rows[0]!.month,end:d.rows.at(-1)!.month,annualizedReturn:wealth**(12/series.length)-1,volatility:sd*Math.sqrt(12),drawdown,var95:tailRisk(series,.95),var99:tailRisk(series,.99),effectivePositions:1/weights.reduce((s,x)=>s+x*x,0),largestWeight:Math.max(...weights),skewness:sd?mean(series.map(x=>((x-avg)/sd)**3)):0,excessKurtosis:sd?mean(series.map(x=>((x-avg)/sd)**4))-3:0,autocorrelation:acf(series),squaredAutocorrelation:acf(series.map(x=>x*x)),ewmaMonthlyVolatility:Math.sqrt(ewma),backtest:{window,observations:backtest.length,breaches:backtest.filter(x=>x.loss>x.limit).length,expected:backtest.length*.05},covariance:cov,risk:contributions,method};
}
export function costProjection(capital:number,monthly:number,years:number,grossPct:number,annualFeePct:number,entryFeePct:number,inflationPct:number){
  if(![capital,monthly,years,grossPct,annualFeePct,entryFeePct,inflationPct].every(Number.isFinite)||capital<0||monthly<0||!Number.isInteger(years)||years<1||years>60||grossPct<=-100||inflationPct<=-100||annualFeePct<0||annualFeePct>=100||entryFeePct<0||entryFeePct>=100)throw new Error('Hipótesis de costes no válidas');
  const grossFactor=(1+grossPct/100)**(1/12),feeFactor=(1-annualFeePct/100)**(1/12);
  let gross=capital,net=capital*(1-entryFeePct/100),paid=capital-net;
  const rows=[];
  for(let month=1;month<=years*12;month++){gross=gross*grossFactor+monthly;const pre=net*grossFactor;paid+=pre*(1-feeFactor);net=pre*feeFactor+monthly;if(month%12===0)rows.push({year:month/12,gross,net,real:net/(1+inflationPct/100)**(month/12),paid,impact:gross-net});}
  return {rows,contributed:capital+monthly*years*12,...rows.at(-1)!};
}
export function bondAnalytics(face:number,couponPct:number,yieldPct:number,years:number){
  if(![face,couponPct,yieldPct,years].every(Number.isFinite)||face<=0||couponPct<0||yieldPct<=-100||years<1||years>60||!Number.isInteger(years))throw new Error('Datos del bono no válidos');
  let price=0,duration=0,convexity=0;
  for(let t=1;t<=years;t++){const pv=(face*couponPct/100+(t===years?face:0))/(1+yieldPct/100)**t;price+=pv;duration+=t*pv;convexity+=t*(t+1)*pv;}
  return {price,macaulay:duration/price,modifiedDuration:duration/price/(1+yieldPct/100),convexity:convexity/price/(1+yieldPct/100)**2};
}
