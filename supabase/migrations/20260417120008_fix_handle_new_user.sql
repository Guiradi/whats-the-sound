-- Fix handle_new_user trigger: sanitise OAuth nicknames to match CHECK constraint
-- and retry with numeric suffix on uniqueness collision.

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
      insert into public.users (id, nickname, avatar_url)
      values (new.id, candidate, avatar)
      on conflict (id) do nothing;
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
