-- Storage bucket for MIDI files (public read, admin-only write).

insert into storage.buckets (id, name, public)
values ('midis', 'midis', true)
on conflict (id) do nothing;

create policy "Public MIDI read"
  on storage.objects for select
  using (bucket_id = 'midis');

create policy "Admin MIDI upload"
  on storage.objects for insert
  with check (
    bucket_id = 'midis'
    and exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Admin MIDI update"
  on storage.objects for update
  using (
    bucket_id = 'midis'
    and exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Admin MIDI delete"
  on storage.objects for delete
  using (
    bucket_id = 'midis'
    and exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );
