-- Referral system: each user has a unique referral_code they can share.
-- When a new user signs up via a shared link, referred_by_user_id is populated.
-- On the invited user's first completed match (daily or MP), the referrer gets +XP
-- and referral_completed_at is stamped to prevent duplicate rewards.

alter table public.users
  add column referral_code text,
  add column referred_by_user_id uuid references public.users(id) on delete set null,
  add column referred_at timestamptz,
  add column referral_completed_at timestamptz;

-- Backfill referral_code for existing users: 6-char uppercase alphanumeric from md5(id+random).
update public.users
set referral_code = upper(substr(md5(id::text || random()::text), 1, 6))
where referral_code is null;

-- Enforce uniqueness and NOT NULL now that every row has a value.
alter table public.users alter column referral_code set not null;
alter table public.users add constraint users_referral_code_unique unique (referral_code);

create index idx_users_referral_code on public.users (referral_code);
create index idx_users_referred_by on public.users (referred_by_user_id);

-- Helper to generate a fresh referral_code with retry on collision.
create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  candidate text;
  attempts int := 0;
begin
  loop
    candidate := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.users where referral_code = candidate);
    attempts := attempts + 1;
    if attempts > 10 then
      -- Extremely unlikely; extend to 8 chars to guarantee uniqueness.
      candidate := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
      exit;
    end if;
  end loop;
  return candidate;
end;
$$;

-- Extend handle_new_user() so every freshly created user gets a referral_code on insert.
-- We re-create the function keeping its existing behaviour and appending the code generation.
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
  ref_code text;
begin
  id_stub := substr(replace(new.id::text, '-', ''), 1, 8);

  raw_name := coalesce(
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'preferred_username', ''),
    ''
  );

  base_nick := substr(regexp_replace(raw_name, '[^a-zA-Z0-9_]', '', 'g'), 1, 20);

  if char_length(base_nick) < 3 then
    base_nick := 'player_' || id_stub;
  end if;

  avatar := coalesce(
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    nullif(new.raw_user_meta_data->>'picture', '')
  );

  ref_code := public.generate_referral_code();

  candidate := base_nick;
  suffix := 0;
  loop
    begin
      insert into public.users (id, email, nickname, avatar_url, referral_code)
      values (new.id, new.email, candidate, avatar, ref_code)
      on conflict (id) do update set email = excluded.email;
      return new;
    exception when unique_violation then
      suffix := suffix + 1;
      candidate := substr(base_nick, 1, 20 - char_length('_' || suffix::text))
                   || '_' || suffix::text;
      if suffix > 99 then
        candidate := 'player_' || id_stub;
      end if;
    end;
  end loop;
end;
$$;
