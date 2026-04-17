-- Multiplayer session persistence. Live state lives in-memory on the server;
-- these tables are written at session lifecycle events (create, player-join, game_end).

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null check (char_length(room_code) = 5),
  host_id uuid references public.users(id) on delete set null,
  category midi_category,
  max_rounds integer not null default 10 check (max_rounds in (5, 10, 15)),
  time_per_phase integer not null default 20 check (time_per_phase in (15, 20, 30)),
  max_players integer not null default 12 check (max_players between 2 and 20),
  is_public boolean not null default true,
  status game_status not null default 'waiting',
  current_round integer not null default 0,
  midi_playlist uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create index idx_sessions_room_code on public.game_sessions (room_code);
create index idx_sessions_status on public.game_sessions (status) where status = 'waiting';
create index idx_sessions_public on public.game_sessions (is_public, status)
  where is_public = true and status = 'waiting';

alter table public.game_sessions enable row level security;

create policy "Anyone can read sessions"
  on public.game_sessions for select using (true);

-- Guests cannot create sessions — creation is gated to authenticated users. Guests
-- can still JOIN public rooms via game_players INSERT (policy below). Discussed in
-- specs/technical/database.md "Decisão explícita sobre guest mode".
create policy "Authenticated users can create sessions"
  on public.game_sessions for insert with check (auth.uid() is not null);

create policy "Host can update own session"
  on public.game_sessions for update using (host_id = auth.uid());

-- Players in a session. One row per (session, user). Guests use user_id = null and is_guest = true.
create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  nickname text not null,
  final_score integer not null default 0,
  final_position integer,
  correct_count integer not null default 0,
  is_guest boolean not null default false,
  joined_at timestamptz not null default now(),
  unique(session_id, user_id)
);

create index idx_game_players_session on public.game_players (session_id);
create index idx_game_players_user on public.game_players (user_id) where user_id is not null;
-- Used by host-migration logic: ordering connected players by join time.
create index idx_game_players_session_joined on public.game_players (session_id, joined_at);

alter table public.game_players enable row level security;

create policy "Anyone can read game players"
  on public.game_players for select using (true);

create policy "Players can join games"
  on public.game_players for insert with check (true);

create policy "System can update game players"
  on public.game_players for update using (true);

-- Per-round score record. One row per (session, player, round).
create table public.round_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  player_id uuid not null references public.game_players(id) on delete cascade,
  midi_id uuid not null references public.midi_catalog(id),
  round_number integer not null,
  phase_guessed integer check (phase_guessed between 1 and 4),
  points_earned integer not null default 0,
  guess_position integer,
  created_at timestamptz not null default now(),
  unique(session_id, player_id, round_number)
);

create index idx_round_scores_session on public.round_scores (session_id, round_number);
create index idx_round_scores_player on public.round_scores (player_id);
create index idx_round_scores_midi on public.round_scores (midi_id);

alter table public.round_scores enable row level security;

create policy "Anyone can read scores"
  on public.round_scores for select using (true);

create policy "System can insert scores"
  on public.round_scores for insert with check (true);
