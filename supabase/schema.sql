create extension if not exists pgcrypto;

do $$ begin
    create type membership_role as enum ('owner', 'admin', 'editor', 'analyst', 'viewer');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type study_status as enum ('draft', 'published', 'archived');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type session_status as enum ('in_progress', 'completed', 'disqualified');
exception
    when duplicate_object then null;
end $$;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role membership_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  study_type text not null check (study_type in ('ux_research', 'psychology_study')),
  created_at timestamptz not null default now()
);

create table if not exists studies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  public_id text unique not null,
  title text not null,
  status study_status not null default 'draft',
  config jsonb not null default '{}'::jsonb,
  published_version_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists study_versions (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  version_no int not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (study_id, version_no)
);

alter table studies add column if not exists published_version_id uuid;
alter table studies drop constraint if exists studies_published_version_id_fkey;
alter table studies
  add constraint studies_published_version_id_fkey
  foreign key (published_version_id)
  references study_versions(id)
  on delete set null;

create table if not exists study_blocks (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  block_type text not null check (block_type in ('survey', 'multiple_choice', 'ux_task', 'iat', 'reaction_time', 'consent', 'brs', 'thank_you')),
  label text not null,
  sort_order int not null default 0,
  config jsonb not null default '{}'::jsonb
);

create table if not exists logic_rules (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  source_block_id uuid not null references study_blocks(id) on delete cascade,
  condition jsonb not null,
  target_block_id uuid references study_blocks(id) on delete set null,
  terminate boolean not null default false
);

create table if not exists randomization_rules (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  block_group jsonb not null default '[]'::jsonb,
  method text not null default 'shuffle' check (method in ('shuffle', 'rotate')),
  created_at timestamptz not null default now()
);

create table if not exists disqualification_rules (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  condition jsonb not null default '{}'::jsonb,
  disqualify_message text not null default 'Thank you. You are not eligible for this study.',
  created_at timestamptz not null default now()
);

create table if not exists participant_sessions (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  participant_token text unique default encode(gen_random_bytes(18), 'hex'),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status session_status not null default 'in_progress',
  device text,
  locale text
);

create table if not exists magic_links (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  audience_id uuid,
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz,
  max_uses int,
  used_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists audiences (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table magic_links add column if not exists audience_id uuid;
alter table magic_links drop constraint if exists magic_links_audience_id_fkey;
alter table magic_links
  add constraint magic_links_audience_id_fkey
  foreign key (audience_id)
  references audiences(id)
  on delete set null;

create table if not exists audience_members (
  id uuid primary key default gen_random_uuid(),
  audience_id uuid not null references audiences(id) on delete cascade,
  email text,
  label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  participant_session_id uuid not null references participant_sessions(id) on delete cascade,
  consent_text_version text not null,
  accepted boolean not null,
  accepted_at timestamptz not null default now()
);

create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  participant_session_id uuid not null references participant_sessions(id) on delete cascade,
  question_key text not null,
  response_type text not null check (response_type in ('text', 'likert', 'mcq', 'task', 'time_ms')),
  text_value text,
  numeric_value double precision,
  json_value jsonb,
  created_at timestamptz not null default now()
);

create table if not exists psych_trials (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  participant_session_id uuid not null references participant_sessions(id) on delete cascade,
  trial_type text not null check (trial_type in ('iat', 'reaction_time')),
  stimulus text not null,
  expected_response text,
  actual_response text,
  reaction_time_ms int,
  is_correct boolean,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  participant_session_id uuid not null references participant_sessions(id) on delete cascade,
  event_type text not null,
  event_time timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists friction_alerts (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  participant_session_id uuid references participant_sessions(id) on delete set null,
  alert_type text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  details jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists request_replay_guards (
  request_id text primary key,
  route text not null,
  created_at timestamptz not null default now()
);

create table if not exists security_audit_logs (
  id uuid primary key default gen_random_uuid(),
  route text not null,
  action text not null,
  outcome text not null check (outcome in ('success', 'blocked', 'error')),
  actor_user_id uuid references auth.users(id) on delete set null,
  ip_address text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists study_threshold_audit_logs (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  preset_name text,
  old_thresholds jsonb not null default '{}'::jsonb,
  new_thresholds jsonb not null default '{}'::jsonb,
  changed_at timestamptz not null default now()
);

create index if not exists idx_studies_status on studies(status);
create index if not exists idx_responses_created_at on responses(created_at);
create index if not exists idx_participant_sessions_study on participant_sessions(study_id);
create index if not exists idx_friction_alerts_resolved on friction_alerts(resolved);
create index if not exists idx_memberships_user on organization_memberships(user_id);
alter table projects add column if not exists organization_id uuid references organizations(id) on delete cascade;
create index if not exists idx_projects_org on projects(organization_id);
create index if not exists idx_magic_links_token on magic_links(token);
create index if not exists idx_psych_trials_type on psych_trials(trial_type);
create index if not exists idx_audit_logs_created on security_audit_logs(created_at);
create index if not exists idx_threshold_audit_study_changed on study_threshold_audit_logs(study_id, changed_at desc);

-- Study collaboration support
alter table studies add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table studies add column if not exists allow_collaborators boolean not null default false;

-- BRS block type support: update CHECK constraint to allow 'brs'
alter table study_blocks drop constraint if exists study_blocks_block_type_check;
alter table study_blocks add constraint study_blocks_block_type_check
  check (block_type in ('survey', 'multiple_choice', 'ux_task', 'iat', 'reaction_time', 'consent', 'brs', 'thank_you'));
