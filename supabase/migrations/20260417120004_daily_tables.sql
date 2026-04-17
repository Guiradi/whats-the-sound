-- Daily Sound state. Pre-computed schedule per day + per-user results.

create table public.daily_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  midi_id uuid not null references public.midi_catalog(id),
  date date not null,
  phase_guessed integer check (phase_guessed between 1 and 4),
  -- attempts: [
  --   { "phase": 1, "guess": "bohemian...", "result": "wrong" },
  --   { "phase": 2, "guess": "bohemian rhapsody", "result": "correct" }
  -- ]
  attempts jsonb not null default '[]',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

create index idx_daily_user_date on public.daily_results (user_id, date desc);
create index idx_daily_date on public.daily_results (date);
-- Partial index for the history calendar: only completed days are shown.
create index idx_daily_user_completed on public.daily_results (user_id, date desc)
  where completed = true;

alter table public.daily_results enable row level security;

create policy "Users can read own daily results"
  on public.daily_results for select using (auth.uid() = user_id);

create policy "Users can insert own daily results"
  on public.daily_results for insert with check (auth.uid() = user_id);

create policy "Users can update own daily results"
  on public.daily_results for update using (auth.uid() = user_id);

-- Pre-computed daily selections, written by the Railway cron at 03:00 UTC (= 00:00 BRT).
-- Idempotent: selecting the same date is a no-op (UPSERT). See specs/features/05-daily-sound.md.
create table public.daily_schedule (
  date date primary key,
  midi_id uuid not null references public.midi_catalog(id),
  category midi_category,
  total_plays integer not null default 0,
  total_correct integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_daily_schedule_date on public.daily_schedule (date desc);

alter table public.daily_schedule enable row level security;

create policy "Anyone can read daily schedule"
  on public.daily_schedule for select using (true);

create policy "Only admins can manage schedule"
  on public.daily_schedule for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );
