-- Login tracking for daily retention loop.
-- Adds last_login_date + login_streak columns to users, and new xp_source values.
-- See specs/features/08-xp-system.md for the engagement design.

alter table public.users
  add column last_login_date date,
  add column login_streak integer not null default 0 check (login_streak >= 0),
  add column max_login_streak integer not null default 0 check (max_login_streak >= 0);

create index idx_users_login_streak on public.users (login_streak desc);

-- Extend xp_source enum with new engagement sources.
alter type xp_source add value if not exists 'daily_login';
alter type xp_source add value if not exists 'login_streak_bonus';
alter type xp_source add value if not exists 'multiplayer_round_played';
alter type xp_source add value if not exists 'first_match_of_day';
alter type xp_source add value if not exists 'referral_bonus';
