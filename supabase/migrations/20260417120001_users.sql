-- Public-facing user profiles, auto-created on OAuth sign-up via trigger on auth.users.

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
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
-- Picks nickname from provider metadata, sanitises it to match the CHECK constraint,
-- and appends a numeric suffix when the nickname is already taken.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  id_stub text;
  raw_name text;
  base_nick text;
  candidate text;
  suffix int;
  avatar text;
begin
  id_stub := substr(replace(new.id::text, '-', ''), 1, 8);

  -- Pick the first non-empty provider name
  raw_name := coalesce(
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'preferred_username', ''),
    ''
  );

  -- Strip everything except [a-zA-Z0-9_] and truncate to 20 chars
  base_nick := substr(regexp_replace(raw_name, '[^a-zA-Z0-9_]', '', 'g'), 1, 20);

  -- Fall back if sanitised result is too short (< 3 chars)
  if char_length(base_nick) < 3 then
    base_nick := 'player_' || id_stub;
  end if;

  avatar := coalesce(
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    nullif(new.raw_user_meta_data->>'picture', '')
  );

  -- Try the base nickname first; on uniqueness collision append _NNN suffix
  candidate := base_nick;
  suffix := 0;
  loop
    begin
      insert into public.users (id, email, nickname, avatar_url)
      values (new.id, new.email, candidate, avatar)
      on conflict (id) do update set email = excluded.email;
      -- Success (or row already existed for this id) — done
      return new;
    exception when unique_violation then
      -- Nickname taken — try next suffix
      suffix := suffix + 1;
      -- Truncate base so that base + _NNN still fits in 20 chars
      candidate := substr(base_nick, 1, 20 - char_length('_' || suffix::text))
                   || '_' || suffix::text;
      if suffix > 99 then
        -- Extremely unlikely; fall back to guaranteed-unique id stub
        candidate := 'player_' || id_stub;
      end if;
    end;
  end loop;
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
