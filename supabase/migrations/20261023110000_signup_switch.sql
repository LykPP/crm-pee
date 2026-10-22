-- Product-wide switches, changed only through the SQL editor.
create table public.app_settings (
  key text primary key,
  value jsonb not null
);

alter table public.app_settings enable row level security;
-- No policies: users never read or write this table directly.

insert into public.app_settings (key, value) values ('allow_new_organizations', 'false');

-- Whether people without an invitation may create an organization.
create function public.new_organizations_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select value = 'true'::jsonb from public.app_settings where key = 'allow_new_organizations'), false);
$$;

revoke execute on function public.new_organizations_allowed() from public, anon;
grant execute on function public.new_organizations_allowed() to authenticated;

create or replace function public.create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not public.new_organizations_allowed() then
    raise exception 'new organizations are closed; ask for an invitation' using errcode = '42501';
  end if;
  if exists (select 1 from public.memberships where user_id = auth.uid()) then
    raise exception 'user already belongs to an organization' using errcode = 'P0001';
  end if;

  insert into public.organizations (name) values (trim(org_name))
  returning id into new_org;

  insert into public.memberships (org_id, user_id, role)
  values (new_org, auth.uid(), 'admin');

  return new_org;
end;
$$;
