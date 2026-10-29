"""
Servicio Python de datos financieros (yfinance) para Prestafin.

Se despliega APARTE de la aplicación (Railway, Render, Fly.io, Cloud Run...).
La app lo consume por REST a través de la Market Data Layer; nunca desde el
navegador. Contrato consumido por src/lib/market/remote-provider.server.ts.

Arranque local:
    pip install -r requirements.txt
    export PY_FINANCE_API_KEY=un-token-largo-y-aleatorio
    uvicorn main:app --port 8000

Variables que hay que configurar después en Prestafin:
    PY_FINANCE_API_URL = https://<tu-servicio>
    PY_FINANCE_API_KEY = el mismo token
"""

import os
from typing import Any

import pandas as pd
import yfinance as yf
from fastapi import Depends, FastAPI, HTTPException, Query, Request

app = FastAPI(title="Prestafin Python Financial Service", version="1.0.0")

API_KEY = os.environ.get("PY_FINANCE_API_KEY", "").strip()

KIND_MAP = {
    "EQUITY": "Acción",
    "ETF": "ETF",
    "MUTUALFUND": "Fondo",
    "INDEX": "Índice",
    "CRYPTOCURRENCY": "Cripto",
    "CURRENCY": "Divisa",
    "FUTURE": "Materia prima",
}


def require_auth(request: Request) -> None:
    """Si hay clave configurada, se exige. Sin clave el servicio queda abierto."""
    if not API_KEY:
        return
    if request.headers.get("authorization", "") != f"Bearer {API_KEY}":
        raise HTTPException(status_code=401, detail="No autorizado")


def _instrument(symbol: str, info: dict[str, Any]) -> dict[str, Any]:
    return {
        "symbol": symbol,
        "name": info.get("longName") or info.get("shortName") or symbol,
        "short_name": info.get("shortName"),
        "kind": KIND_MAP.get(str(info.get("quoteType", "")).upper(), "Otro"),
        "isin": info.get("isin"),
        "exchange": info.get("fullExchangeName") or info.get("exchange"),
        "currency": info.get("currency") or "USD",
        "country": info.get("country"),
        "sector": info.get("sector"),
        "provider_id": symbol,
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "provider": "yfinance"}


@app.get("/history", dependencies=[Depends(require_auth)])
def history(symbol: str, interval: str = Query("1d")) -> dict[str, Any]:
    ticker = yf.Ticker(symbol)
    df = ticker.history(period="max", interval=interval, auto_adjust=False, actions=True)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail="Sin serie histórica en el proveedor")

    df = df.dropna(subset=["Close"])
    points = []
    for idx, row in df.iterrows():
        close = float(row["Close"])
        adj = float(row["Adj Close"]) if "Adj Close" in row and not pd.isna(row["Adj Close"]) else close
        point = {"d": pd.Timestamp(idx).strftime("%Y-%m-%d"), "c": close, "a": adj}
        for key, field in (("Open", "o"), ("High", "h"), ("Low", "l"), ("Volume", "v")):
            if key in row and not pd.isna(row[key]):
                point[field] = float(row[key])
        points.append(point)

    if len(points) < 2:
        raise HTTPException(status_code=404, detail="Histórico insuficiente")

    dividends = []
    if "Dividends" in df:
        for idx, value in df["Dividends"].items():
            if value and float(value) > 0:
                dividends.append({"d": pd.Timestamp(idx).strftime("%Y-%m-%d"), "amount": float(value)})

    splits = []
    if "Stock Splits" in df:
        for idx, value in df["Stock Splits"].items():
            if value and float(value) > 0:
                splits.append({"d": pd.Timestamp(idx).strftime("%Y-%m-%d"), "ratio": f"{float(value)}:1"})

    try:
        info = ticker.get_info() or {}
    except Exception:
        info = {}

    frequency = {"1d": "daily", "1wk": "weekly", "1mo": "monthly"}.get(interval, "daily")
    return {
        "instrument": _instrument(symbol, info),
        "points": points,
        "dividends": dividends,
        "splits": splits,
        "currency": info.get("currency") or "USD",
        "adjusted": True,
        "frequency": frequency,
    }


@app.get("/quote", dependencies=[Depends(require_auth)])
def quote(symbol: str) -> dict[str, Any]:
    df = yf.Ticker(symbol).history(period="5d", interval="1d", auto_adjust=False)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail="Sin precio disponible")
    closes = df["Close"].dropna()
    if closes.empty:
        raise HTTPException(status_code=404, detail="Sin precio disponible")
    last = float(closes.iloc[-1])
    prev = float(closes.iloc[-2]) if len(closes) > 1 else None
    try:
        currency = (yf.Ticker(symbol).fast_info.get("currency") or "USD")
    except Exception:
        currency = "USD"
    return {
        "price": last,
        "currency": currency,
        "change_pct": ((last - prev) / prev * 100) if prev else None,
        "date": pd.Timestamp(closes.index[-1]).strftime("%Y-%m-%d"),
    }


@app.get("/dividends", dependencies=[Depends(require_auth)])
def dividends(symbol: str) -> dict[str, Any]:
    series = yf.Ticker(symbol).dividends
    if series is None or series.empty:
        return {"dividends": []}
    return {
        "dividends": [
            {"d": pd.Timestamp(idx).strftime("%Y-%m-%d"), "amount": float(value)}
            for idx, value in series.items()
            if float(value) > 0
        ]
    }


@app.get("/info", dependencies=[Depends(require_auth)])
def info(symbol: str) -> dict[str, Any]:
    try:
        data = yf.Ticker(symbol).get_info() or {}
    except Exception:
        raise HTTPException(status_code=404, detail="Sin información del activo")
    return {
        "isin": data.get("isin"),
        "sector": data.get("sector"),
        "country": data.get("country"),
        "market_cap": data.get("marketCap"),
        "ter": data.get("annualReportExpenseRatio"),
        "manager": data.get("fundFamily"),
        "benchmark": data.get("category"),
        "currency": data.get("currency"),
    }


@app.get("/search", dependencies=[Depends(require_auth)])
def search(query: str, limit: int = 12) -> dict[str, Any]:
    try:
        quotes = yf.Search(query, max_results=limit).quotes or []
    except Exception:
        raise HTTPException(status_code=503, detail="Búsqueda no disponible")
    results = []
    for q in quotes:
        symbol = q.get("symbol")
        if not symbol:
            continue
        results.append(
            {
                "symbol": symbol,
                "name": q.get("longname") or q.get("shortname") or symbol,
                "short_name": q.get("shortname"),
                "kind": KIND_MAP.get(str(q.get("quoteType", "")).upper(), "Otro"),
                "isin": q.get("isin"),
                "exchange": q.get("exchDisp") or q.get("exchange"),
                "currency": q.get("currency") or "USD",
                "provider_id": symbol,
            }
        )
    return {"results": results}
