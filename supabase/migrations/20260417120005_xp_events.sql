-- XP event audit log for the system described in specs/features/08-xp-system.md.
-- Service role (server) is the only writer — idempotent via UNIQUE(source, source_ref).

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source xp_source not null,
  -- Stable reference that identifies the source event (round_score.id, daily_result.id,
  -- `streak_<user>_<date>`, etc.). Together with `source`, makes the event idempotent.
  source_ref text not null,
  amount integer not null,
  capped boolean not null default false,
  context jsonb,
  created_at timestamptz not null default now(),
  unique(source, source_ref)
);

create index idx_xp_events_user_date on public.xp_events (user_id, created_at desc);
create index idx_xp_events_source on public.xp_events (source);

alter table public.xp_events enable row level security;

create policy "Users read own xp events"
  on public.xp_events for select using (auth.uid() = user_id);

-- Inserts/updates happen via the xp_service on the backend using the service role key,
-- which bypasses RLS. No client-facing write policies are needed.
