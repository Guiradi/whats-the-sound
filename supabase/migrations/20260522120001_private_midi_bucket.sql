-- Make the `midis` bucket private. Clients no longer read MIDI URLs directly;
-- the backend serves per-phase clips via short-lived signed URLs.
--
-- Anti-cheat fix (SEC-2): a public MIDI URL leaked at phase 1 let any player
-- fetch the entire file and parse the full melody with @tonejs/midi before
-- the first phase ended. With the bucket private, only the service role can
-- read storage objects, and the server only mints signed URLs (60s TTL) for
-- phase-specific clipped buffers.

update storage.buckets set public = false where id = 'midis';

-- Drop the public-read policy. Service role bypasses RLS, so the server can
-- still download source files and upload phase clips. Admin policies for
-- upload/update/delete stay as defined in 20260417120007_storage.sql.
drop policy if exists "Public MIDI read" on storage.objects;
