-- ============================================================================
-- 0002_signup_trigger.sql
-- On signup via Supabase Auth, automatically create:
--   1. a row in public.users (status='pending', role=null until approved)
--   2. a row in public.applications (status='pending')
-- Role + reason + experience + social_links are passed in from the client via
-- supabase.auth.signUp({ options: { data: { role, reason, experience, social_links, full_name, username } } })
-- and land in raw_user_meta_data.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_reason text;
  v_experience text;
  v_social_links jsonb;
  v_full_name text;
  v_username text;
begin
  v_role := new.raw_user_meta_data ->> 'role';
  v_reason := new.raw_user_meta_data ->> 'reason';
  v_experience := new.raw_user_meta_data ->> 'experience';
  v_social_links := coalesce(new.raw_user_meta_data -> 'social_links', '{}'::jsonb);
  v_full_name := new.raw_user_meta_data ->> 'full_name';
  v_username := new.raw_user_meta_data ->> 'username';

  insert into public.users (id, email, username, full_name, status)
  values (new.id, new.email, v_username, v_full_name, 'pending')
  on conflict (id) do nothing;

  insert into public.applications (user_id, role, reason, experience, social_links, status)
  values (new.id, v_role, v_reason, v_experience, v_social_links, 'pending');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
