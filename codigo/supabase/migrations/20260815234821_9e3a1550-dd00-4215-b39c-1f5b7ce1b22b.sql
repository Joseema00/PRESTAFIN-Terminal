CREATE TABLE public.email_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  transactional boolean NOT NULL DEFAULT true,
  newsletter boolean NOT NULL DEFAULT false,
  newsletter_frequency text NOT NULL DEFAULT 'weekly',
  consent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_preferences TO authenticated;
GRANT ALL ON public.email_preferences TO service_role;

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own email preferences" ON public.email_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER email_preferences_updated
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.validate_email_frequency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.newsletter_frequency NOT IN ('weekly','biweekly','monthly') THEN
    RAISE EXCEPTION 'invalid newsletter_frequency';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER email_preferences_validate
  BEFORE INSERT OR UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.validate_email_frequency();

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.subscriptions (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.wealth_profile (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.email_preferences (user_id, newsletter, consent_at)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'newsletter_opt_in')::boolean, false),
    CASE WHEN COALESCE((NEW.raw_user_meta_data->>'newsletter_opt_in')::boolean, false) THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $function$;