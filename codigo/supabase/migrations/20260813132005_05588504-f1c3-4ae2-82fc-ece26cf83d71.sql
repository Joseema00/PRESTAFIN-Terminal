ALTER TABLE public.market_series DROP CONSTRAINT market_series_pkey;
ALTER TABLE public.market_series ADD CONSTRAINT market_series_pkey PRIMARY KEY (symbol, frequency);