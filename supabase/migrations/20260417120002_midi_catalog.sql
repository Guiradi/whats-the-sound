-- MIDI catalog. Populated manually via admin panel (TASK-021) and seeded in TASK-018.

create table public.midi_catalog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  category midi_category not null,
  difficulty midi_difficulty not null default 'medium',
  year integer check (year >= 1900 and year <= 2030),
  midi_file_url text not null,
  accepted_titles text[] not null default '{}',
  accepted_artists text[] not null default '{}',
  -- phases structure per specs/features/02-midi-engine.md:
  -- {
  --   "phase1": { "tracks": [0], "startBeat": 0, "endBeat": 4, "description": "..." },
  --   "phase2": { ... },
  --   "phase3": { ... },
  --   "phase4": { ... }
  -- }
  phases jsonb not null,
  is_active boolean not null default true,
  play_count integer not null default 0,
  correct_rate real not null default 0.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_midi_category on public.midi_catalog (category) where is_active = true;
create index idx_midi_difficulty on public.midi_catalog (difficulty) where is_active = true;
create index idx_midi_active on public.midi_catalog (is_active);

create trigger midi_catalog_updated_at
  before update on public.midi_catalog
  for each row execute function public.update_updated_at();

alter table public.midi_catalog enable row level security;

-- Anyone (including guests) can read active MIDIs. Answers (title/artist) are filtered
-- by the API layer before round_end; this policy only controls raw row access.
create policy "Anyone can read active midis"
  on public.midi_catalog for select using (is_active = true);

create policy "Admins can manage catalog"
  on public.midi_catalog for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );
