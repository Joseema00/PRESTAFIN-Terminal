
create table public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  plan plan_tier not null default 'pro',
  allowed_email text,
  max_uses integer not null default 1,
  used_count integer not null default 0,
  duration_days integer,
  expires_at timestamptz,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);

grant all on public.access_codes to service_role;
alter table public.access_codes enable row level security;

create table public.access_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.access_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  environment text not null default 'sandbox',
  redeemed_at timestamptz not null default now(),
  unique (code_id, user_id)
);

grant select on public.access_code_redemptions to authenticated;
grant all on public.access_code_redemptions to service_role;
alter table public.access_code_redemptions enable row level security;

create policy "Users can view their own redemptions"
on public.access_code_redemptions for select to authenticated
using (auth.uid() = user_id);
