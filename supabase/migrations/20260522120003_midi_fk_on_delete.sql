-- Add explicit ON DELETE CASCADE to the three FKs that reference
-- midi_catalog(id). Per `.claude/rules/database.md`, every FK must declare an
-- ON DELETE rule. The hard-delete catalog route works around the absence by
-- manually cascading; tightening the schema removes that footgun.
--
-- Constraint names are PostgreSQL's defaults from the original CREATE TABLE
-- inline `references` clause.

alter table public.daily_results
  drop constraint daily_results_midi_id_fkey,
  add constraint daily_results_midi_id_fkey
    foreign key (midi_id) references public.midi_catalog(id) on delete cascade;

alter table public.daily_schedule
  drop constraint daily_schedule_midi_id_fkey,
  add constraint daily_schedule_midi_id_fkey
    foreign key (midi_id) references public.midi_catalog(id) on delete cascade;

alter table public.round_scores
  drop constraint round_scores_midi_id_fkey,
  add constraint round_scores_midi_id_fkey
    foreign key (midi_id) references public.midi_catalog(id) on delete cascade;
