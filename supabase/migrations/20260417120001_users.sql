-- Public-facing user profiles, auto-created on OAuth sign-up via trigger on auth.users.

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text unique not null check (
    char_length(nickname) between 3 and 20
    and nickname ~ '^[a-zA-Z0-9_]+$'
  ),
  avatar_url text,
  role user_role not null default 'player',
  total_games integer not null default 0,
  total_wins integer not null default 0,
  total_correct integer not null default 0,
  daily_streak integer not null default 0,
  max_daily_streak integer not null default 0,
  points_total bigint not null default 0,
  xp bigint not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_users_nickname on public.users (nickname);
create index idx_users_points_total on public.users (points_total desc);
create index idx_users_daily_streak on public.users (daily_streak desc);
create index idx_users_xp on public.users (xp desc);
create index idx_users_level on public.users (level desc, xp desc);

create trigger users_updated_at
  before update on public.users
  for each row execute function public.update_updated_at();

-- Keeps users.level derived from users.xp using the formula from @wts/shared constants:
-- level = floor(sqrt(xp / 100)) + 1.  Mirroring the formula in SQL avoids client/server drift.
create or replace function public.sync_user_level()
returns trigger
language plpgsql
as $$
begin
  new.level = floor(sqrt(new.xp::numeric / 100))::int + 1;
  return new;
end;
$$;

create trigger users_level_on_insert
  before insert on public.users
  for each row execute function public.sync_user_level();

create trigger users_level_on_xp_change
  before update of xp on public.users
  for each row
  when (old.xp is distinct from new.xp)
  execute function public.sync_user_level();

-- Auto-create a public.users row when a new auth.users row is created via OAuth.
-- Picks nickname from provider metadata, falling back to a deterministic "player_<id>" stub.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fallback_nickname text;
begin
  fallback_nickname := 'player_' || substr(replace(new.id::text, '-', ''), 1, 8);
  insert into public.users (id, nickname, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'preferred_username', ''),
      fallback_nickname
    ),
    coalesce(
      nullif(new.raw_user_meta_data->>'avatar_url', ''),
      nullif(new.raw_user_meta_data->>'picture', '')
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.users enable row level security;

create policy "Users can read all profiles"
  on public.users for select using (true);

create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);

-- INSERT is only via the SECURITY DEFINER trigger above; no direct inserts from clients.
create policy "Users profile is created via trigger"
  on public.users for insert with check (auth.uid() = id);
