import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fetchHistoryChain } from '../desktop-runtime/market/providers.server.mjs';

let directory;
const pending = new Map();
let slot = Promise.resolve();
export function configureMarketCache(value) { directory = value; }
export function getSeries(symbol, frequency, { force = false } = {}) {
  const key = symbol + ':' + frequency;
  if (pending.has(key)) return pending.get(key);
  // Serialize providers to avoid flooding them when a whole portfolio opens.
  const task = slot.catch(() => {}).then(() => loadSeries(symbol,frequency,force));
  slot = task;
  pending.set(key,task);
  task.finally(() => pending.delete(key)).catch(() => {});
  return task;
}
async function loadSeries(symbol,frequency,force) {
  if (!directory) throw new Error('Caché sin configurar');
  const filename = path.join(directory,createHash('sha256').update(symbol + frequency).digest('hex') + '.json');
  let cached;
  try {
    const data = JSON.parse(await readFile(filename,'utf8'));
    if (data?.instrument?.symbol && Array.isArray(data.points) && data.meta?.fetchedAt) cached = data;
  } catch {}
  if (!force && cached && Date.now() - Date.parse(cached.meta.fetchedAt) < 6*60*60*1000) return {ok:true,series:cached};
  const response = await fetchHistoryChain(symbol,frequency);
  if (!response.ok) {
    if (cached) return {ok:true,series:{...cached,meta:{...cached.meta,quality:'partial',note:'Copia local sin actualizar: ' + response.error}}};
    return {ok:false,symbol,error:response.error};
  }
  const raw = response.series;
  const series = {...raw,meta:{provider:response.provider,providerLabel:response.provider==='vanguard'?'Vanguard · valor liquidativo':'Yahoo Finance',currency:raw.currency,frequency:raw.frequency,
    firstDate:raw.points[0]?.d ?? null,lastDate:raw.points.at(-1)?.d ?? null,pointCount:raw.points.length,
    fetchedAt:new Date().toISOString(),adjusted:raw.adjusted,quality:'real'}};
  try {
    await mkdir(directory,{recursive:true});
    await writeFile(filename + '.tmp',JSON.stringify(series),'utf8');
    await rename(filename + '.tmp',filename);
  } catch { /* Market cache is optional; workspace persistence is never suppressed. */ }
  return {ok:true,series};
}
