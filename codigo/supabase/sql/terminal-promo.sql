-- PRESTAFIN30: server-only, one redemption per verified account. Auth is checked by terminal-license.
begin;
create table if not exists public.terminal_promo_redemptions (user_id uuid primary key references auth.users(id) on delete cascade,promo_code text not null check(promo_code='PRESTAFIN30'),redeemed_at timestamptz not null,expires_at timestamptz not null check(expires_at=redeemed_at+interval '30 days'));
alter table public.terminal_promo_redemptions enable row level security;
revoke all on public.terminal_promo_redemptions from public,anon,authenticated;
grant all on public.terminal_promo_redemptions to service_role;
CREATE OR REPLACE FUNCTION public.terminal_redeem_promo(p_user_id uuid, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 v_time timestamptz := pg_catalog.clock_timestamp();
 v_attempts integer;
 v_promo public.terminal_promo_redemptions%rowtype;
begin
 if current_user not in ('postgres', 'service_role') then
   raise insufficient_privilege;
 end if;
 if p_user_id is null then
   return pg_catalog.jsonb_build_object('error','Inicia sesión para activar la prueba.','status',401);
 end if;
 if p_code is null or pg_catalog.length(p_code)>64 or pg_catalog.upper(pg_catalog.btrim(p_code)) <> 'PRESTAFIN30' then
   return pg_catalog.jsonb_build_object('error','Código no válido.','status',400);
 end if;
 -- The authenticated Edge handler resolves and confirms this owner with Auth.
 -- The invoker is restricted to service_role/postgres; no direct auth.users grant is needed.

perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,0));
 insert into public.terminal_license_attempts(user_id,window_start,attempts)
 values(p_user_id, v_time,1)
 on conflict(user_id) do update set
   window_start=case when public.terminal_license_attempts.window_start < v_time-interval '1 minute'
     then v_time else public.terminal_license_attempts.window_start end,
   attempts=case when public.terminal_license_attempts.window_start < v_time-interval '1 minute'
     then 1 else public.terminal_license_attempts.attempts+1 end
 returning attempts into v_attempts;
 if v_attempts > 10 then
   return pg_catalog.jsonb_build_object('error','Demasiados intentos. Espera un minuto y vuelve a intentarlo.','status',429);
 end if;

 -- A redeemed account cannot redeem again, even during an active trial.
 -- Keep the original redemption untouched; status checks continue to report remaining trial time.
 select * into v_promo from public.terminal_promo_redemptions where user_id=p_user_id for update;
 if found then
   return pg_catalog.jsonb_build_object('error','PRESTAFIN30 ya fue canjeado en esta cuenta. No se puede utilizar de nuevo.','status',409);
 end if;

 if exists(select 1 from public.terminal_entitlements where user_id=p_user_id and revoked_at is null) then
   return pg_catalog.jsonb_build_object('error','Esta cuenta ya tiene una licencia Pro permanente.','status',409);
 end if;

 -- Do not stack the 14-day Stripe trial after using this 30-day promotion.
 insert into public.terminal_billing_accounts (user_id,customer_key,trial_used)
 values(p_user_id,pg_catalog.gen_random_uuid(),1)
 on conflict (user_id) do update set trial_used=1;

 insert into public.terminal_promo_redemptions(user_id,promo_code,redeemed_at,expires_at)
 values(p_user_id,'PRESTAFIN30',v_time,v_time+interval '30 days')
 returning * into v_promo;

 return pg_catalog.jsonb_build_object('redeemed_at',v_promo.redeemed_at,'expires_at',v_promo.expires_at,'kind','promo_30d');
end;
$function$;
revoke all on function public.terminal_redeem_promo(uuid,text) from public,anon,authenticated;
grant execute on function public.terminal_redeem_promo(uuid,text) to service_role;
notify pgrst, 'reload schema';
commit;
