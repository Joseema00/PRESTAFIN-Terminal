create table public.terminal_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null check (jsonb_typeof(data)='object' and data->>'version'='2' and jsonb_typeof(data->'people')='array' and octet_length(data::text)<=6291456),
 previous_data jsonb,
 revision bigint not null check (revision>=1 and revision<=9007199254740991),
 last_write_id uuid not null,
 updated_at timestamptz not null default now()
);
alter table public.terminal_workspaces enable row level security;
revoke all on public.terminal_workspaces from public,anon,authenticated;
grant select,insert,update on public.terminal_workspaces to authenticated;
create policy terminal_workspace_owner_select on public.terminal_workspaces for select to authenticated using ((select auth.uid())=user_id);
create policy terminal_workspace_owner_insert on public.terminal_workspaces for insert to authenticated with check ((select auth.uid())=user_id);
create policy terminal_workspace_owner_update on public.terminal_workspaces for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create function public.terminal_save_workspace(p_data jsonb,p_expected_revision bigint,p_operation_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare owner_id uuid:=auth.uid(); saved public.terminal_workspaces%rowtype;
begin
 if owner_id is null then raise insufficient_privilege; end if;
 if p_expected_revision is null or p_expected_revision<0 or p_operation_id is null or p_data is null or jsonb_typeof(p_data)<>'object' or p_data->>'version'<>'2' or jsonb_typeof(p_data->'people') is distinct from 'array' then
   raise exception 'Invalid workspace' using errcode='22023';
 end if;
 -- Account lock serializes saves on separate devices. The caller never supplies an owner.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text,1));
 select * into saved from public.terminal_workspaces where user_id=owner_id;
 if found and saved.last_write_id=p_operation_id then
   if saved.data=p_data then return jsonb_build_object('revision',saved.revision,'updated_at',saved.updated_at); end if;
   return jsonb_build_object('conflict',true);
 end if;
 if p_expected_revision=0 then
   insert into public.terminal_workspaces(user_id,data,revision,last_write_id) values(owner_id,p_data,1,p_operation_id)
     on conflict(user_id) do nothing returning * into saved;
 else
   update public.terminal_workspaces set previous_data=data,data=p_data,revision=revision+1,last_write_id=p_operation_id,updated_at=now()
     where user_id=owner_id and revision=p_expected_revision returning * into saved;
 end if;
 if not found then return jsonb_build_object('conflict',true); end if;
 return jsonb_build_object('revision',saved.revision,'updated_at',saved.updated_at);
end;
$$;
revoke all on function public.terminal_save_workspace(jsonb,bigint,uuid) from public,anon;
grant execute on function public.terminal_save_workspace(jsonb,bigint,uuid) to authenticated;
comment on table public.terminal_workspaces is 'Account-owned Terminal clients, questionnaires, portfolios and private model library. No founder role override.';
