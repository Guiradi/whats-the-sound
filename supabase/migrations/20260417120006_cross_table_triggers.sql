-- Triggers that touch multiple tables; defined after all tables exist.

-- Aggregate per-user stats after a multiplayer game ends (final_position is set).
create or replace function public.update_user_stats_after_game()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.user_id is not null and new.final_position is not null then
    update public.users set
      total_games = total_games + 1,
      total_wins = total_wins + case when new.final_position = 1 then 1 else 0 end,
      total_correct = total_correct + new.correct_count,
      points_total = points_total + new.final_score
    where id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger after_game_player_update
  after update of final_position on public.game_players
  for each row
  when (new.final_position is not null and old.final_position is null)
  execute function public.update_user_stats_after_game();

-- Update daily_streak on users when a new daily result is inserted.
-- Streak increments if the user played yesterday (BRT date, server checks UTC date-1).
create or replace function public.update_daily_streak()
returns trigger
language plpgsql
security definer
as $$
declare
  yesterday_played boolean;
begin
  select exists (
    select 1 from public.daily_results
    where user_id = new.user_id
    and date = new.date - interval '1 day'
  ) into yesterday_played;

  if yesterday_played then
    update public.users set
      daily_streak = daily_streak + 1,
      max_daily_streak = greatest(max_daily_streak, daily_streak + 1)
    where id = new.user_id;
  else
    update public.users set
      daily_streak = 1,
      max_daily_streak = greatest(max_daily_streak, 1)
    where id = new.user_id;
  end if;

  return new;
end;
$$;

create trigger after_daily_result_insert
  after insert on public.daily_results
  for each row execute function public.update_daily_streak();

-- Update per-MIDI stats after a round score is inserted.
create or replace function public.update_midi_stats()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.midi_catalog set
    play_count = play_count + 1,
    correct_rate = (
      select coalesce(avg(case when phase_guessed is not null then 1.0 else 0.0 end), 0)
      from public.round_scores where midi_id = new.midi_id
    )
  where id = new.midi_id;
  return new;
end;
$$;

create trigger after_round_score_insert
  after insert on public.round_scores
  for each row execute function public.update_midi_stats();
