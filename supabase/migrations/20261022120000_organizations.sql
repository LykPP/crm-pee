-- Organizations (ESCOs), their members and roles.
-- Every tenant table added later must be scoped by org_id and use
-- the helper functions below in its row level security policies.

create type public.member_role as enum ('admin', 'technician', 'sales', 'viewer');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  created_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index memberships_user_id_idx on public.memberships (user_id);

-- Helpers run as definer so policies can check membership without
-- recursing into the memberships policies.
create function public.is_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships
    where org_id = target_org and user_id = auth.uid()
  );
$$;

create function public.has_role(target_org uuid, roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships
    where org_id = target_org and user_id = auth.uid() and role = any (roles)
  );
$$;

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;

create policy "members read their organization"
  on public.organizations for select
  to authenticated
  using (public.is_member(id));

create policy "admins update their organization"
  on public.organizations for update
  to authenticated
  using (public.has_role(id, array['admin']::public.member_role[]))
  with check (public.has_role(id, array['admin']::public.member_role[]));

create policy "members read memberships of their organization"
  on public.memberships for select
  to authenticated
  using (public.is_member(org_id));

-- Creating an organization and its first admin happens atomically here.
-- During internal use a person may create only one organization.
create function public.create_organization(org_name text)
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

revoke execute on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

grant select, update on public.organizations to authenticated;
grant select on public.memberships to authenticated;
