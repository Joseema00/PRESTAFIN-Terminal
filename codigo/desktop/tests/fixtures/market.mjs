export function syntheticBundle(symbols){
 const assets=symbols.map((symbol,j)=>{let price=100;const monthly=Array.from({length:61},(_,i)=>{price*=1+.003+Math.sin(i*.7+j)*(.01+j*.005);return {d:new Date(Date.UTC(2020,i+1,0)).toISOString().slice(0,10),c:price,a:price};});return {symbol,ok:true,monthly,instrument:{symbol,name:'Synthetic '+symbol,currency:'EUR',kind:'ETF',provider:'test'},meta:{currency:'EUR',adjusted:true,provider:'test',providerLabel:'Datos sintéticos de prueba',frequency:'monthly',firstDate:monthly[0].d,lastDate:monthly.at(-1).d,fetchedAt:new Date().toISOString(),pointCount:monthly.length,quality:'real'}};});
 return {assets,sources:[],matrix:null,lookback:'max',generatedAt:new Date().toISOString()};
}
