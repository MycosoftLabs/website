create table if not exists public.nlm_models (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'idle',
  config jsonb not null default '{}'::jsonb,
  version text not null default '1.0',
  accuracy numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nlm_training_runs (
  id uuid primary key default gen_random_uuid(),
  model_id uuid references public.nlm_models(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  status text not null default 'queued',
  config jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reconcile with earlier 20260324120000_unified_capabilities.sql which created
-- nlm_training_runs with a different schema (run_name/model_architecture/
-- hyperparameters/current_epoch/current_loss + a status CHECK constraint that
-- doesn't include 'queued'). If that ran first, CREATE IF NOT EXISTS above
-- silently skips and we'd be missing these columns plus blocked by the CHECK.
alter table public.nlm_training_runs
  add column if not exists model_id   uuid references public.nlm_models(id) on delete cascade,
  add column if not exists owner_id   uuid references auth.users(id) on delete cascade,
  add column if not exists config     jsonb not null default '{}'::jsonb,
  add column if not exists metrics    jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.nlm_training_runs
  drop constraint if exists nlm_training_runs_status_check;

create table if not exists public.nlm_checkpoints (
  id uuid primary key default gen_random_uuid(),
  model_id uuid references public.nlm_models(id) on delete cascade,
  run_id uuid references public.nlm_training_runs(id) on delete set null,
  owner_id uuid references auth.users(id) on delete cascade,
  path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Reconcile with earlier 20260324120000_unified_capabilities.sql which created
-- nlm_checkpoints with epoch/s3_url/validation_score/is_best instead of
-- model_id/owner_id/path/metadata.
alter table public.nlm_checkpoints
  add column if not exists model_id  uuid references public.nlm_models(id) on delete cascade,
  add column if not exists owner_id  uuid references auth.users(id) on delete cascade,
  add column if not exists path      text,
  add column if not exists metadata  jsonb not null default '{}'::jsonb;

create table if not exists public.nlm_variants (
  id text primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  streams jsonb not null default '{}'::jsonb,
  core jsonb not null default '{}'::jsonb,
  preconditioners jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nlm_dashboard_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  message text not null default '',
  source text not null default 'MYCA',
  read boolean not null default false,
  action_url text,
  action_label text,
  correlation_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Prod notifications predates this migration with only:
-- (id, user_id, type, title, message, read, action_url, created_at, updated_at).
-- Backfill the four columns this file expects so code can rely on them.
alter table public.notifications
  add column if not exists source         text not null default 'MYCA',
  add column if not exists action_label   text,
  add column if not exists correlation_id text,
  add column if not exists metadata       jsonb not null default '{}'::jsonb;

create table if not exists public.mindex_etl_requests (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  app text,
  route text,
  query text,
  missing text[] not null default '{}'::text[],
  context jsonb not null default '{}'::jsonb,
  prompt text not null,
  status text not null default 'queued',
  assigned_agent text,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nlm_models_owner_created_idx on public.nlm_models(owner_id, created_at desc);
create index if not exists nlm_training_runs_model_created_idx on public.nlm_training_runs(model_id, created_at desc);
create index if not exists nlm_checkpoints_model_created_idx on public.nlm_checkpoints(model_id, created_at desc);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists mindex_etl_requests_status_created_idx on public.mindex_etl_requests(status, created_at desc);
create index if not exists mindex_etl_requests_app_created_idx on public.mindex_etl_requests(app, created_at desc);

alter table public.nlm_models enable row level security;
alter table public.nlm_training_runs enable row level security;
alter table public.nlm_checkpoints enable row level security;
alter table public.nlm_variants enable row level security;
alter table public.nlm_dashboard_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.mindex_etl_requests enable row level security;

drop policy if exists "nlm_models_owner_access" on public.nlm_models;
create policy "nlm_models_owner_access" on public.nlm_models
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "nlm_training_runs_owner_access" on public.nlm_training_runs;
create policy "nlm_training_runs_owner_access" on public.nlm_training_runs
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "nlm_checkpoints_owner_access" on public.nlm_checkpoints;
create policy "nlm_checkpoints_owner_access" on public.nlm_checkpoints
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "nlm_variants_owner_access" on public.nlm_variants;
create policy "nlm_variants_owner_access" on public.nlm_variants
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "nlm_dashboard_preferences_owner_access" on public.nlm_dashboard_preferences;
create policy "nlm_dashboard_preferences_owner_access" on public.nlm_dashboard_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications_owner_access" on public.notifications;
create policy "notifications_owner_access" on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "mindex_etl_requests_admin_read" on public.mindex_etl_requests;
create policy "mindex_etl_requests_admin_read" on public.mindex_etl_requests
  for select using (false);
