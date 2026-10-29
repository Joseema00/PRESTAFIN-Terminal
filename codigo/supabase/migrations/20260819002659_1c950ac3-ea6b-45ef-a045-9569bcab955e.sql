REVOKE ALL ON TABLE public.access_codes FROM anon, authenticated;
REVOKE ALL ON TABLE public.access_code_redemptions FROM anon, authenticated;
GRANT SELECT ON TABLE public.access_code_redemptions TO authenticated;

REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;

REVOKE ALL ON TABLE public.portfolios FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.portfolios TO authenticated;

REVOKE ALL ON TABLE public.mortgages FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mortgages TO authenticated;

REVOKE ALL ON TABLE public.wealth_profile FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.wealth_profile TO authenticated;

REVOKE ALL ON TABLE public.wealth_snapshots FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.wealth_snapshots TO authenticated;

REVOKE ALL ON TABLE public.goals FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.goals TO authenticated;

REVOKE ALL ON TABLE public.email_preferences FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.email_preferences TO authenticated;

REVOKE ALL ON TABLE public.payments FROM anon, authenticated;
GRANT SELECT ON TABLE public.payments TO authenticated;

REVOKE ALL ON TABLE public.subscriptions FROM anon, authenticated;
GRANT SELECT ON TABLE public.subscriptions TO authenticated;

REVOKE ALL ON TABLE public.market_assets FROM anon, authenticated;
GRANT SELECT ON TABLE public.market_assets TO anon, authenticated;

REVOKE ALL ON TABLE public.market_series FROM anon, authenticated;
GRANT SELECT ON TABLE public.market_series TO anon, authenticated;

REVOKE ALL ON TABLE public.fx_rates FROM anon, authenticated;
GRANT SELECT ON TABLE public.fx_rates TO anon, authenticated;

GRANT ALL ON TABLE public.access_codes, public.access_code_redemptions, public.profiles, public.portfolios, public.mortgages, public.wealth_profile, public.wealth_snapshots, public.goals, public.email_preferences, public.payments, public.subscriptions, public.market_assets, public.market_series, public.fx_rates TO service_role;