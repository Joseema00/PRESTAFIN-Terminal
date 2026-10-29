import path from 'node:path';

export const APP_ORIGIN = 'prestafin://app';
export function isAppUrl(value) {
  try { const u = new URL(value); return u.protocol === 'prestafin:' && u.host === 'app' && !u.username && !u.password; }
  catch { return false; }
}
export function resolveAsset(root, rawUrl) {
  if (!isAppUrl(rawUrl)) throw new Error('Origen no permitido');
  const pathname = decodeURIComponent(new URL(rawUrl).pathname);
  if (pathname.includes('\0') || pathname.includes('\\')) throw new Error('Ruta no permitida');
  const candidate = path.resolve(root, '.' + pathname);
  const relative = path.relative(root, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Ruta fuera de la aplicación');
  return candidate;
}
export function validateMarketRequest(value) {
  if (!value || !Array.isArray(value.symbols) || value.symbols.length > 30) throw new Error('Máximo 30 activos por consulta');
  const symbols = [...new Set(value.symbols.map(s => {
    if (typeof s !== 'string' || !/^[A-Za-z0-9^.=/_-]{1,32}$/.test(s)) throw new Error('Símbolo no válido');
    return s.toUpperCase();
  }))];
  const lookback = value.lookback ?? 'max';
  if (!['1y', '3y', '5y', '10y', 'max'].includes(lookback)) throw new Error('Ventana no válida');
  const riskFree = value.riskFree ?? 0;
  if (!Number.isFinite(riskFree) || riskFree < 0 || riskFree > 20) throw new Error('Tipo de referencia no válido');
  return { symbols, lookback, riskFree, force: value.force === true };
}
