-- Team management: invitations by e-mail, members with their e-mails,
-- role changes and removals. Writes go through functions that check the
-- caller is an admin and that every organization keeps at least one admin.

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower(trim(email)) and email like '%_@_%'),
  role public.member_role not null,
  invited_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null
);

create unique index invitations_pending_idx on public.invitations (org_id, email) where accepted_at is null;
create index invitations_email_idx on public.invitations (email) where accepted_at is null;

alter table public.invitations enable row level security;

create policy "admins read invitations"
  on public.invitations for select
  to authenticated
  using (public.has_role(org_id, array['admin']::public.member_role[]));

create policy "admins create invitations"
  on public.invitations for insert
  to authenticated
  with check (public.has_role(org_id, array['admin']::public.member_role[]) and accepted_at is null);

create policy "admins cancel pending invitations"
  on public.invitations for delete
  to authenticated
  using (public.has_role(org_id, array['admin']::public.member_role[]) and accepted_at is null);

grant select, insert, delete on public.invitations to authenticated;

-- Joins the organizations that invited the caller's e-mail. Returns how many.
create function public.accept_invitations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  my_email text;
  joined integer := 0;
  inv record;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select lower(email) into my_email from auth.users where id = auth.uid();
  if my_email is null then
    return 0;
  end if;
  for inv in
    select id, org_id, role from public.invitations
    where email = my_email and accepted_at is null
    for update
  loop
    insert into public.memberships (org_id, user_id, role)
    values (inv.org_id, auth.uid(), inv.role)
    on conflict (org_id, user_id) do nothing;
    update public.invitations set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
    joined := joined + 1;
  end loop;
  return joined;
end;
$$;

-- Members of an organization with their e-mails, for its own members only.
create function public.list_members(target_org uuid)
returns table (user_id uuid, email text, role public.member_role, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, u.email::text, m.role, m.created_at
  from public.memberships m
  join auth.users u on u.id = m.user_id
  where m.org_id = target_org and public.is_member(target_org)
  order by m.created_at;
$$;

create function public.assert_keeps_an_admin(target_org uuid, leaving uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.memberships
    where org_id = target_org and role = 'admin' and user_id <> leaving
  ) then
    raise exception 'organization must keep an admin' using errcode = 'P0001';
  end if;
end;
$$;

create function public.set_member_role(target_org uuid, target_user uuid, new_role public.member_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(target_org, array['admin']::public.member_role[]) then
    raise exception 'only admins manage the team' using errcode = '42501';
  end if;
  if new_role <> 'admin' then
    perform public.assert_keeps_an_admin(target_org, target_user);
  end if;
  update public.memberships set role = new_role where org_id = target_org and user_id = target_user;
end;
$$;

create function public.remove_member(target_org uuid, target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(target_org, array['admin']::public.member_role[]) then
    raise exception 'only admins manage the team' using errcode = '42501';
  end if;
  perform public.assert_keeps_an_admin(target_org, target_user);
  delete from public.memberships where org_id = target_org and user_id = target_user;
end;
$$;

revoke execute on function public.accept_invitations() from public, anon;
revoke execute on function public.list_members(uuid) from public, anon;
revoke execute on function public.assert_keeps_an_admin(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.set_member_role(uuid, uuid, public.member_role) from public, anon;
revoke execute on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.accept_invitations() to authenticated;
grant execute on function public.list_members(uuid) to authenticated;
grant execute on function public.set_member_role(uuid, uuid, public.member_role) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
