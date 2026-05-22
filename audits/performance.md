# Performance & PWA Audit — What's the Sound
Date: 2026-05-22 | Scope: Pre-deploy performance + PWA review

## Summary
- Critical: 2
- High: 6
- Medium: 9
- Low: 6

Overall the app is well structured for a PWA MVP (manifest is complete, SW + offline fallback work, dark-mode only avoids theme bloat, Tone.js is properly gated behind a user gesture, and the server uses correct DB indexes on the hot paths). The biggest performance risks are:

1. The server **rebroadcasts the full `room:state` snapshot every 1 second** during active phases, plus on every guess/chat — this scales O(players * rounds) on socket bandwidth and CPU.
2. The MIDI engine reuses Tone-imports across pages, but **Tone.js (`import * as Tone`)** is pulled into every "use client" boundary that imports phase-player/audio-context. With Tone weighing ~280-400 KB minified+gzipped, this dominates the JS budget on `/room/[code]` and `/daily`.
3. Soundfont caching with the 20 MB cap and hashed cache keys (per `.claude/rules/audio.md`) is **not implemented at all** — only PolySynth fallback exists. This is fine for MVP audio quality but the rules file describes a contract that the SW must honor in the future.

---

## Findings (ordered by severity)

### [CRITICAL] room:state broadcast every 1 s during phases (40+ snapshots per round)
**File:** `apps/server/src/services/round-orchestrator.ts:122-129`
**Issue:** `startPhase()` sets up `setInterval(() => broadcastRoomState(io, currentRoom), 1000)` for the entire phase duration (25-45 s per phase, 4 phases per round). Each emit serializes the full snapshot (room config, all players, the whole 50-message chat array, round metadata) and sends it to every connected socket. Nothing in the snapshot changes during that tick unless someone guessed — the client computes the timer from `phaseEndAt - now`, so the periodic resend is purely redundant.
**Impact:** With 10 players × 4 phases × 30 s = 1,200 snapshots per round. At ~3-8 KB per snapshot (chat included) that's ~3-10 MB egress per room per round for zero new information. On Railway the per-instance bandwidth and event-loop CPU will dominate at scale.
**Fix:** Remove the 1-second `tickInterval` entirely. The server already broadcasts on every state change (guess, chat, phase start/end, player join/leave). The client computes its own ticking timer from `phaseEndAt`. If a periodic resync is desired for clock drift, drop it to every 10 s or use a tiny `tick:timer` event with just `{ phaseEndAt }`. Also avoid sending the full chat in every snapshot — emit chat only via the existing `chat:message` event and remove `chat` from `toSnapshot()` (clients already accumulate it from `chat:message`).
**Effort:** S

### [CRITICAL] Soundfont LRU cache with 20 MB cap + hashed keys is documented but absent
**File:** `apps/web/src/lib/midi/soundfont-loader.ts:1-46`
**Issue:** `.claude/rules/audio.md` mandates "Total cache budget across all soundfonts: max 20 MB", "Cache key MUST include a version hash (`sf-piano-<hash8>.sf2`)", "On SW `activate`, delete soundfont cache entries whose hash is not in the current manifest". The current `createInstrumentRegistry` only instantiates `Tone.PolySynth` — no fetch, no Cache Storage interaction, no manifest, no cleanup. The Serwist SW (`apps/web/src/app/sw.ts`) has no soundfont-specific runtime caching rule either.
**Impact:** If/when soundfonts ship the SW will not cap storage, browsers may evict critical core caches, and old hashes will accumulate. For the MVP the lack is functional (PolySynth fallback works), but the rule is load-bearing for audio quality post-launch.
**Fix:** Either (a) update the rule file/spec to mark this deferred to Phase 2 and document `soundfont-loader.ts` as fallback-only, or (b) implement the contract: fetch `.sf2` from a hashed URL, store in a named Cache (`wts-soundfonts-v<n>`), enforce 20 MB via byte counting, and add an `activate` listener inside `sw.ts` that prunes entries not in the current manifest.
**Effort:** L (if implementing) / XS (if formally deferring)

### [HIGH] Tone.js imported as `import * as Tone` — full module pulled into client bundle
**File:** `apps/web/src/lib/midi/soundfont-loader.ts:1`, `phase-player.ts:2`, `audio-context.tsx:12`
**Issue:** Three modules use `import * as Tone from 'tone'`. Even though Tone.js v15 is ESM, pulling the namespace defeats tree-shaking for the entire library. Only a handful of symbols are actually used (`PolySynth`, `Synth`, `Gain`, `Analyser`, `Frequency`, `dbToGain`, `getTransport`, `getContext`, `start`, `ToneAudioNode` type). Tone.js v15 ships ~280-400 KB min+gzip; the full namespace ends up in any first-party chunk that imports phase-player.
**Impact:** Each route that uses `useMidiPlayer()` or wraps in `AudioContextProvider` (every game route under `(game)/`) carries the full Tone bundle. Lighthouse Performance on `/room/[code]` and `/daily` will reflect ~300 KB of JS that is otherwise unused before the player presses "Start Audio".
**Fix:** Convert to named imports — `import { PolySynth, Synth, Gain, Analyser, Frequency, dbToGain, getTransport, getContext, start } from 'tone'` — and rely on Tone's ESM tree-shaking. Further win: lazy-load the whole `phase-player.ts` only after `start()` succeeds, e.g. `const { PhasePlayer } = await import('@/lib/midi/phase-player')`. The lobby route doesn't actually need Tone code before the user clicks "Tap to start".
**Effort:** S (named imports) / M (full dynamic import)

### [HIGH] `room:state` includes the entire `chat` array on every broadcast
**File:** `apps/server/src/services/room-manager.ts:72-86`, `apps/server/src/services/round-orchestrator.ts:22-24`
**Issue:** `toSnapshot()` always slices the last 50 chat messages and embeds them in every snapshot. The client also receives every new chat message via the dedicated `chat:message` event (`game-events.ts:41`, `bot-broadcaster.ts:9`). The chat array in the snapshot is therefore duplicate data on every emit.
**Impact:** Roughly doubles snapshot payload during active phases. Combined with the 1s tick interval above, this is the dominant socket bandwidth on rooms with active chat.
**Fix:** Drop `chat` from `RoomStateSnapshot`. Use `chat:message` events for incremental updates and a one-time `chat:backlog` (or include chat only in the initial post-reconnect snapshot via a flag). The client's `useRoom` (`apps/web/src/hooks/use-room.ts:78`) already de-dupes incoming chat by ID, so this is safe.
**Effort:** S

### [HIGH] Supabase queries use `.select('*')` for MIDI catalog rows that include `accepted_titles` and `accepted_artists`
**File:** `apps/server/src/services/supabase-midi-provider.ts:46,89,109`, `apps/server/src/routes/catalog.ts:81,127`, `apps/server/src/services/daily-service.ts:299,441`
**Issue:** `SupabaseMidiProvider.getMidis()` selects `*` from `midi_catalog`, which returns the full row including the JSONB `phases` and the accepted-answer arrays. These are then mapped into `MidiEntry` server-side. That's fine *as long as* the server never leaks them, but two side effects matter for performance: (1) we always pull `accepted_titles`, `accepted_artists`, and `phases` JSONB even when only metadata is needed (e.g. the listPublicRooms path), increasing query payload from Supabase; (2) `daily-service.ts:299` selects `*` from `daily_results` when only `phase_guessed, attempts, completed, midi_id` are read.
**Impact:** Per-room start: 100 rows × (~2 KB each due to JSON columns) = ~200 KB pulled from Supabase over the Railway → Supabase wire for every `game:start`. Daily endpoint hits Supabase with extra payload on every guess.
**Fix:** Replace `.select('*')` with the explicit column list: `'id,title,artist,category,difficulty,year,midi_file_url,accepted_titles,accepted_artists,phases,is_active,play_count,correct_rate'`. For `daily_results`, project to `phase_guessed,attempts,completed,midi_id`. The admin catalog list route can keep `*` (admin path, low traffic).
**Effort:** XS

### [HIGH] `getMidis()` fetches up to 300 rows then shuffles client-side
**File:** `apps/server/src/services/supabase-midi-provider.ts:52-69`
**Issue:** `const fetchCount = Math.min(count * 3, 100); ... query.limit(fetchCount)` plus a Fisher-Yates shuffle in JS. With only 4 active MIDIs in production today this is wasted, but the `*3` factor means for a 15-round game it fetches 45 rows even when 15 would suffice. There's also no `ORDER BY` so Postgres has no determinism — relying on heap order then re-shuffling client-side is wasteful.
**Impact:** Minor today (small catalog), but as the catalog grows past 100 MIDIs the response approaches the 100-row cap and the planner has to scan more pages. Adds 50-200 ms TTFB to game start.
**Fix:** Use Postgres's `ORDER BY random() LIMIT $count` (or a TABLESAMPLE-based query) so the DB returns exactly `count` rows already randomized. Alternatively cache the active catalog IDs in-process and randomize from the array, fetching only the selected IDs by `.in('id', selectedIds)`.
**Effort:** S

### [HIGH] No OG metadata (openGraph/twitter) anywhere in `generateMetadata`
**File:** `apps/web/src/app/[locale]/layout.tsx:42-64`
**Issue:** The root `generateMetadata` sets `title`, `description`, `manifest`, `icons`, `appleWebApp`, but no `openGraph` or `twitter` block, and no `metadataBase`. The `/api/og/daily/[number]` and `/api/og/room/[code]` ImageResponse routes exist but nothing references them — no `<meta property="og:image">` is rendered on `/daily`, `/room/[code]`, or `/`.
**Impact:** Sharing flows (one of the project's growth bets — see `specs/features/07-pwa-sharing.md`) post no preview cards. Also negatively affects Lighthouse SEO score (no `og:image`, no `og:url`, no `og:type`).
**Fix:** Add `metadataBase: new URL(APP_BASE_URL)` and an `openGraph` block in the root `generateMetadata`. On `/daily` and `/room/[code]/page.tsx` (which are client components today — make them server components or add `generateMetadata` to a sibling server file), point `openGraph.images` to the existing `/api/og/...` routes. Lighthouse SEO ≥ 90 needs this.
**Effort:** S

### [HIGH] `/api/og/daily/[number]` and `/api/og/room/[code]` have no Cache-Control
**File:** `apps/web/src/app/api/og/daily/[number]/route.tsx:1-96`, `apps/web/src/app/api/og/room/[code]/route.tsx:1-90`
**Issue:** Both edge routes use `next/og`'s `ImageResponse` but return it without `headers: { 'Cache-Control': 'public, max-age=..., s-maxage=..., stale-while-revalidate=...' }`. The Daily image is fully deterministic per day; the Room image is deterministic per code (rooms last < 1h on the server anyway). The default response has no `Cache-Control`, so every share will regenerate the 1200×630 image on the edge.
**Impact:** ImageResponse JSX → PNG renders take 50-200 ms on edge. With every social-platform crawler hitting the link (Facebook, Twitter, Discord, WhatsApp all fetch independently) this thrashes edge compute and inflates TTFB on the third-party crawler.
**Fix:**
- Daily: `headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, immutable' }` (image is per day-number, never changes).
- Room: `headers: { 'Cache-Control': 'public, max-age=600, s-maxage=600' }` (short TTL matches room lifecycle).
**Effort:** XS

### [HIGH] `phase-player.ts` uses `window.setTimeout` for end-of-phase trigger instead of Tone Transport
**File:** `apps/web/src/lib/midi/phase-player.ts:128-133`
**Issue:** After scheduling notes via `Tone.Transport`, the player sets `window.setTimeout(... handleEnded ..., (endAt + 0.4) * 1000)`. Per `.claude/rules/audio.md`: "Use Tone.Transport for scheduling — NEVER setTimeout for note timing". This isn't *note* timing, but it is *end-of-playback* timing and will drift relative to the AudioContext when the tab is throttled (Chrome throttles `setTimeout` to ≥1 s in background tabs but keeps AudioContext running).
**Impact:** In background tabs the "ended" callback fires late by up to several seconds, leaving the cadence state machine stuck on `playing-1`. The visualizer's `pause on hidden` mitigation in `audio-visualizer.tsx:51` partially hides this, but `useGameState` can land in a stuck cadence.
**Fix:** Use `Tone.Transport.scheduleOnce((time) => Tone.getDraw().schedule(handleEnded, time), endAt + 0.4)` so the end trigger lives on the same audio clock as the notes.
**Effort:** S

### [MEDIUM] Missing `<link rel="apple-touch-startup-image">` for iOS splash screens
**File:** `apps/web/src/app/[locale]/layout.tsx:42-64`, `apps/web/public/icons/`
**Issue:** PWA spec says iOS A2HS (Add to Home Screen) shows a black screen unless `apple-touch-startup-image` images are provided per resolution. The repo only has square icons; no portrait/landscape splash PNGs and no link tags.
**Impact:** iOS launch experience is a black screen for ~1-2 s. Doesn't affect Lighthouse PWA score (which only checks for `apple-touch-icon`, present via `appleWebApp` + `icons.apple`), but degrades the perceived install quality.
**Fix:** Generate splash images via the existing `scripts/generate-icons.ts` (e.g. via `pwa-asset-generator`) and inject the link tags through Next.js Metadata API's `other` map or a custom `<head>` in `layout.tsx`. Targets at minimum: iPhone 6/7/8 (750×1334), iPhone X+ (1125×2436), iPad (1536×2048).
**Effort:** M

### [MEDIUM] Three font families loaded with multiple weights = ~6 font files
**File:** `apps/web/src/app/[locale]/layout.tsx:17-36`
**Issue:** `Space_Grotesk` (3 weights: 500/600/700), `Inter` (3 weights: 400/500/600), `JetBrains_Mono` (2 weights: 400/500) — 8 weight files via `next/font/google`. `next/font` self-hosts each weight as a separate woff2 (~15-30 KB each), so the cold first-paint pulls ~150-200 KB of fonts.
**Impact:** ~200 KB blocking-ish (display: swap mitigates the FOIT but still affects LCP if the LCP element is text).
**Fix:** Drop weights you don't actually use. Audit Tailwind config — `font-display` is Space Grotesk (only 600/700 likely needed), `font-mono` is JetBrains (probably only 400). Removing 4 weights cuts ~80 KB. Also consider `subsets: ['latin']` is already there (good); ensure `preload: true` only for the LCP family (`Space_Grotesk` or `Inter`) and `preload: false` for the others.
**Effort:** XS

### [MEDIUM] `daily_results` lookups by `(user_id, date)` work, but `daily_schedule` could benefit from `category` index
**File:** `supabase/migrations/20260417120004_daily_tables.sql:38-47`, `apps/server/src/services/daily-service.ts:161-167`
**Issue:** `daily_schedule` has `date` as PK + `idx_daily_schedule_date` (date DESC). The daily-selection logic queries `select midi_id from daily_schedule order by date desc limit DAILY_BUFFER_DAYS` — covered by the PK index. Good. However, `daily_service.ts:218` does `select category from daily_schedule where date = $1` and the PK already covers it, so no issue here. **Real gap:** `room_scores` has indexes on `(session_id, round_number)` and `(player_id)`, both fine. `xp_events` has `(user_id, created_at desc)` and `(source)` — but the **`UNIQUE(source, source_ref)` constraint** (`20260417120005_xp_events.sql:15`) creates an index on `(source, source_ref)`. So all the spec-mandated indexes exist. Listed here as Medium because it's worth confirming under load.
**Impact:** None currently expected.
**Fix:** No action; verify with `EXPLAIN ANALYZE` after first 100 games.
**Effort:** XS (verify only)

### [MEDIUM] AvatarImage uses native `<img>` (Radix), not `next/image`
**File:** `apps/web/src/components/ui/avatar.tsx:22-32`, `apps/web/src/components/auth/user-avatar.tsx:47`
**Issue:** `.claude/rules/frontend.md` says "next/image for all images". Radix `Avatar.Image` renders a plain `<img>` element so the OAuth avatar from Google/Discord is not optimized, not lazy-loaded, and may cause layout shift.
**Impact:** Each profile/chat avatar (~5-10 KB JPEG from provider) loads un-optimized. For the chat sidebar with 10-12 players it adds ~50-100 KB of un-cached requests.
**Fix:** Either (a) wrap with `next/image` (more complex due to Radix's slot pattern), or (b) explicitly set `width`/`height` on the Radix Image to prevent CLS and add `loading="lazy"` (already implicit via Radix). Pragmatic fix: set `width`, `height`, `loading="lazy"`, and `decoding="async"` on the AvatarImage.
**Effort:** S

### [MEDIUM] `transpilePackages: ['@wts/shared']` while shared also has `prebuild` script — duplication
**File:** `apps/web/next.config.ts:24`, `apps/web/package.json:7`
**Issue:** `@wts/shared` exposes a `main: ./dist/index.js` (compiled) and the web app's `prebuild` runs `pnpm --filter @wts/shared run build` first. So `@wts/shared` is already shipped as compiled JS to consumers. Yet `transpilePackages` tells Next.js to re-transpile its source from scratch. The `webpack.resolve.extensionAlias` mapping `.js → .ts` is there precisely because Next is being asked to bypass the dist and read TS directly.
**Impact:** Build time is longer than necessary (transpiles `@wts/shared` twice — once via tsc, once via SWC), and runtime imports may pick up `src/index.ts` instead of `dist/index.js`, defeating any optimization done by tsc (declaration emit, etc.). It does *not* hurt the production bundle size meaningfully (SWC strips dead code).
**Fix:** Remove `transpilePackages` and the `extensionAlias` webpack hook now that `prebuild` produces compiled JS at `dist/`. Verify with `next build` that `@wts/shared` resolves to `dist/`.
**Effort:** S (needs a build verification)

### [MEDIUM] `home/page.tsx` is `force-dynamic` — kills caching for landing page
**File:** `apps/web/src/app/[locale]/page.tsx:13`
**Issue:** `export const dynamic = 'force-dynamic';` opts out of any caching. The page does fetch the user's home profile, so dynamic rendering is necessary *for logged-in users*. But anonymous/guest users see `LandingContent` which is fully static (Hero, HowItWorks, FeatureHighlights).
**Impact:** Anonymous visitors (the SEO-critical audience) get a server render on every request instead of a CDN cache hit, inflating TTFB and reducing Vercel's edge effectiveness.
**Fix:** Split into two routes: keep `/` static-rendered for anonymous (no `force-dynamic`), and either redirect logged-in users to `/dashboard` (server-side redirect from middleware) or render the dashboard via a dynamic segment with `loading.tsx`. Alternatively use `unstable_cache` around the profile fetch.
**Effort:** M

### [MEDIUM] `RoomPage` and `DailyPage` are full `'use client'` — no SSR, no streaming
**File:** `apps/web/src/app/[locale]/(game)/room/[code]/page.tsx:1`, `apps/web/src/app/[locale]/(game)/daily/page.tsx:1`
**Issue:** Both pages are marked `'use client'` at the top, so they cannot benefit from React Server Components or streaming. The auth guard happens client-side after hydration, producing a "loading spinner → content" flash. The Lobby is purely render-from-snapshot which could be a Server Component reading initial state from a REST endpoint.
**Impact:** First-paint shows the spinner from `authLoading`, not lobby content. Adds ~300-600 ms to perceived time-to-interactive on slow networks. Worse SEO for `/daily` (the daily card and challenge intro could be SSR'd).
**Fix:** Move the auth check into a Server Component shell (use `createSupabaseServerClient` like `[locale]/layout.tsx` already does) and render the loading state server-side. Push only the socket-driven `GameBoard` to a client subtree.
**Effort:** M

### [MEDIUM] No `update prompt` UI when a new SW is available
**File:** `apps/web/src/app/sw.ts:22-26`
**Issue:** Serwist is configured with `skipWaiting: true` + `clientsClaim: true`, which means a new SW takes over silently. There's no banner/toast informing the user "A new version is available — refresh". For an active game this is risky: if the SW updates mid-round it can re-fetch precached chunks and cause subtle bugs.
**Impact:** Subtle. Probably fine for MVP because rooms are short (< 10 min) and the SW rarely updates mid-session. Long-term it's a UX gap.
**Fix:** Either (a) remove `skipWaiting` and listen to the SW `controllerchange` event to show an "Update available" toast (via sonner), or (b) accept silent updates and document it. Already partially documented in `dev-docs/troubleshooting.mdx` IIRC.
**Effort:** S

### [LOW] `MAX_LOCAL_CHAT = 100` while server caps at 50 — divergence
**File:** `apps/web/src/hooks/use-room.ts:38`, `apps/server/src/services/room-manager.ts:18`
**Issue:** Client keeps last 100, server slices to last 50 in snapshots. Functionally fine but the 100-item buffer wastes memory in long sessions and may cause re-renders to skip non-existent messages.
**Impact:** Negligible.
**Fix:** Align both to 50 (or 100), and bear in mind point about removing `chat` from snapshot entirely.
**Effort:** XS

### [LOW] `room:state` emitted twice on disconnect
**File:** `apps/server/src/socket/room-events.ts:209-217`
**Issue:** `disconnect` handler emits `room:state` inside `roomManager.disconnectPlayer(... onGraceExpired ...)` setup *and* at line 215 immediately after for the "player marked disconnected" broadcast. After the grace period expires `roomManager.leaveRoom` also broadcasts. Net result: 2-3 snapshots per disconnect.
**Impact:** Minor extra packets when players churn.
**Fix:** Consolidate — emit once after marking disconnected, then a single emit after grace expiry.
**Effort:** XS

### [LOW] `AudioVisualizer` re-creates root style query (`getComputedStyle`) on every effect re-run
**File:** `apps/web/src/components/audio/audio-visualizer.tsx:34-38`
**Issue:** The effect deps are `[analyser, isPlaying, barCount]`. Every `analyser` swap (which happens once after AudioContext start) re-reads `--color-accent-cyan` etc. from CSS variables. Not a hot path but a small wasted layout read.
**Impact:** Negligible.
**Fix:** Memoize the color reads at module scope (or use a `useMemo` keyed only on a `colorsRev` constant).
**Effort:** XS

### [LOW] `viewport.maximumScale: 1` + `userScalable: false` is anti-accessibility
**File:** `apps/web/src/app/[locale]/layout.tsx:66-72`
**Issue:** Locks pinch-zoom. Lighthouse Accessibility flags this (axe rule "meta-viewport"). The intent is probably "stop browser auto-zoom on input focus on iOS" — better solved via `font-size: 16px` minimum on inputs.
**Impact:** Lighthouse Accessibility -5 to -10 points. Real users with low vision will hate this.
**Fix:** Remove `maximumScale` and `userScalable`. Set `font-size: 16px` on `<input>` and `<textarea>` if iOS auto-zoom becomes a problem.
**Effort:** XS

### [LOW] `manifest.webmanifest` lists icon `purpose: "any"` only — no `maskable` icons
**File:** `apps/web/public/manifest.webmanifest:14-23`
**Issue:** Android adaptive icons need at least one icon with `"purpose": "maskable"`. Without it the install icon on Android renders with a circular crop that may chop the logo.
**Impact:** Cosmetic on Android home screens; Lighthouse PWA flags "Manifest doesn't have a maskable icon" as an informational suggestion (does not fail >=90 score).
**Fix:** Generate a maskable variant (logo within the 80% safe zone) at 192 and 512, then add entries with `"purpose": "maskable"`.
**Effort:** XS

### [LOW] `daily-cron.ts` only selects the MIDI — no OG image pre-warm
**File:** `apps/server/src/services/daily-cron.ts:14-28`
**Issue:** The 03:00 UTC cron writes `daily_schedule` and returns. It doesn't hit `/api/og/daily/<n>` to pre-warm the edge cache, doesn't pre-validate the MIDI file is fetchable from Supabase Storage, and doesn't notify the web app to invalidate any cached daily state.
**Impact:** First user of the day pays the OG render cost (~200 ms) and any latency from cold MIDI fetch.
**Fix:** After successful selection, fire a `fetch(APP_BASE_URL + '/api/og/daily/' + dayNumber)` to warm the cache, and optionally `HEAD` the `midi_file_url` to fail fast if Storage is broken.
**Effort:** XS

---

## Positive observations

- **Manifest is complete.** Name, short_name, description, theme_color, background_color, start_url, scope, display, icons (8 sizes), categories, lang, dir all present.
- **Icons cover all required sizes** (72, 96, 128, 144, 152, 180, 192, 384, 512). The icon SVG source is committed for re-generation.
- **AudioContext is properly user-gesture gated** via `StartAudioOverlay` → `AudioContextProvider.start()` → `await Tone.start()`. iOS Safari requirement satisfied.
- **Visualizer respects `visibilitychange`** to stop the RAF loop when tab is hidden, and throttles at 30 FPS — matches `.claude/rules/audio.md`.
- **PhasePlayer disposes Tone objects** on unmount via `useMidiPlayer`'s cleanup effect (`hooks/use-midi-player.ts:40-48`).
- **Server-side scoring + accepted-titles never sent to client** before `round:reveal`. The `RoundSnapshot` shape is correct per `.claude/rules/socket.md`.
- **Offline fallback page exists** at `/offline` with a sibling layout that skips i18n routing — correct pattern for SW fallback when next-intl can't resolve messages without network.
- **SW configured well otherwise:** `skipWaiting`, `clientsClaim`, `navigationPreload`, cross-origin `/api/*` correctly bypassed via `NetworkOnly`, fallback navigations route to `/offline`.
- **DB indexes are well-aligned with hot queries:** `idx_sessions_room_code`, `idx_daily_user_date`, `idx_daily_user_completed` (partial), `idx_round_scores_session(session_id, round_number)`, `idx_xp_events_user_date`, and the spec-required `UNIQUE(source, source_ref)` on `xp_events` is implicitly indexed.
- **OG image endpoints exist** with `runtime: 'edge'` — fast generation infra is ready, just needs metadata wire-up + cache headers.
- **`sitemap.ts` + `robots.ts` are present** with sensible disallow for `/admin/`, `/api/`, `/auth/`.
- **No `lodash` imports**, no duplicate date libraries, no `console.log` in production paths (`console.debug` used only in `phase-player.ts:118`).
- **next/font used correctly** with `display: 'swap'` and `subsets: ['latin']`.
- **No `<img>` tags in src/** — only `<input>` for forms (7 occurrences, all in forms with associated labels via `<form>` context).
- **Rate-limiter prunes stale keys every 60 s** to avoid memory growth.

---

## Pre-deploy must-fix list

In priority order, to ship a credible v1.0 with Lighthouse PWA ≥ 90, Performance ≥ 80, SEO ≥ 90:

1. **Kill the 1-second `room:state` tick interval** (`round-orchestrator.ts:122-129`). Single biggest perf+bandwidth win.
2. **Drop `chat` from `RoomStateSnapshot`** (`room-manager.ts:83`); rely on `chat:message` event only.
3. **Switch Tone.js to named imports** in `phase-player.ts`, `audio-context.tsx`, `soundfont-loader.ts`. Considerable bundle saving.
4. **Add OpenGraph metadata** in root `generateMetadata` pointing to the existing `/api/og/...` routes — required for SEO ≥ 90 and to make the `/api/og` work do anything user-visible.
5. **Add `Cache-Control` headers to both OG routes** (`api/og/daily/[number]/route.tsx`, `api/og/room/[code]/route.tsx`). 5-line fix, prevents edge thrash.
6. **Project explicit columns in `SupabaseMidiProvider`** instead of `.select('*')` (`supabase-midi-provider.ts:46,89,109`).
7. **Remove `viewport.maximumScale: 1` and `userScalable: false`** for Lighthouse Accessibility.
8. **Trim font weights** in `[locale]/layout.tsx` to the ones actually used in Tailwind config (audit current usage; likely drop 3-4 weights).
9. **Move end-of-phase trigger from `setTimeout` to `Tone.Transport.scheduleOnce`** in `phase-player.ts:128`.
10. Either **implement the 20 MB soundfont cache contract** OR **update `.claude/rules/audio.md`** to mark it deferred — don't ship with the rule unmet and undocumented.

Items 1, 2, 3, 4, 5, 6 are achievable in a single afternoon (mostly XS-S effort) and should be considered blocking for the v1.0 deploy.
