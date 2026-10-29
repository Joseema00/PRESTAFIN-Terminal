CREATE POLICY "No client access to access codes"
ON public.access_codes
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No client access to data quality log"
ON public.data_quality_log
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No client access to data sync jobs"
ON public.data_sync_jobs
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No client access to webhook events"
ON public.webhook_events
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);