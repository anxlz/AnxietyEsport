-- ============================================================================
-- 0003_rls.sql
-- Row Level Security policies for every table.
--
-- Helper functions are SECURITY DEFINER + STABLE so they can be used inside
-- RLS policies on public.users itself without causing infinite recursion
-- (a normal "exists (select ... from public.users where id = auth.uid())"
-- subquery inside a policy ON public.users would recurse).
-- ============================================================================

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.users where id = auth.uid()), false);
$$;

create or replace function public.is_roster_manager(p_roster_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.rosters
    where id = p_roster_id and manager_id = auth.uid()
  );
$$;

create or replace function public.is_roster_member(p_roster_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.roster_members
    where roster_id = p_roster_id and user_id = auth.uid()
  );
$$;

-- Enable RLS on every table
alter table public.users enable row level security;
alter table public.applications enable row level security;
alter table public.rosters enable row level security;
alter table public.roster_members enable row level security;
alter table public.matches enable row level security;
alter table public.match_maps enable row level security;
alter table public.player_stats enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.meeting_requests enable row level security;
alter table public.admin_events enable row level security;
alter table public.admin_unavailable enable row level security;
alter table public.achievements enable row level security;

-- ---------------------------------------------------------------------------
-- users: anyone (incl. anon) can read public profiles; only self can write
-- own row; admin can write all.
-- ---------------------------------------------------------------------------
create policy "users_select_public" on public.users
  for select using (true);

create policy "users_update_self" on public.users
  for update using (auth.uid() = id);

create policy "users_update_admin" on public.users
  for update using (public.is_admin());

create policy "users_insert_admin" on public.users
  for insert with check (public.is_admin());
-- Note: the normal signup path inserts via the SECURITY DEFINER trigger
-- (handle_new_user), which bypasses RLS entirely, so no self-insert policy
-- is needed for signup.

-- ---------------------------------------------------------------------------
-- applications: only self can read own; admin can read/write all.
-- ---------------------------------------------------------------------------
create policy "applications_select_self" on public.applications
  for select using (auth.uid() = user_id);

create policy "applications_select_admin" on public.applications
  for select using (public.is_admin());

create policy "applications_update_admin" on public.applications
  for update using (public.is_admin());

-- ---------------------------------------------------------------------------
-- rosters: public read; manager of the roster (or admin) can write.
-- ---------------------------------------------------------------------------
create policy "rosters_select_public" on public.rosters
  for select using (true);

create policy "rosters_insert_admin" on public.rosters
  for insert with check (public.is_admin());

create policy "rosters_update_manager_or_admin" on public.rosters
  for update using (manager_id = auth.uid() or public.is_admin());

create policy "rosters_delete_admin" on public.rosters
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- roster_members: public read; manager of that roster (or admin) can write.
-- ---------------------------------------------------------------------------
create policy "roster_members_select_public" on public.roster_members
  for select using (true);

create policy "roster_members_write_manager_or_admin" on public.roster_members
  for all using (public.is_roster_manager(roster_id) or public.is_admin())
  with check (public.is_roster_manager(roster_id) or public.is_admin());

-- ---------------------------------------------------------------------------
-- matches: roster members can read; manager of that roster (or admin) writes.
-- Public results (completed matches) are also readable by anyone.
-- ---------------------------------------------------------------------------
create policy "matches_select_roster_member" on public.matches
  for select using (
    public.is_roster_member(roster_id)
    or public.is_roster_manager(roster_id)
    or public.is_admin()
    or status = 'completed'
  );

create policy "matches_write_manager_or_admin" on public.matches
  for all using (public.is_roster_manager(roster_id) or public.is_admin())
  with check (public.is_roster_manager(roster_id) or public.is_admin());

-- ---------------------------------------------------------------------------
-- match_maps: follows parent match visibility/writability.
-- ---------------------------------------------------------------------------
create policy "match_maps_select" on public.match_maps
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (
          public.is_roster_member(m.roster_id)
          or public.is_roster_manager(m.roster_id)
          or public.is_admin()
          or m.status = 'completed'
        )
    )
  );

create policy "match_maps_write" on public.match_maps
  for all using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (public.is_roster_manager(m.roster_id) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (public.is_roster_manager(m.roster_id) or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- player_stats: roster members of the parent match's roster can read;
-- manager/admin can write. Players can read their own row regardless.
-- ---------------------------------------------------------------------------
create policy "player_stats_select" on public.player_stats
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.matches m
      where m.id = match_id
        and (public.is_roster_member(m.roster_id) or public.is_roster_manager(m.roster_id) or public.is_admin())
    )
  );

create policy "player_stats_write" on public.player_stats
  for all using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (public.is_roster_manager(m.roster_id) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (public.is_roster_manager(m.roster_id) or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- tasks: assigned users can read; creator can read/write; admin reads all.
-- ---------------------------------------------------------------------------
create policy "tasks_select_assigned_or_creator_or_admin" on public.tasks
  for select using (
    auth.uid() = creator_id
    or auth.uid() = any (assigned_to)
    or public.is_admin()
    or (target_roster_id is not null and public.is_roster_member(target_roster_id))
  );

create policy "tasks_write_creator_or_admin" on public.tasks
  for insert with check (auth.uid() = creator_id or public.is_admin());

create policy "tasks_update_creator_or_admin" on public.tasks
  for update using (auth.uid() = creator_id or public.is_admin());

create policy "tasks_update_assignee_status" on public.tasks
  for update using (auth.uid() = any (assigned_to))
  with check (auth.uid() = any (assigned_to));

create policy "tasks_delete_creator_or_admin" on public.tasks
  for delete using (auth.uid() = creator_id or public.is_admin());

-- ---------------------------------------------------------------------------
-- task_comments: visible to anyone who can see the parent task.
-- ---------------------------------------------------------------------------
create policy "task_comments_select" on public.task_comments
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          auth.uid() = t.creator_id
          or auth.uid() = any (t.assigned_to)
          or public.is_admin()
          or (t.target_roster_id is not null and public.is_roster_member(t.target_roster_id))
        )
    )
  );

create policy "task_comments_insert_self" on public.task_comments
  for insert with check (auth.uid() = user_id);

create policy "task_comments_update_self_or_admin" on public.task_comments
  for update using (auth.uid() = user_id or public.is_admin());

create policy "task_comments_delete_self_or_admin" on public.task_comments
  for delete using (auth.uid() = user_id or public.is_admin());

-- ---------------------------------------------------------------------------
-- notifications: only the target user can read/update.
-- ---------------------------------------------------------------------------
create policy "notifications_select_self" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_update_self" on public.notifications
  for update using (auth.uid() = user_id);

create policy "notifications_insert_any_authenticated" on public.notifications
  for insert with check (auth.uid() is not null);
-- Note: notifications are typically created server-side via the service role
-- key (e.g. in a server action or route handler) which bypasses RLS anyway.
-- This policy just allows authenticated client-side inserts as a fallback.

-- ---------------------------------------------------------------------------
-- messages: only sender or receiver can read; sender can insert.
-- ---------------------------------------------------------------------------
create policy "messages_select_participant" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "messages_insert_sender" on public.messages
  for insert with check (auth.uid() = sender_id);

create policy "messages_update_receiver_mark_read" on public.messages
  for update using (auth.uid() = receiver_id);

-- ---------------------------------------------------------------------------
-- meeting_requests: only requester can read own; admin can read/write all.
-- ---------------------------------------------------------------------------
create policy "meeting_requests_select_self_or_admin" on public.meeting_requests
  for select using (auth.uid() = requester_id or public.is_admin());

create policy "meeting_requests_insert_self" on public.meeting_requests
  for insert with check (auth.uid() = requester_id);

create policy "meeting_requests_update_admin" on public.meeting_requests
  for update using (public.is_admin());

-- ---------------------------------------------------------------------------
-- admin_events: readable by admin + invited users; writable by admin.
-- ---------------------------------------------------------------------------
create policy "admin_events_select_invited_or_admin" on public.admin_events
  for select using (auth.uid() = any (invited_user_ids) or public.is_admin());

create policy "admin_events_write_admin" on public.admin_events
  for all using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- admin_unavailable: public read (so anyone booking a meeting can see
-- blocked slots), admin write.
-- ---------------------------------------------------------------------------
create policy "admin_unavailable_select_public" on public.admin_unavailable
  for select using (true);

create policy "admin_unavailable_write_admin" on public.admin_unavailable
  for all using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- achievements: public read (shown on player profiles), admin/self write.
-- ---------------------------------------------------------------------------
create policy "achievements_select_public" on public.achievements
  for select using (true);

create policy "achievements_write_admin" on public.achievements
  for all using (public.is_admin())
  with check (public.is_admin());
