ALTER TABLE public.market_assets
  ADD COLUMN IF NOT EXISTS short_name text,
  ADD COLUMN IF NOT EXISTS asset_class text,
  ADD COLUMN IF NOT EXISTS manager text,
  ADD COLUMN IF NOT EXISTS benchmark text,
  ADD COLUMN IF NOT EXISTS inception_date date,
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'yahoo',
  ADD COLUMN IF NOT EXISTS provider_id text,
  ADD COLUMN IF NOT EXISTS data_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS last_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_update_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_price numeric,
  ADD COLUMN IF NOT EXISTS last_price_date date;

CREATE INDEX IF NOT EXISTS market_assets_isin_idx ON public.market_assets (isin);
CREATE INDEX IF NOT EXISTS market_assets_name_idx ON public.market_assets (lower(name));

ALTER TABLE public.market_series
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'yahoo',
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS point_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjusted boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS dividends jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS splits jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ok';

CREATE TABLE IF NOT EXISTS public.fx_rates (
  base text NOT NULL,
  quote text NOT NULL,
  rate_date date NOT NULL,
  rate numeric NOT NULL,
  provider text NOT NULL DEFAULT 'frankfurter',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (base, quote, rate_date)
);

GRANT SELECT ON public.fx_rates TO anon, authenticated;
GRANT ALL ON public.fx_rates TO service_role;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fx rates readable" ON public.fx_rates;
CREATE POLICY "fx rates readable" ON public.fx_rates FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.data_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  rows_written integer NOT NULL DEFAULT 0,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS data_sync_jobs_symbol_idx ON public.data_sync_jobs (symbol, started_at DESC);
GRANT SELECT ON public.data_sync_jobs TO authenticated;
GRANT ALL ON public.data_sync_jobs TO service_role;
ALTER TABLE public.data_sync_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sync jobs readable" ON public.data_sync_jobs;
CREATE POLICY "sync jobs readable" ON public.data_sync_jobs FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.data_quality_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  provider text,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS data_quality_log_symbol_idx ON public.data_quality_log (symbol, created_at DESC);
GRANT SELECT ON public.data_quality_log TO authenticated;
GRANT ALL ON public.data_quality_log TO service_role;
ALTER TABLE public.data_quality_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quality log readable" ON public.data_quality_log;
CREATE POLICY "quality log readable" ON public.data_quality_log FOR SELECT TO authenticated USING (true);