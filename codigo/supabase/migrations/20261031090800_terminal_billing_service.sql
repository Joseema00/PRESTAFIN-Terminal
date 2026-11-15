create table public.terminal_billing_accounts (
 user_id uuid primary key,
 customer_id text unique,
 trial_used smallint not null default 0 check(trial_used in (0,1)),
 customer_key uuid not null,
 customer_started bigint not null default 0 check(customer_started>=0),
 attempt text check(attempt is null or octet_length(attempt)<=65536),
 lease_id uuid,
 lease_until bigint not null default 0
);
alter table public.terminal_billing_accounts enable row level security;
revoke all on public.terminal_billing_accounts from public,anon,authenticated;
grant select,insert,update on public.terminal_billing_accounts to service_role;
create function public.terminal_billing_acquire(p_user uuid,p_lease uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare acquired uuid; clock_ms bigint:=floor(extract(epoch from clock_timestamp())*1000);
begin
 if p_user is null or p_lease is null then raise exception 'Invalid lease'; end if;
 update public.terminal_billing_accounts set lease_id=p_lease,lease_until=clock_ms+600000
 where user_id=p_user and lease_until<clock_ms returning user_id into acquired;
 return acquired is not null;
end;
$$;
revoke all on function public.terminal_billing_acquire(uuid,uuid) from public,anon,authenticated;
grant execute on function public.terminal_billing_acquire(uuid,uuid) to service_role;
comment on table public.terminal_billing_accounts is 'Server-only Stripe customer linkage, immutable trial history, checkout idempotency and account leases. No financial client dossiers.';
