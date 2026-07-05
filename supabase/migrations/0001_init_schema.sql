-- ============================================================================
-- 0001_init_schema.sql
-- Core schema for the esports team management platform.
-- Run after enabling the "pgcrypto" or "pgcrypto"/"uuid-ossp" extension
-- (Supabase enables gen_random_uuid() via pgcrypto by default).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- users
-- Mirrors auth.users 1:1 via id. Linked to the Discord bot via discord_id.
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  username text unique,
  full_name text,
  role text check (role in ('player','manager','coach','staff','admin')),
  status text default 'pending' check (status in ('pending','approved','rejected','suspended')),
  avatar_url text,
  bio text,
  country text,
  discord_id text unique,
  ign text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_users_discord_id on public.users (discord_id);
create index if not exists idx_users_role on public.users (role);
create index if not exists idx_users_status on public.users (status);

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role text,
  reason text,
  experience text,
  social_links jsonb default '{}'::jsonb,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_applications_user_id on public.applications (user_id);
create index if not exists idx_applications_status on public.applications (status);

-- ---------------------------------------------------------------------------
-- rosters
-- ---------------------------------------------------------------------------
create table if not exists public.rosters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  game text not null,
  slug text unique not null,
  description text,
  logo_url text,
  cover_url text,
  region text,
  active boolean default true,
  manager_id uuid references public.users(id),
  accent_color text default '#8943F9',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_rosters_slug on public.rosters (slug);
create index if not exists idx_rosters_manager_id on public.rosters (manager_id);

-- ---------------------------------------------------------------------------
-- roster_members
-- ---------------------------------------------------------------------------
create table if not exists public.roster_members (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.rosters(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  ign text,
  pro_image_url text,
  position text,
  jersey_number int,
  is_captain boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (roster_id, user_id)
);

create index if not exists idx_roster_members_roster_id on public.roster_members (roster_id);
create index if not exists idx_roster_members_user_id on public.roster_members (user_id);

-- ---------------------------------------------------------------------------
-- matches
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.rosters(id) on delete cascade,
  created_by uuid references public.users(id),
  opponent_name text not null,
  opponent_players jsonb default '[]'::jsonb,
  tournament text,
  week int,
  day int,
  region text,
  match_date timestamptz,
  team_score int default 0,
  opp_score int default 0,
  status text default 'scheduled' check (status in ('scheduled','live','completed','cancelled')),
  scoreboard_image_url text,
  ocr_raw_text text,
  parsed_scoreboard jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_matches_roster_id on public.matches (roster_id);
create index if not exists idx_matches_status on public.matches (status);
create index if not exists idx_matches_match_date on public.matches (match_date);

-- ---------------------------------------------------------------------------
-- match_maps
-- ---------------------------------------------------------------------------
create table if not exists public.match_maps (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  map_name text not null,
  mode text check (mode in ('Hardpoint','Search & Destroy','Control')),
  team_score int,
  opp_score int,
  order_num int not null,
  status text default 'pending' check (status in ('pending','played','skipped')),
  vod_url text,
  map_image_url text,
  scoreboard_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (match_id, order_num)
);

create index if not exists idx_match_maps_match_id on public.match_maps (match_id);

-- ---------------------------------------------------------------------------
-- player_stats
-- ---------------------------------------------------------------------------
create table if not exists public.player_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  kills int default 0,
  deaths int default 0,
  assists int default 0,
  obj_time int default 0,
  points int default 0,
  is_mvp boolean default false,
  raw_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_player_stats_match_id on public.player_stats (match_id);
create index if not exists idx_player_stats_user_id on public.player_stats (user_id);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  content text,
  type text check (type in ('text','video','document','link')),
  media_url text,
  assigned_to uuid[] default '{}'::uuid[],
  due_date timestamptz,
  priority text default 'medium' check (priority in ('low','medium','high')),
  status text default 'open' check (status in ('open','in_progress','done')),
  target_roster_id uuid references public.rosters(id),
  upvotes int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tasks_creator_id on public.tasks (creator_id);
create index if not exists idx_tasks_target_roster_id on public.tasks (target_roster_id);
create index if not exists idx_tasks_assigned_to on public.tasks using gin (assigned_to);

-- ---------------------------------------------------------------------------
-- task_comments
-- ---------------------------------------------------------------------------
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  upvotes int default 0,
  mentions jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_task_comments_task_id on public.task_comments (task_id);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text,
  content text,
  link text,
  read boolean default false,
  actor_id uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_notifications_user_id on public.notifications (user_id);
create index if not exists idx_notifications_read on public.notifications (user_id, read);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  read boolean default false,
  mentions jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_messages_sender_id on public.messages (sender_id);
create index if not exists idx_messages_receiver_id on public.messages (receiver_id);
create index if not exists idx_messages_conversation on public.messages (sender_id, receiver_id, created_at);

-- ---------------------------------------------------------------------------
-- meeting_requests
-- ---------------------------------------------------------------------------
create table if not exists public.meeting_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  category text check (category in ('coaching','strategy','media','admin','other')),
  requested_date timestamptz not null,
  duration_minutes int default 60,
  status text default 'pending' check (status in ('pending','approved','rejected','rescheduled')),
  admin_note text,
  approved_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_meeting_requests_requester_id on public.meeting_requests (requester_id);
create index if not exists idx_meeting_requests_status on public.meeting_requests (status);

-- ---------------------------------------------------------------------------
-- admin_events
-- ---------------------------------------------------------------------------
create table if not exists public.admin_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  type text,
  invited_user_ids uuid[] default '{}'::uuid[],
  created_by uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_admin_events_start_time on public.admin_events (start_time);

-- ---------------------------------------------------------------------------
-- admin_unavailable
-- ---------------------------------------------------------------------------
create table if not exists public.admin_unavailable (
  id uuid primary key default gen_random_uuid(),
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text,
  created_by uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_admin_unavailable_start_time on public.admin_unavailable (start_time);

-- ---------------------------------------------------------------------------
-- achievements
-- ---------------------------------------------------------------------------
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  icon text,
  awarded_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_achievements_user_id on public.achievements (user_id);

-- ---------------------------------------------------------------------------
-- updated_at auto-touch trigger (applied to every table)
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'users','applications','rosters','roster_members','matches','match_maps',
    'player_stats','tasks','task_comments','notifications','messages',
    'meeting_requests','admin_events','admin_unavailable','achievements'
  ])
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; '
      'create trigger set_updated_at before update on public.%I '
      'for each row execute function public.touch_updated_at();',
      t, t
    );
  end loop;
end;
$$;
