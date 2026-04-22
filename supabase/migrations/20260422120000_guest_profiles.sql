-- Persistent guest profile records. A guest is identified by a stable UUID that
-- lives in the browser's localStorage (key: wts_guest_id). When the guest later
-- creates a real account via OAuth, the migrated_to column is set so historical
-- context can be attributed to the real user.
--
-- The server writes to this table via the service_role key (bypasses RLS), so
-- the RLS policies below are primarily for future direct-client reads if needed.

create table public.guest_profiles (
  id           uuid primary key,                                    -- matches wts_guest_id in localStorage
  nickname     text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  migrated_to  uuid references auth.users(id) on delete set null
);

create index idx_guest_profiles_migrated on public.guest_profiles (migrated_to)
  where migrated_to is not null;

alter table public.guest_profiles enable row level security;

-- Anyone can read guest profiles (needed for public leaderboards if added later).
create policy "Guest profiles are publicly readable"
  on public.guest_profiles for select using (true);

-- Only the service_role (server) writes to this table — no direct client writes.

-- Auto-update updated_at on row changes.
create trigger guest_profiles_updated_at
  before update on public.guest_profiles
  for each row execute function public.update_updated_at();
