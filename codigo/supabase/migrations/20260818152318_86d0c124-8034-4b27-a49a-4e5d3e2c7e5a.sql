CREATE OR REPLACE FUNCTION public.enforce_portfolio_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_unlimited_portfolios boolean;
  current_count integer;
BEGIN
  IF NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'portfolio owner must match authenticated user';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 0));

  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = NEW.user_id
      AND s.plan IN ('premium'::public.plan_tier, 'pro'::public.plan_tier)
      AND s.status IN ('active', 'trialing', 'past_due')
  ) INTO has_unlimited_portfolios;

  IF NOT has_unlimited_portfolios THEN
    SELECT count(*)
    INTO current_count
    FROM public.portfolios p
    WHERE p.user_id = NEW.user_id;

    IF current_count >= 1 THEN
      RAISE EXCEPTION 'free plan allows only one portfolio';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_portfolio_plan_limit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_portfolio_plan_limit() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_portfolio_plan_limit() FROM authenticated;