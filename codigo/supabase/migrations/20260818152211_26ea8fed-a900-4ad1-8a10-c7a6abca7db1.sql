GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolios TO authenticated;
GRANT ALL ON public.portfolios TO service_role;

DROP POLICY IF EXISTS "own portfolios" ON public.portfolios;
CREATE POLICY "Users can read own portfolios"
ON public.portfolios
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own portfolios"
ON public.portfolios
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios"
ON public.portfolios
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios"
ON public.portfolios
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

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

DROP TRIGGER IF EXISTS portfolios_enforce_plan_limit ON public.portfolios;
CREATE TRIGGER portfolios_enforce_plan_limit
BEFORE INSERT ON public.portfolios
FOR EACH ROW
EXECUTE FUNCTION public.enforce_portfolio_plan_limit();