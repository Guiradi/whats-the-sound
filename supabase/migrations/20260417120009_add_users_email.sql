-- Add email column to public.users and populate it from the trigger.

alter table public.users
  add column email text;

-- Backfill existing rows from auth.users
update public.users pu
set email = au.email
from auth.users au
where au.id = pu.id;

-- Now make it not null for future inserts
alter table public.users
  alter column email set not null;

-- Update the trigger to include email
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

  candidate := base_nick;
  suffix := 0;
  loop
    begin
      insert into public.users (id, email, nickname, avatar_url)
      values (new.id, new.email, candidate, avatar)
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
