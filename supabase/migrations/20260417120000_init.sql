-- Enums and shared functions used across the schema.

-- Categories of MIDIs in the catalog. Expanded in Phase 2+.
create type midi_category as enum (
  'rock',
  'pop',
  'mpb',
  'sertanejo',
  'games',
  'anime',
  'classical',
  'electronic',
  'hiphop'
);

-- Curated difficulty level per song.
create type midi_difficulty as enum ('easy', 'medium', 'hard');

-- Lifecycle of a multiplayer session, persisted in the DB for cold storage (live state lives in-memory on the server).
create type game_status as enum ('waiting', 'playing', 'finished');

-- User roles. Admins can manage catalog and see internal dev docs.
create type user_role as enum ('player', 'admin');

-- Sources that can grant XP, tracked in xp_events for audit + idempotency.
create type xp_source as enum (
  'multiplayer_correct',
  'multiplayer_finish',
  'daily_correct',
  'daily_participation',
  'daily_streak_bonus'
);

-- Reusable trigger that stamps `updated_at = now()` on any BEFORE UPDATE.
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
