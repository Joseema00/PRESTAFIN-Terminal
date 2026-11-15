create table public.terminal_license_codes (
  code_hash text primary key check (code_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  disabled boolean not null default false,
  redeemed_by uuid references auth.users(id) on delete restrict,
  redeemed_at timestamptz,
  check ((redeemed_by is null) = (redeemed_at is null))
);
create table public.terminal_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null unique references public.terminal_license_codes(code_hash) on delete restrict,
  license_type text not null default 'pro_permanent' check (license_type = 'pro_permanent'),
  activated_at timestamptz not null default now(),
  revoked_at timestamptz
);
create table public.terminal_license_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0)
);
create index terminal_license_codes_redeemed_by_idx on public.terminal_license_codes(redeemed_by);
alter table public.terminal_license_codes enable row level security;
alter table public.terminal_entitlements enable row level security;
alter table public.terminal_license_attempts enable row level security;
revoke all on public.terminal_license_codes, public.terminal_entitlements, public.terminal_license_attempts from public, anon, authenticated;
grant all on public.terminal_license_codes, public.terminal_entitlements, public.terminal_license_attempts to service_role;
grant select on public.terminal_entitlements to authenticated;
create policy terminal_entitlement_owner_read on public.terminal_entitlements for select to authenticated using ((select auth.uid()) = user_id);

create function public.terminal_redeem_license(p_user_id uuid, p_code_hash text)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare
  attempt_count integer;
  code_row public.terminal_license_codes%rowtype;
  entitlement public.terminal_entitlements%rowtype;
begin
  -- Only the server role can invoke this function. The Edge Function supplies an Auth-verified owner.
  if current_user not in ('service_role','postgres') then
    raise insufficient_privilege;
  end if;
  if p_user_id is null then
    return jsonb_build_object('error','Confirma tu correo antes de activar una licencia.','status',400);
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,0));
  insert into public.terminal_license_attempts(user_id,window_start,attempts)
    values(p_user_id,now(),1)
    on conflict(user_id) do update set
      window_start=case when terminal_license_attempts.window_start < now()-interval '1 minute' then now() else terminal_license_attempts.window_start end,
      attempts=case when terminal_license_attempts.window_start < now()-interval '1 minute' then 1 else terminal_license_attempts.attempts+1 end
    returning attempts into attempt_count;
  if attempt_count > 10 then
    return jsonb_build_object('error','Demasiados intentos. Espera un minuto y vuelve a intentarlo.','status',429);
  end if;
  select * into code_row from public.terminal_license_codes where code_hash=p_code_hash for update;
  if not found or code_row.disabled or (code_row.redeemed_by is not null and code_row.redeemed_by <> p_user_id) then
    return jsonb_build_object('error','Código no válido o ya utilizado.','status',400);
  end if;
  select * into entitlement from public.terminal_entitlements where user_id=p_user_id;
  if code_row.redeemed_by is not null then
    if entitlement.code_hash=p_code_hash and entitlement.revoked_at is null then
      return jsonb_build_object('activated_at',entitlement.activated_at,'revoked_at',null);
    end if;
    return jsonb_build_object('error','Código no válido o ya utilizado.','status',400);
  end if;
  if entitlement.user_id is not null and entitlement.revoked_at is null then
    return jsonb_build_object('activated_at',entitlement.activated_at,'revoked_at',null);
  end if;
  update public.terminal_license_codes set redeemed_by=p_user_id,redeemed_at=now() where code_hash=p_code_hash;
  insert into public.terminal_entitlements(user_id,code_hash) values(p_user_id,p_code_hash)
    on conflict(user_id) do update set code_hash=excluded.code_hash,activated_at=now(),revoked_at=null
    returning * into entitlement;
  return jsonb_build_object('activated_at',entitlement.activated_at,'revoked_at',null);
end;
$$;
revoke all on function public.terminal_redeem_license(uuid,text) from public,anon,authenticated;
grant execute on function public.terminal_redeem_license(uuid,text) to service_role;
comment on table public.terminal_license_codes is 'Terminal activation codes: SHA-256 only, one confirmed account per code. No plaintext codes.';
comment on table public.terminal_entitlements is 'Server-managed permanent Terminal access. Not a Stripe subscription or an email confirmation.';
