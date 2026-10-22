-- Core CRM schema: utilities, calls, clients, contacts, projects and their
-- details, interactions and the audit log.
--
-- Tenancy rules:
-- * Every row carries org_id. Utilities and calls may also be global
--   (org_id null): maintained by us, readable by every signed-in user and
--   writable only with the service role.
-- * Composite foreign keys (org_id, x_id) keep references inside one
--   organization; references to rows that may be global are checked by
--   the policies through is_visible_utility / is_visible_call.
-- * Permissions by role:
--     admin       everything
--     technician  clients, projects and all project details
--     sales       clients, contacts, interactions and projects (pipeline);
--                 cannot see costs or efficiency actions
--     viewer      read only (except costs and actions, like sales)

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.call_status as enum ('open', 'to_verify', 'closed');
create type public.client_status as enum ('lead', 'qualified', 'active', 'inactive');
create type public.modality as enum ('fp', 'cd');
create type public.project_stage as enum (
  'prospecting', 'site_visit', 'documentation', 'diagnosis', 'ready',
  'submitted', 'approved', 'execution', 'mv', 'completed', 'lost'
);
create type public.document_status as enum ('pending', 'ok', 'na');
create type public.step_status as enum ('todo', 'in_progress', 'done');
create type public.interaction_kind as enum (
  'call', 'email', 'whatsapp', 'visit', 'meeting', 'other'
);

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Utilities (distribuidoras) and calls (editais)
-- ---------------------------------------------------------------------------

create table public.utilities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete cascade,
  slug text,
  name text not null,
  short_name text not null,
  state text,
  concession_area text,
  website text,
  pee_email text,
  submission_url text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index utilities_global_slug_idx on public.utilities (slug) where org_id is null;
create index utilities_org_id_idx on public.utilities (org_id);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete cascade,
  slug text,
  utility_id uuid not null references public.utilities (id),
  source_call_id uuid references public.calls (id) on delete set null,
  code text not null,
  name text not null,
  status public.call_status not null default 'to_verify',
  published_on date,
  submission_deadline date,
  deadline_note text,
  total_budget numeric(16, 2),
  call_url text,
  submission_url text,
  clarification_email text,
  clarification_subject text,
  notes text,
  rules jsonb not null default '{}'::jsonb check (jsonb_typeof(rules) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index calls_global_slug_idx on public.calls (slug) where org_id is null;
create index calls_org_id_idx on public.calls (org_id);
create index calls_utility_id_idx on public.calls (utility_id);

create function public.is_visible_utility(target uuid, target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target is null or exists (
    select 1 from public.utilities
    where id = target and (org_id is null or org_id = target_org)
  );
$$;

create function public.is_visible_call(target uuid, target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target is null or exists (
    select 1 from public.calls
    where id = target and (org_id is null or org_id = target_org)
  );
$$;

-- ---------------------------------------------------------------------------
-- Clients and contacts
-- ---------------------------------------------------------------------------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  kind text,
  cnpj text,
  municipality text,
  state text,
  utility_id uuid references public.utilities (id),
  typology text,
  modality public.modality,
  status public.client_status not null default 'lead',
  next_action_on date,
  next_action text,
  notes text,
  is_example boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id)
);

create index clients_org_id_idx on public.clients (org_id);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  client_id uuid,
  utility_id uuid references public.utilities (id) on delete cascade,
  name text not null,
  job_title text,
  email text,
  phone text,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, client_id) references public.clients (org_id, id) on delete cascade,
  check (num_nonnulls(client_id, utility_id) = 1)
);

create index contacts_org_id_idx on public.contacts (org_id);
create index contacts_client_id_idx on public.contacts (client_id);
create index contacts_utility_id_idx on public.contacts (utility_id);

-- ---------------------------------------------------------------------------
-- Projects and their details
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  client_id uuid not null,
  call_id uuid references public.calls (id),
  name text not null,
  typology text,
  modality public.modality not null default 'fp',
  voltage_level text,
  municipality text,
  stage public.project_stage not null default 'prospecting',
  is_micro_small_business boolean not null default false,
  has_non_removable_uses boolean not null default false,
  is_heritage_listed boolean not null default false,
  has_incentivized_source boolean not null default false,
  requires_public_bidding boolean not null default false,
  folder_url text,
  responsible text,
  next_action_on date,
  next_action text,
  is_example boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, client_id) references public.clients (org_id, id)
);

create index projects_org_id_idx on public.projects (org_id);
create index projects_client_id_idx on public.projects (client_id);
create index projects_call_id_idx on public.projects (call_id);

create table public.consumer_units (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null,
  number text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade
);

create index consumer_units_project_id_idx on public.consumer_units (project_id);
create index consumer_units_org_number_idx on public.consumer_units (org_id, number);

create table public.project_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null,
  item_key text not null,
  consumer_unit_id uuid,
  status public.document_status not null default 'pending',
  file_path text,
  issued_on date,
  valid_until date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade,
  foreign key (org_id, consumer_unit_id) references public.consumer_units (org_id, id) on delete cascade,
  unique nulls not distinct (project_id, item_key, consumer_unit_id)
);

create table public.efficiency_actions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null,
  end_use text not null,
  description text,
  quantity numeric(14, 2) not null default 0,
  power_before_w numeric(14, 2) not null default 0,
  power_after_w numeric(14, 2) not null default 0,
  hours_per_year numeric(10, 2) not null default 0,
  peak_hours_per_day numeric(6, 2) not null default 0,
  peak_days_per_month numeric(6, 2) not null default 22,
  months_per_year numeric(6, 2) not null default 12,
  useful_life_years numeric(6, 2) not null default 15,
  unit_cost numeric(14, 2) not null default 0,
  energy_saved_mwh_override numeric(14, 4),
  peak_reduction_kw_override numeric(14, 4),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade
);

create index efficiency_actions_project_id_idx on public.efficiency_actions (project_id);

create table public.project_costs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null unique,
  diagnosis numeric(14, 2) not null default 0,
  executive_design numeric(14, 2) not null default 0,
  management numeric(14, 2) not null default 0,
  final_report numeric(14, 2) not null default 0,
  other_services numeric(14, 2) not null default 0,
  marketing numeric(14, 2) not null default 0,
  training numeric(14, 2) not null default 0,
  disposal numeric(14, 2) not null default 0,
  measurement_verification numeric(14, 2) not null default 0,
  counterpart numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade
);

create table public.execution_steps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null,
  step_key text not null,
  status public.step_status not null default 'todo',
  started_on date,
  finished_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade,
  unique (project_id, step_key)
);

-- ---------------------------------------------------------------------------
-- Interactions
-- ---------------------------------------------------------------------------

create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  kind public.interaction_kind not null,
  occurred_on date not null default current_date,
  summary text not null,
  author_name text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  client_id uuid,
  project_id uuid,
  utility_id uuid references public.utilities (id) on delete cascade,
  is_example boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, client_id) references public.clients (org_id, id) on delete cascade,
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade
);

create index interactions_org_id_idx on public.interactions (org_id, occurred_on desc);
create index interactions_client_id_idx on public.interactions (client_id);
create index interactions_project_id_idx on public.interactions (project_id);

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations (id) on delete cascade,
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);

create index audit_log_org_record_idx on public.audit_log (org_id, record_id, changed_at desc);

create function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb := to_jsonb(coalesce(new, old));
begin
  -- Global reference rows have no organization to log against.
  if row_data ->> 'org_id' is null then
    return null;
  end if;
  insert into public.audit_log (org_id, table_name, record_id, action, old_data, new_data)
  values (
    (row_data ->> 'org_id')::uuid,
    tg_table_name,
    (row_data ->> 'id')::uuid,
    lower(tg_op),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers, row level security and grants for every tenant table
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  -- table, roles that read, roles that write, roles that delete
  spec constant text[][] := array[
    ['utilities',          'all',   'admin',                    'admin'],
    ['calls',              'all',   'admin',                    'admin'],
    ['clients',            'all',   'admin,technician,sales',   'admin'],
    ['contacts',           'all',   'admin,technician,sales',   'admin,technician,sales'],
    ['projects',           'all',   'admin,technician,sales',   'admin'],
    ['consumer_units',     'all',   'admin,technician',         'admin,technician'],
    ['project_documents',  'all',   'admin,technician',         'admin,technician'],
    ['efficiency_actions', 'admin,technician', 'admin,technician', 'admin,technician'],
    ['project_costs',      'admin,technician', 'admin,technician', 'admin,technician'],
    ['execution_steps',    'all',   'admin,technician',         'admin,technician'],
    ['interactions',       'all',   'admin,technician,sales',   'admin,technician,sales']
  ];
  read_check text;
  write_check text;
  delete_check text;
  extra_check text;
  i int;
begin
  for i in 1 .. array_length(spec, 1) loop
    t := spec[i][1];

    read_check := case spec[i][2]
      when 'all' then 'public.is_member(org_id)'
      else format('public.has_role(org_id, %L::public.member_role[])', '{' || spec[i][2] || '}')
    end;
    write_check := format('public.has_role(org_id, %L::public.member_role[])', '{' || spec[i][3] || '}');
    delete_check := format('public.has_role(org_id, %L::public.member_role[])', '{' || spec[i][4] || '}');

    -- References to rows that may be global must point to something visible.
    extra_check := case t
      when 'calls' then ' and public.is_visible_utility(utility_id, org_id)'
      when 'clients' then ' and public.is_visible_utility(utility_id, org_id)'
      when 'contacts' then ' and public.is_visible_utility(utility_id, org_id)'
      when 'interactions' then ' and public.is_visible_utility(utility_id, org_id)'
      when 'projects' then ' and public.is_visible_call(call_id, org_id)'
      else ''
    end;

    execute format('alter table public.%I enable row level security', t);

    if t in ('utilities', 'calls') then
      execute format(
        'create policy "read global or own rows" on public.%I for select to authenticated using (org_id is null or %s)',
        t, read_check);
    else
      execute format(
        'create policy "members read rows" on public.%I for select to authenticated using (%s)',
        t, read_check);
    end if;

    execute format(
      'create policy "editors insert rows" on public.%I for insert to authenticated with check (%s%s)',
      t, write_check, extra_check);
    execute format(
      'create policy "editors update rows" on public.%I for update to authenticated using (%s) with check (%s%s)',
      t, write_check, write_check, extra_check);
    execute format(
      'create policy "deleters delete rows" on public.%I for delete to authenticated using (%s)',
      t, delete_check);

    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t);
    execute format(
      'create trigger write_audit_log after insert or update or delete on public.%I for each row execute function public.write_audit_log()',
      t);
  end loop;
end;
$$;

alter table public.audit_log enable row level security;

create policy "admins read the audit log"
  on public.audit_log for select
  to authenticated
  using (public.has_role(org_id, array['admin']::public.member_role[]));

grant select on public.audit_log to authenticated;
