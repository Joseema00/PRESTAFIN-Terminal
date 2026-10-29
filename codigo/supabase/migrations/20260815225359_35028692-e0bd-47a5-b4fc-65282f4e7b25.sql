DROP POLICY IF EXISTS "quality log readable" ON public.data_quality_log;
DROP POLICY IF EXISTS "sync jobs readable" ON public.data_sync_jobs;
REVOKE ALL ON public.data_quality_log FROM authenticated, anon;
REVOKE ALL ON public.data_sync_jobs FROM authenticated, anon;
GRANT ALL ON public.data_quality_log TO service_role;
GRANT ALL ON public.data_sync_jobs TO service_role;
GRANT ALL ON public.webhook_events TO service_role;
REVOKE ALL ON public.webhook_events FROM authenticated, anon;