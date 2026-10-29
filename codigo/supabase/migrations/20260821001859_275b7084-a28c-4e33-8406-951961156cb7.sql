GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
GRANT SELECT, INSERT ON public.access_code_redemptions TO service_role;
GRANT ALL ON public.access_code_redemptions TO service_role;
GRANT SELECT ON public.access_code_redemptions TO authenticated;
GRANT ALL ON public.access_codes TO service_role;