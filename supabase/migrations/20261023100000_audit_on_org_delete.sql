-- Deleting an organization cascades to its rows; there is no organization
-- left to log those deletions against, so the audit trigger skips them.
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb := to_jsonb(coalesce(new, old));
  target_org uuid := (row_data ->> 'org_id')::uuid;
begin
  -- Global reference rows have no organization to log against.
  if target_org is null then
    return null;
  end if;
  if tg_op = 'DELETE' and not exists (select 1 from public.organizations where id = target_org) then
    return null;
  end if;
  insert into public.audit_log (org_id, table_name, record_id, action, old_data, new_data)
  values (
    target_org,
    tg_table_name,
    (row_data ->> 'id')::uuid,
    lower(tg_op),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return null;
end;
$$;
