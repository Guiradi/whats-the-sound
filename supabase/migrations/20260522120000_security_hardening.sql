-- ============================================================================
-- Security hardening migration.
--
-- Fixes from security audit:
--   [CRITICAL] midi_catalog SELECT leaks title/artist/accepted_titles/accepted_artists
--   [CRITICAL] game_players permissive INSERT/UPDATE allows score forgery via trigger
--   [HIGH]     users SELECT exposes email/role/referral_code/last_login_date
--   [HIGH]     round_scores permissive INSERT allows stats forgery via trigger
--   [HIGH]     admin_config public SELECT bleeds future config keys
--   [HIGH]     SECURITY DEFINER trigger funcs missing `set search_path`
--   [HIGH]     guest_profiles + migrated_to enables deanonymization
--
-- Strategy:
--   1. Hide sensitive columns via column-level grants. RLS policies stay but
--      PostgREST projection respects the grant.
--   2. Drop permissive INSERT/UPDATE policies on tables the server-only writes
--      (server uses service_role which bypasses RLS — no breaking change).
--   3. Replace direct `role` reads with `is_current_user_admin()` RPC so the
--      role column never reaches anon/authenticated clients.
--   4. Recreate SECURITY DEFINER triggers with explicit `set search_path` to
--      prevent search-path hijacking.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- midi_catalog: hide title / artist / accepted_titles / accepted_artists
-- ----------------------------------------------------------------------------
revoke select on public.midi_catalog from anon, authenticated;
grant select (
  id, category, difficulty, year, midi_file_url, phases, is_active,
  play_count, correct_rate, created_at, updated_at
) on public.midi_catalog to anon, authenticated;

-- service_role always retains full access.
grant all on public.midi_catalog to service_role;


-- ----------------------------------------------------------------------------
-- daily_schedule: clients no longer read this table directly; backend mediates.
-- ----------------------------------------------------------------------------
drop policy if exists "Anyone can read daily schedule" on public.daily_schedule;
grant all on public.daily_schedule to service_role;


-- ----------------------------------------------------------------------------
-- users: hide email / role / referral_* / last_login_date / login_streak
--
-- Public-safe columns (anon + authenticated): identity + game stats only.
-- Server reads private columns via service_role.
-- ----------------------------------------------------------------------------
revoke select on public.users from anon, authenticated;
grant select (
  id, nickname, avatar_url,
  total_games, total_wins, total_correct,
  daily_streak, max_daily_streak,
  points_total, xp, level,
  max_login_streak,
  created_at
) on public.users to anon, authenticated;

grant all on public.users to service_role;


-- ----------------------------------------------------------------------------
-- is_current_user_admin(): boolean RPC so the role column never reaches clients.
--
-- Replaces the direct `select role from users where id = auth.uid()` query in
-- apps/web/src/middleware/require-admin.ts.
-- ----------------------------------------------------------------------------
create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
set search_path = pg_catalog, public
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- game_sessions: drop permissive INSERT/UPDATE — server uses service_role.
-- ----------------------------------------------------------------------------
drop policy if exists "Authenticated users can create sessions" on public.game_sessions;
drop policy if exists "Host can update own session" on public.game_sessions;
grant all on public.game_sessions to service_role;


-- ----------------------------------------------------------------------------
-- game_players: drop permissive INSERT/UPDATE — server uses service_role.
-- Score forgery vector (combined with the SECURITY DEFINER stats trigger).
-- ----------------------------------------------------------------------------
drop policy if exists "Players can join games" on public.game_players;
drop policy if exists "System can update game players" on public.game_players;
grant all on public.game_players to service_role;


-- ----------------------------------------------------------------------------
-- round_scores: drop permissive INSERT — server uses service_role.
-- Catalog-stats forgery vector (combined with the SECURITY DEFINER midi-stats trigger).
-- ----------------------------------------------------------------------------
drop policy if exists "System can insert scores" on public.round_scores;
grant all on public.round_scores to service_role;


-- ----------------------------------------------------------------------------
-- admin_config: restrict SELECT to admins. Frontend hits /api/admin/disabled-categories.
-- ----------------------------------------------------------------------------
drop policy if exists admin_config_select on public.admin_config;
create policy admin_config_select on public.admin_config
  for select using (public.is_current_user_admin());

-- Tighten admin INSERT/UPDATE to use the new RPC (no change in semantics, fewer table reads).
drop policy if exists admin_config_insert on public.admin_config;
create policy admin_config_insert on public.admin_config
  for insert with check (public.is_current_user_admin());

drop policy if exists admin_config_update on public.admin_config;
create policy admin_config_update on public.admin_config
  for update using (public.is_current_user_admin());

grant all on public.admin_config to service_role;


-- ----------------------------------------------------------------------------
-- guest_profiles: drop public SELECT — server mediates leaderboard access.
-- migrated_to + users.email together enabled deanonymization of migrated guests.
-- ----------------------------------------------------------------------------
drop policy if exists "Guest profiles are publicly readable" on public.guest_profiles;
grant all on public.guest_profiles to service_role;


-- ============================================================================
-- SECURITY DEFINER trigger functions — add `set search_path` (CVE-2018-1058 hardening).
-- Recreate functions in place; the triggers reference them by name so no rebinding needed.
-- ============================================================================

create or replace function public.update_user_stats_after_game()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.user_id is not null and new.final_position is not null then
    update public.users set
      total_games = total_games + 1,
      total_wins = total_wins + case when new.final_position = 1 then 1 else 0 end,
      total_correct = total_correct + new.correct_count,
      points_total = points_total + new.final_score
    where id = new.user_id;
  end if;
  return new;
end;
$$;


create or replace function public.update_daily_streak()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  yesterday_played boolean;
begin
  select exists (
    select 1 from public.daily_results
    where user_id = new.user_id
    and date = new.date - interval '1 day'
  ) into yesterday_played;

  if yesterday_played then
    update public.users set
      daily_streak = daily_streak + 1,
      max_daily_streak = greatest(max_daily_streak, daily_streak + 1)
    where id = new.user_id;
  else
    update public.users set
      daily_streak = 1,
      max_daily_streak = greatest(max_daily_streak, 1)
    where id = new.user_id;
  end if;

  return new;
end;
$$;


create or replace function public.update_midi_stats()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.midi_catalog set
    play_count = play_count + 1,
    correct_rate = (
      select coalesce(avg(case when phase_guessed is not null then 1.0 else 0.0 end), 0)
      from public.round_scores where midi_id = new.midi_id
    )
  where id = new.midi_id;
  return new;
end;
$$;


-- sync_user_level is plain (not SECURITY DEFINER) so no change needed.
-- handle_new_user already sets search_path = public (kept as-is).
-- generate_referral_code is plain language plpgsql, not SECURITY DEFINER.
