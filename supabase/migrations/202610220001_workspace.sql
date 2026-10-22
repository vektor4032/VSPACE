-- Run once in Supabase SQL Editor. No service_role key is used by the app.
create table if not exists public.vspace_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'version' = '1'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  check (octet_length(data::text) <= 5000000)
);
alter table public.vspace_workspaces enable row level security;
revoke all on public.vspace_workspaces from anon, authenticated;
grant select on public.vspace_workspaces to authenticated;
drop policy if exists "Read own workspace" on public.vspace_workspaces;
create policy "Read own workspace" on public.vspace_workspaces for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.save_vspace_workspace(p_expected_revision bigint, p_data jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); next_revision bigint;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_expected_revision < 0 or p_expected_revision is null then raise exception 'Invalid revision'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or p_data->>'version' is distinct from '1' then raise exception 'Invalid workspace'; end if;
  if octet_length(p_data::text) > 5000000 then raise exception 'Workspace exceeds 5 MB'; end if;
  if p_expected_revision = 0 then
    insert into public.vspace_workspaces (user_id,data,revision) values (actor,p_data,1)
    on conflict (user_id) do nothing returning revision into next_revision;
  else
    update public.vspace_workspaces set data=p_data, revision=revision+1, updated_at=now()
    where user_id=actor and revision=p_expected_revision returning revision into next_revision;
  end if;
  if next_revision is null then raise exception 'Workspace revision conflict' using errcode = '40001'; end if;
  return next_revision;
end; $$;
revoke all on function public.save_vspace_workspace(bigint,jsonb) from public, anon;
grant execute on function public.save_vspace_workspace(bigint,jsonb) to authenticated;
