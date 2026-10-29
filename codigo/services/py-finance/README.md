# Prestafin — Servicio Python de datos financieros (yfinance)

Servicio independiente que expone yfinance por REST. Prestafin lo consume desde
la Market Data Layer (`src/lib/market/remote-provider.server.ts`), nunca desde
el navegador.

## Despliegue

Cualquier plataforma que ejecute contenedores (Railway, Render, Fly.io, Cloud Run):

```bash
docker build -t prestafin-py-finance .
docker run -p 8000:8000 -e PY_FINANCE_API_KEY=un-token-largo prestafin-py-finance
```

## Variables a configurar en Prestafin

| Variable | Valor |
| --- | --- |
| `PY_FINANCE_API_URL` | URL pública del servicio, sin barra final |
| `PY_FINANCE_API_KEY` | El mismo token que `PY_FINANCE_API_KEY` del servicio |

Para OpenBB (mismo contrato REST, o una pasarela propia delante de OpenBB):

| Variable | Valor |
| --- | --- |
| `OPENBB_API_URL` | URL del servicio OpenBB |
| `OPENBB_API_KEY` | Clave de acceso |

Mientras estas variables no existan, Prestafin sigue funcionando con Yahoo
Finance y el gestor de proveedores marca los proveedores remotos como
desactivados, indicando qué variable falta.

## Endpoints

- `GET /health`
- `GET /search?query=&limit=`
- `GET /history?symbol=&interval=1d|1wk|1mo`
- `GET /quote?symbol=`
- `GET /dividends?symbol=`
- `GET /info?symbol=`
