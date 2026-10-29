-- Safety-net migration: idempotently (re)asserts Row Level Security and
-- owner-only policies on every table that stores per-user data.
--
-- Why this exists: the migration history in this repo only goes back to
-- 2026-08-13 (incremental ALTERs). The original CREATE TABLE statements and
-- their first RLS policies predate this tracked history and are not present
-- as files, so they can't be verified by reading the repo alone. This
-- migration is fully idempotent (DROP POLICY IF EXISTS + CREATE POLICY,
-- ENABLE ROW LEVEL SECURITY is itself idempotent) so it's safe to run
-- against a database that already has correct policies — it just
-- re-asserts them — and closes any gap if it doesn't.
--
-- After applying, run `supabase db pull` once to capture a clean baseline
-- migration for anything created outside this file's history.

-- ── profiles (keyed by id = auth.users.id) ─────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own profiles" ON public.profiles;
CREATE POLICY "own profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── portfolios ──────────────────────────────────────────────────────────
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own portfolios" ON public.portfolios;
CREATE POLICY "Users can read own portfolios" ON public.portfolios
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own portfolios" ON public.portfolios;
CREATE POLICY "Users can create own portfolios" ON public.portfolios
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own portfolios" ON public.portfolios;
CREATE POLICY "Users can update own portfolios" ON public.portfolios
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own portfolios" ON public.portfolios;
CREATE POLICY "Users can delete own portfolios" ON public.portfolios
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── mortgages ───────────────────────────────────────────────────────────
ALTER TABLE public.mortgages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own mortgages" ON public.mortgages;
CREATE POLICY "own mortgages" ON public.mortgages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── wealth_profile ──────────────────────────────────────────────────────
ALTER TABLE public.wealth_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own wealth profile" ON public.wealth_profile;
CREATE POLICY "own wealth profile" ON public.wealth_profile
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── wealth_snapshots ────────────────────────────────────────────────────
ALTER TABLE public.wealth_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own wealth snapshots" ON public.wealth_snapshots;
CREATE POLICY "own wealth snapshots" ON public.wealth_snapshots
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── goals ───────────────────────────────────────────────────────────────
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own goals" ON public.goals;
CREATE POLICY "own goals" ON public.goals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── email_preferences (already has an owner policy from 2026-08-15, kept
--    here too so this file is a complete, self-sufficient baseline) ──────
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own email preferences" ON public.email_preferences;
CREATE POLICY "own email preferences" ON public.email_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── payments / subscriptions: read-only for the owning user, writes only
--    via service_role (webhook + server functions) ───────────────────────
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own payments read" ON public.payments;
CREATE POLICY "own payments read" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own subscription read" ON public.subscriptions;
CREATE POLICY "own subscription read" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ── access_code_redemptions: users may see their own redemptions only ────
ALTER TABLE public.access_code_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own redemptions" ON public.access_code_redemptions;
CREATE POLICY "Users can view their own redemptions" ON public.access_code_redemptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ── tables that must NEVER be reachable from anon/authenticated clients
--    (service_role / server-only) — re-assert deny-all as a backstop ─────
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No client access to access codes" ON public.access_codes;
CREATE POLICY "No client access to access codes" ON public.access_codes
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.data_quality_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No client access to data quality log" ON public.data_quality_log;
CREATE POLICY "No client access to data quality log" ON public.data_quality_log
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.data_sync_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No client access to data sync jobs" ON public.data_sync_jobs;
CREATE POLICY "No client access to data sync jobs" ON public.data_sync_jobs
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No client access to webhook events" ON public.webhook_events;
CREATE POLICY "No client access to webhook events" ON public.webhook_events
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- ── public read-only reference data ───────────────────────────────────────
ALTER TABLE public.market_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "market assets readable" ON public.market_assets;
CREATE POLICY "market assets readable" ON public.market_assets
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.market_series ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "market series readable" ON public.market_series;
CREATE POLICY "market series readable" ON public.market_series
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fx rates readable" ON public.fx_rates;
CREATE POLICY "fx rates readable" ON public.fx_rates
  FOR SELECT TO anon, authenticated USING (true);
