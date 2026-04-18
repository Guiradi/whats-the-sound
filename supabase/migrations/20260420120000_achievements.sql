-- Achievements (conquistas/badges). A user unlocks an achievement once; subsequent attempts
-- are no-op via UNIQUE(user_id, achievement_id). Achievement catalog itself lives in code
-- (packages/shared/src/achievements/catalog.ts), so this table only tracks unlock state.
--
-- On unlock the server awards bonus XP via xp_service with source='achievement_unlocked',
-- so the existing xp_events audit log covers the reward trail.

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  context jsonb,
  unique (user_id, achievement_id)
);

create index idx_user_achievements_user on public.user_achievements (user_id, unlocked_at desc);

alter table public.user_achievements enable row level security;

create policy "Users read own achievements"
  on public.user_achievements for select using (auth.uid() = user_id);

create policy "Admins manage achievements"
  on public.user_achievements for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Inserts happen via achievement_service on the backend (service role bypasses RLS).

alter type xp_source add value if not exists 'achievement_unlocked';
