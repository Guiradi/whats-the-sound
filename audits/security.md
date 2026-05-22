# Security Audit — What's the Sound
Date: 2026-05-22 | Scope: Pre-deploy security review (Vercel + Railway + Supabase Cloud)

## Summary
- Critical: 5 findings
- High: 6 findings
- Medium: 7 findings
- Low: 6 findings

## Findings

### [CRITICAL] Anti-cheat bypass: `midi_catalog` SELECT policy exposes `accepted_titles`, `accepted_artists`, `title`, `artist` to anyone with the publishable key
**File:** `supabase/migrations/20260417120002_midi_catalog.sql:40-41`
**Issue:** The policy
```sql
create policy "Anyone can read active midis"
  on public.midi_catalog for select using (is_active = true);
```
grants any holder of the publishable (anon) key direct SELECT access on every column of every active MIDI — including `title`, `artist`, `accepted_titles`, `accepted_artists`. The migration comment explicitly acknowledges this and relies on "the API layer" filtering, but Supabase PostgREST does not go through the API. The publishable key is shipped to every browser (see `apps/web/src/lib/supabase/browser.ts`). Combined with `daily_schedule` (also `for select using (true)`, `20260417120004_daily_tables.sql:51-52`) which exposes today's `midi_id`, an attacker can:
```
1. GET /rest/v1/daily_schedule?date=eq.<today>     → midi_id
2. GET /rest/v1/midi_catalog?id=eq.<midi_id>       → title, artist, accepted_titles[], accepted_artists[]
```
This breaks both daily-sound and multiplayer anti-cheat since the playlist in MP is drawn from `is_active = true` rows and the title is hidden from the socket payload but trivially fetched out-of-band.
**Impact:** Total bypass of the P0 anti-cheat ("respostas NUNCA podem ser enviadas ao cliente antes de round_end"). Any motivated user (or curious one with DevTools open) can win every round.
**Fix:** Restrict the SELECT policy to non-sensitive columns only, or hide the table from PostgREST entirely. Two viable approaches:
  - **Preferred:** revoke the policy, replace with `GRANT SELECT (id, category, difficulty, year, midi_file_url, phases, is_active, play_count, correct_rate) ON public.midi_catalog TO anon, authenticated;` and rely on column-level grants — never expose `title`, `artist`, `accepted_titles`, `accepted_artists` directly.
  - Or move catalog reads behind the backend (`/api/catalog/public/:id`) and remove the public SELECT policy entirely.
  - Either way also remove `daily_schedule` public SELECT — clients should hit `/api/daily` which already filters fields.
**Effort:** M

### [CRITICAL] Anti-cheat bypass: full MIDI file URL leaked at phase 1
**File:** `apps/server/src/services/round-orchestrator.ts:109-118`, `packages/shared/src/types/index.ts:211-217`, `supabase/migrations/20260417120007_storage.sql:7-9`
**Issue:** The `phase:start` socket payload includes `midiFileUrl` (the full MIDI bound to the round). The bucket `midis` is created with `public: true` and a policy that returns the file to any anonymous request. The client fetches the entire file at phase 1 (`apps/web/src/components/game/game-board.tsx:88` — `midiPlayerRef.current.loadMidi(payload.midiFileUrl)`), so a player with DevTools can:
  1. Read the URL from the WebSocket frame.
  2. `fetch(url)`, parse with `@tonejs/midi` (already on the page).
  3. Read embedded track names, instrument program changes, and the full melody of all 32 measures — instantly identifying the song.
This violates the explicit anti-cheat rule in `.claude/rules/audio.md` ("MIDI files fetched per-phase from server (never all at once)" and "Obfuscate phase audio endpoints to prevent prefetching") and the spec at `specs/features/02-midi-engine.md:143` ("O client nunca recebe os dados de todas as fases de uma vez").
**Impact:** Same as above — total anti-cheat bypass during gameplay.
**Fix:** Two combined changes:
  1. Serve audio per-phase from the backend: replace the public bucket URL with a short-lived signed URL to a phase-specific clip generated server-side (re-mux/trim with `@tonejs/midi` analogous to `services/midi-analyzer.ts`), regenerated on each `startPhase`.
  2. Switch the bucket to `public: false` and use signed URLs (`createSignedUrl`, 60-second TTL).
**Effort:** L

### [CRITICAL] Filename leak in stored MIDI path reveals title
**File:** `apps/server/src/routes/catalog.ts:339`
```ts
const filePath = `catalog/${Date.now()}-${body.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
```
**Issue:** The upload path preserves the original filename. Admins commonly upload `bohemian-rhapsody.mid`, `Queen - Bohemian Rhapsody.mid`, etc. The resulting public URL reveals the answer even before any MIDI parsing.
**Impact:** Same anti-cheat bypass — the URL alone (visible in the Network tab) reveals the song title.
**Fix:** Use an opaque path: `catalog/${randomUUID()}.mid`. Store the original filename only as a column for admin UX if needed.
**Effort:** XS

### [CRITICAL] MIDI track metadata copied into stored buffer reveals title
**File:** `apps/server/src/services/midi-analyzer.ts:99-103`
```ts
for (const srcTrack of midi.tracks) {
  const dstTrack = trimmedMidi.addTrack();
  dstTrack.name = srcTrack.name;
  ...
}
```
**Issue:** The MIDI analyzer copies `srcTrack.name` from the source MIDI into the saved file. Source MIDI files routinely contain track names like `"Lead - Bohemian Rhapsody"`, `"Vocals: Freddie"`, or a `SequenceName` meta event with the song title. The parser on the client (`apps/web/src/lib/midi/parser.ts:23`) already reads `track.name`. Even before the URL fix above, anyone holding the URL can parse the file and read the answer from metadata.
**Impact:** Same anti-cheat bypass through file-internal metadata.
**Fix:** Strip metadata on save — set `dstTrack.name = ''` (or `Track ${i}`), and discard `header.name` / `SequenceName` / `TrackName` meta events when re-serializing.
**Effort:** S

### [CRITICAL] Trigger `update_user_stats_after_game` allows score forgery via permissive `game_players` RLS
**File:** `supabase/migrations/20260417120003_game_tables.sql:60-67` + `supabase/migrations/20260417120006_cross_table_triggers.sql:4-26`
**Issue:** The RLS policies on `game_players` are:
```sql
create policy "Players can join games"  on public.game_players for insert with check (true);
create policy "System can update game players" on public.game_players for update using (true);
```
Combined with the `security definer` trigger `after_game_player_update` that fires on `final_position` first becoming non-null and updates `public.users` `total_wins`, `total_correct`, `points_total` by `new.user_id`, a malicious user holding only the publishable key can:
```
1. INSERT INTO game_players (session_id, user_id, nickname, final_score, correct_count, final_position)
     VALUES (<any uuid>, '<my-user-id>', 'x', 999999, 999, NULL);
2. UPDATE game_players SET final_position = 1 WHERE ... ;
   → trigger bumps users.total_wins +1, points_total += 999999, total_correct += 999.
```
The trigger is `security definer`, so the targeted `users` row update bypasses RLS. The attacker can repeat with `user_id` set to anyone else's id, or use bigger numbers. Achievements (`achievement-checks.ts:67-77 mpFirstWin`) read `game_players.final_position = 1` and would unlock arbitrarily.
Even without the trigger the unrestricted UPDATE/INSERT on `game_players` is a defense-in-depth failure (the table is currently never written by the server but RLS shouldn't depend on that).
**Impact:** Leaderboard / XP / wins forgery for any user, including others. Achievement unlocks. Permanent stat manipulation that survives game sessions.
**Fix:**
  - Tighten policies to allow writes only from the service role: drop the INSERT/UPDATE policies on `game_players`, `round_scores`, and `game_sessions`. The server uses the secret key which bypasses RLS, so this is non-breaking.
  - Add `SET search_path = pg_catalog, public` to all `security definer` trigger functions in `20260417120006_cross_table_triggers.sql` (already done correctly in `handle_new_user`) to harden against search-path hijacking.
**Effort:** S

### [HIGH] PII disclosure: `users.email` readable by any anon client
**File:** `supabase/migrations/20260417120001_users.sql:128-129`
```sql
create policy "Users can read all profiles"
  on public.users for select using (true);
```
**Issue:** The policy returns every column — including `email` — to any caller with the publishable key. There is no application code that needs another user's email exposed to the client. Public profile fields are nickname/avatar/xp/level/stats. Exposing emails is a GDPR/LGPD concern and enables targeted phishing.
Also bleeds: `last_login_date`, `login_streak`, `referral_code`, `referred_by_user_id` — turn the referral system into an enumeration tool (anyone can list referral_code → users).
**Impact:** Mass email enumeration of the user base.
**Fix:** Replace with column-level grants — only expose `id, nickname, avatar_url, level, xp, total_games, total_wins, daily_streak, max_daily_streak, points_total, max_login_streak, created_at`. Keep `email`, `last_login_date`, `login_streak`, `referral_code`, `referred_by_user_id`, `referred_at`, `referral_completed_at`, `role` private (server-only via service role).
**Effort:** S

### [HIGH] `round_scores` INSERT policy is `with check (true)`
**File:** `supabase/migrations/20260417120003_game_tables.sql:92-93`
**Issue:** Any holder of the publishable key can insert arbitrary rows into `round_scores`. The `after_round_score_insert` trigger then updates `midi_catalog.play_count` and `correct_rate` (also `security definer`, no `set search_path`). An attacker can flood the catalog stats and influence the daily-selection-related ordering/metrics, plus pollute admin dashboards.
**Impact:** Catalog stats forgery; DoS of the leaderboard/MIDI ranking.
**Fix:** Drop the INSERT policy (server uses service role, which bypasses RLS).
**Effort:** XS

### [HIGH] `admin_config` reveals operational config publicly
**File:** `supabase/migrations/20260418120000_admin_config.sql:10-13` + `apps/server/src/routes/admin.ts:28-43`
**Issue:** `admin_config` has `FOR SELECT USING (true)`, so anyone can read every config key/value, not just `disabled_categories`. If future keys store anything non-public (feature flags, internal thresholds, secrets-by-mistake) they leak. The `GET /api/admin/disabled-categories` route uses the service role, so PostgREST exposure is redundant — defense-in-depth is missing.
**Impact:** Future config leakage as new keys are added.
**Fix:** Restrict SELECT to admin only and have clients call `/api/admin/disabled-categories` (which already exists and is the only legitimate need).
**Effort:** XS

### [HIGH] SECURITY DEFINER trigger functions lack `set search_path` (privilege-escalation defense-in-depth)
**File:** `supabase/migrations/20260417120006_cross_table_triggers.sql:4-85`
**Issue:** `update_user_stats_after_game`, `update_daily_streak`, `update_midi_stats` are all `language plpgsql security definer` but do NOT set `search_path`. `handle_new_user` in `20260417120001_users.sql:62-65` correctly does `set search_path = public`. The unsanitized triggers are exploitable if any role can create objects in a schema earlier in the search path (e.g., `pg_temp`) — Postgres docs flag this as the canonical SECURITY DEFINER pitfall.
**Impact:** Privilege escalation under specific schema-creation conditions.
**Fix:** Add `set search_path = pg_catalog, public` to each definer function.
**Effort:** XS

### [HIGH] Public `guest_profiles` SELECT enables nickname enumeration of guests
**File:** `supabase/migrations/20260422120000_guest_profiles.sql:23-24`
**Issue:** `Guest profiles are publicly readable` with `using (true)`. The comment justifies it for "future leaderboards", but the table also stores `migrated_to`, allowing linkage between every guest UUID and the auth user it migrated to. Combined with the `users` policy above, anyone can map `guest_id` → `auth.users.id` → email.
**Impact:** Deanonymization of users who started as guests.
**Fix:** Drop the public SELECT; surface guest leaderboards through a backend route that returns only `nickname` + score.
**Effort:** XS

### [HIGH] No additional rate limit on `POST /api/daily/guess`
**File:** `apps/server/src/routes/daily.ts:34-69` + `apps/server/src/index.ts:46-49`
**Issue:** Only the global 60-req/min/IP limit applies (`index.ts:46`). A logged-in user can hammer 60 guesses/minute against the daily endpoint sharing a NAT (or burn the cap on a single IP affecting other co-located users). More importantly, there is no per-user cap — different sockets/IPs of the same user can issue more. Combined with the cheap server-side `verifyDailyGuess` call this is a partial DoS amplifier and brute-force window against the accepted-titles list.
**Impact:** Brute force of accepted titles (each guess returns CORRECT/HOT/WARM/WRONG, an oracle); cap exhaustion impacting shared-IP users.
**Fix:** Add a per-user limit on `/api/daily/guess` (e.g., 1/2s, 30/day) using `@fastify/rate-limit`'s `keyGenerator` keyed on `request.userId`. Also drop guesses past phase 4 immediately.
**Effort:** S

### [HIGH] Server uses admin client to validate user tokens, but then queries data on the user's behalf without re-applying RLS
**File:** `apps/server/src/lib/supabase.ts:10-19` (singleton) + every route in `routes/*.ts`
**Issue:** Every backend query runs as `service_role` (RLS bypassed). For endpoints that read another user's data (`GET /api/me/referrals`, `/api/me/achievements`, etc.) this is fine because the route filters by `userId` manually. But there is a class of routes where the manual filter is the only thing standing between cross-user reads:
- `daily-service.ts:236-244` filters by `user_id` from the auth token — OK.
- `xp-service.ts:48-52` filters by `user_id` from auth — OK.
- `me.ts:84-88, 111-114, 168-180` — filters are correct.
The risk is that any future addition that forgets a `.eq('user_id', userId)` becomes a horizontal-access bug instantly, because RLS no longer enforces a safety net. There is no test enforcing this either.
**Impact:** Future regression — a missing filter equals full data exposure.
**Fix:** Where the request is on behalf of a user, create a per-request supabase client using the user's JWT (`createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${userJWT}` } } })`), so RLS applies as a second defense. Reserve `getSupabaseAdmin()` for system tasks (cron, achievements awarder).
**Effort:** L

### [MEDIUM] Wildcard `for all` admin policies use existence subquery — fine, but reads execute under caller's privileges
**File:** `supabase/migrations/20260417120002_midi_catalog.sql:43-46`, `20260417120004_daily_tables.sql:54-57`, `20260420120000_achievements.sql:24-27`
**Issue:** `for all using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))` is fine functionally but encodes admin-check in every policy. Combined with the `users` SELECT policy returning the `role` column publicly (HIGH-1 above), an attacker also learns which user IDs are admins. Low impact on its own but compounds with PII disclosure.
**Impact:** Admin enumeration.
**Fix:** Once `users.role` is hidden by column-level grants (HIGH-1 fix), this is mitigated automatically.
**Effort:** XS (depends on HIGH-1)

### [MEDIUM] `GET /rooms` returns full room snapshots unauthenticated
**File:** `apps/server/src/routes/rooms.ts:5-7` → `apps/server/src/services/room-manager.ts:238-246`
**Issue:** The unauthenticated `GET /rooms` returns every public room's snapshot — including nicknames, avatar URLs, levels, host id, full config. No auth, no rate limit beyond the global 60/min. A scraper can enumerate all in-progress public sessions and player presence.
**Impact:** Player-presence enumeration.
**Fix:** Either gate behind auth, or trim the response to `{ code, hostNickname, playerCount, maxPlayers, category, status, createdAt }` — the lobby UI only needs these.
**Effort:** S

### [MEDIUM] Admin/stats route references a non-existent `users.is_guest` column
**File:** `apps/server/src/routes/admin.ts:57, 79`; `apps/server/src/services/xp-service.ts:50, 58-60`
**Issue:** `users` table has no `is_guest` column (see `20260417120001_users.sql`). The admin stats route selects `is_guest` and the XP service uses it to short-circuit. Under PostgREST/Supabase this returns an error and the catch-handler falls back to `NOOP_RESULT` — silently disabling XP. Operationally bad (a logic bug), but security relevance: the xp-service guard against awarding XP to guests now depends entirely on the `userId.startsWith('guest:')` string check at line 44. The string check works, but the dead `is_guest` branch may give false confidence; also a future refactor that removes the prefix check will fail to deny guests.
**Impact:** Latent XP-grant-to-guest risk if the userId-prefix convention changes. Admin dashboard query errors silently.
**Fix:** Remove all `is_guest` reads, OR add `is_guest` column to `users` and populate it (probably not the right call — keep one source of truth). Add a unit test ensuring guests are denied XP.
**Effort:** S

### [MEDIUM] Catalog search uses unescaped string in PostgREST `.or()` filter (admin-only, low blast radius)
**File:** `apps/server/src/routes/catalog.ts:92-94`
```ts
query = query.or(`title.ilike.%${search}%,artist.ilike.%${search}%`);
```
**Issue:** `search` is admin-gated via `adminOnly` preHandler, so the risk is constrained to authenticated admins. Still, `,`/`)`/quotes in `search` change the filter expression and could expose unrelated rows. Trivial to escape.
**Impact:** Filter injection (admin-only).
**Fix:** Escape commas/parentheses in `search` or use `ilike` separately and union, or pre-sanitize with a strict regex.
**Effort:** XS

### [MEDIUM] OAuth callback fires guest-migration fetch without awaiting and ignores all errors
**File:** `apps/web/src/app/auth/callback/route.ts:36-44`
**Issue:** The `fetch(...).catch(() => {})` is fire-and-forget; if the backend is slow to start (Railway cold-start) or returns 500, the user is redirected to `next` before migration completes. Subsequent guest-tied data (XP, achievements) is silently lost — a UX and audit-trail issue. Not directly a security flaw, but the silent error-swallowing is a pattern to flag.
**Impact:** Data loss on migration, no observability.
**Fix:** `await` and log the failure server-side (the route handler is server-side already).
**Effort:** XS

### [MEDIUM] No upload size limit before base64 decoding on admin MIDI upload
**File:** `apps/server/src/routes/catalog.ts:319-345`
**Issue:** `request.body as { fileName, fileBase64 }` is decoded via `Buffer.from(body.fileBase64, 'base64')` without a size guard. Fastify's default JSON body limit (`bodyLimit`) is 1 MB, which mitigates most abuse, but a malicious admin (or compromised admin session) can push very large MIDI files into Storage and exhaust quota. Filename also lacks an extension allowlist (only character sanitization).
**Impact:** Storage quota DoS by an authenticated admin (low likelihood).
**Fix:** Reject `fileBase64.length > 1_500_000` (≈ 1 MB binary), enforce `.mid`/`.midi` extension, and set `bodyLimit` explicitly on this route.
**Effort:** XS

### [MEDIUM] Error response from `daily.ts` and others leaks internal error messages on 5xx
**File:** `apps/server/src/routes/daily.ts:27-31, 65-69, 92-97, 116-120` and most other route files
**Issue:** Routes do `request.log.error(err, 'Failed to ...')` AND return `{ error: { code: 'INTERNAL_ERROR', message: 'Failed to ...' } }`. The string is hard-coded, not the raw error — so no stack/secrets leak. ✓ But `catalog.ts:181, 230`'s catch blocks return the global error handler path (`registerErrorHandlers`) for re-thrown errors. The global handler at `error-handler.ts:32` does generalize 5xx messages. Combined this is mostly OK. Verify no route bypasses by accident.
Also: `catalog.ts:319-345` upload route returns the raw upload error message via global handler if `analyzeMidi` throws — possibly leaking `@tonejs/midi` internals. Low risk because admin-only.
**Impact:** Minor info disclosure on admin endpoints.
**Fix:** Add a top-level try/catch in upload that maps every internal error to a generic message.
**Effort:** XS

### [LOW] CORS / CORS_ORIGINS validation does not reject `*`
**File:** `apps/server/src/env.ts:9-17` + `apps/server/src/index.ts:40-43`
**Issue:** `CORS_ORIGINS` is parsed from a comma list but no schema rejects `*`. In production a misconfigured env var (`CORS_ORIGINS=*`) would silently work due to `@fastify/cors` accepting it. Combined with `credentials: true` this would broadcast Supabase cookies to every origin.
**Impact:** Deployment-time misconfiguration risk.
**Fix:** Reject `'*'` in the Zod schema in production (`NODE_ENV === 'production'`).
**Effort:** XS

### [LOW] Storage bucket `midis` is `public: true` — needs to change for the CRITICAL #2 fix
**File:** `supabase/migrations/20260417120007_storage.sql:4-9`
**Issue:** Captured here for the deploy checklist. Once the per-phase MIDI URL refactor lands, set the bucket private and use signed URLs.
**Impact:** Without the refactor, the public bucket is the root cause of the URL leak.
**Fix:** Together with the per-phase audio refactor (CRITICAL #2). Until then, public bucket is the only thing that makes the current implementation work.
**Effort:** XS (one line)

### [LOW] FKs missing `ON DELETE` (database rule violation)
**File:** `supabase/migrations/20260417120004_daily_tables.sql:6, 40`, `20260417120003_game_tables.sql:74`
**Issue:** Three FKs on `midi_catalog(id)` from `daily_results`, `daily_schedule`, `round_scores` omit `ON DELETE`. The hard-delete catalog route works around this by manually deleting dependents (`catalog.ts:266-268`), but the rule in `.claude/rules/database.md` requires explicit `ON DELETE`.
**Impact:** Hidden orphan-row scenarios if catalog rows are deleted out-of-band.
**Fix:** Add `ON DELETE CASCADE` (or `ON DELETE RESTRICT` if cascade is undesirable; the existing routine already cascades manually).
**Effort:** XS

### [LOW] Service role secret only accepted in `SUPABASE_SECRET_KEY` env — no rotation procedure documented
**File:** `apps/server/src/env.ts:24` + `apps/server/src/lib/supabase.ts:11-18`
**Issue:** The secret is loaded once and cached as a process-wide singleton. There is no documented secret-rotation procedure (key revocation requires a redeploy). Not a code flaw, but a deploy-checklist gap.
**Impact:** Slow incident response if the key is suspected leaked.
**Fix:** Add a section in `docs/deploy-checklist.md` covering rotating `SUPABASE_SECRET_KEY` (new key → `SUPABASE_SECRET_KEY_NEW` → redeploy → revoke old).
**Effort:** XS (docs only)

### [LOW] `apps/web/src/app/auth/callback/route.ts:4` uses `process.env.NEXT_PUBLIC_SERVER_URL` with a localhost default
**File:** `apps/web/src/app/auth/callback/route.ts:4`
**Issue:** If `NEXT_PUBLIC_SERVER_URL` is missing in production, the OAuth callback POSTs guest-migrate to `http://localhost:3001`, leaking the auth bearer token to whatever runs on localhost (none in serverless, but unintentional `127.0.0.1` requests are still a tell). Use the validated `env` helper (`apps/web/src/env.ts`).
**Impact:** Misconfiguration footgun.
**Fix:** Import from `@/env` instead of reading `process.env` directly.
**Effort:** XS

### [LOW] `phase:start` includes `hints` with `category` from phase 3 onward — confirm intentional
**File:** `apps/server/src/services/round-orchestrator.ts:113-117`
**Issue:** Spec confirms this is the design (`year` from phase 2, `category` from phase 3). Not a leak per spec, but flagged for sign-off given anti-cheat is P0. Make sure `category` is also the `MidiCategory` enum value already shown publicly (it is — public room config has `category`), so this duplicates what's already known once a public room is joined.
**Impact:** None if spec-confirmed.
**Fix:** No action; documented here for the security sign-off.
**Effort:** —

## Positive observations
- **JWT validation is correct.** Both REST (`middleware/auth.ts:26 — supabase.auth.getUser(token)`) and Socket.io (`socket/auth-middleware.ts:29`) call Supabase's auth API to validate the token — not just `jwt.verify`. This catches revoked sessions.
- **Server-side scoring + server timestamps** are honored (`game-loop.ts:114-127, resolveGuessPosition`). Client-supplied timestamps are not trusted.
- **Round answers stripped from snapshots.** `room-manager.toSnapshot` (`room-manager.ts:55-86`) correctly returns `midiId` only; `title`, `artist`, `acceptedTitles`, `acceptedArtists` are never put on the wire. (The leak is via `phase:start.midiFileUrl`, not snapshot.)
- **Chat XSS is mitigated by React text rendering.** `game-chat.tsx:50-63` renders all chat text as JSX children — no `dangerouslySetInnerHTML`, no `eval`. `grep dangerouslySetInnerHTML apps/web/src` returned zero hits.
- **Nicknames are strictly validated.** `NICKNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/` in both server (`room-events.ts:56`) and client (`lib/auth/guest.ts:4`). The DB `users.nickname` CHECK constraint enforces the same.
- **Profanity filter for nicknames.** `apps/web/src/lib/auth/profanity.ts` is invoked in `profile/actions.ts:38, 69` before any DB write.
- **Login throttle and Socket.io rate limits exist.** `SocketRateLimiter` in `apps/server/src/middleware/rate-limiter.ts` enforces per-user limits on guesses (1/sec), chat (5/10s), room creation (3/10min).
- **Idempotent XP awards via UNIQUE(source, source_ref).** `xp_events` has `unique(source, source_ref)` (`20260417120005_xp_events.sql:15`) and the service relies on this for duplicate-rejection.
- **Reasonable error responses.** `registerErrorHandlers` (`middleware/error-handler.ts:16-47`) generalizes 5xx messages and never includes the stack.
- **No `console.log`/`console.error` in server code** (verified via grep). Logging uses Fastify's pino-backed logger, which is what `.claude/rules/database.md` implies for production.
- **Admin gate returns 404, not 403.** `middleware/admin-guard.ts:17, 47` and `apps/web/src/middleware/require-admin.ts:38-46` both 404 non-admins so the route's existence isn't disclosed.
- **OG image routes use `next/og` `ImageResponse`** which rasterizes to PNG — no XSS via shared text. The room code is uppercased at render time.
- **OAuth `next` parameter is sanitized** against open-redirect: `sanitizeNext` (`apps/web/src/app/auth/callback/route.ts:6-10`) rejects external URLs and `//host`-style bypasses.

## Pre-deploy must-fix list
Order matters: blocking issues at the top.

1. **[CRITICAL] Hide `midi_catalog` sensitive columns from PostgREST.** Replace `Anyone can read active midis` policy with column-level grants that exclude `title`, `artist`, `accepted_titles`, `accepted_artists`. Remove the public SELECT on `daily_schedule`.
2. **[CRITICAL] Refactor audio to per-phase signed URLs.** Backend pre-clips the MIDI per phase, stores in a private bucket, sends a 60-second signed URL on each `phase:start`. Switch the `midis` bucket to `public: false`.
3. **[CRITICAL] Use opaque storage paths** (`catalog/${uuid}.mid`) and **strip MIDI track-name / sequence-name meta** in `midi-analyzer.ts` before saving the buffer.
4. **[CRITICAL] Tighten `game_players`, `round_scores`, `game_sessions` RLS** — drop the `with check (true)` / `using (true)` INSERT/UPDATE policies. Add `set search_path = pg_catalog, public` to every `security definer` trigger function.
5. **[HIGH] Hide `users.email`, `users.role`, `users.referral_code`, `users.referred_by_user_id`, `users.last_login_date`, `users.login_streak`, `users.referred_at`, `users.referral_completed_at`** behind column-level grants. Drop public SELECT on `guest_profiles.migrated_to` (or the whole row).
6. **[HIGH] Restrict `admin_config` SELECT to admins.**
7. **[HIGH] Add per-user rate limit on `POST /api/daily/guess`** (e.g., 1 every 2 seconds, 30 per BRT day) using `@fastify/rate-limit` `keyGenerator`.
8. **[HIGH] Move user-context reads to a per-request supabase client carrying the user JWT** so RLS is a safety net behind the manual `.eq('user_id', userId)` filters.
9. **[MEDIUM] Trim `GET /rooms` response** to the fields the lobby UI uses; consider gating behind auth.
10. **[MEDIUM] Remove dead `users.is_guest` references** in `xp-service.ts` and `admin.ts`.
11. **[MEDIUM] Escape PostgREST `.or()` interpolation** in `catalog.ts` search.
12. **[LOW] Reject `CORS_ORIGINS=*`** in production via Zod refinement.
13. **[LOW] Add `ON DELETE` to `midi_id` FKs** in `daily_results`, `daily_schedule`, `round_scores`.
14. **[LOW] Use `env.NEXT_PUBLIC_SERVER_URL`** (not raw `process.env`) in `auth/callback/route.ts`.
