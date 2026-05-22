# Code Quality + Spec Gaps Audit — What's the Sound
Date: 2026-05-22 | Scope: Pre-deploy quality review

## Summary

- Critical: 1
- High: 6
- Medium: 9
- Low: 7

The MVP is implemented at ~85-90% per the 12 specs. TypeScript discipline is strong (only 2 `as any`, both justified by a Biome ignore on `socket.io` emit typing). Zero tests exist. The biggest spec gaps are: (a) real soundfonts and SF cache versioning (spec 02), (b) MIDI seed script `pnpm seed:midis` referenced in CLAUDE.md / deploy-checklist / progress.mdx but not present in any package.json, (c) push notifications (spec 07), (d) OG image pre-generation strategy not aligned with spec 07. The README and dev-docs/setup.mdx are out of date — Docker compose workflow (Makefile / `pnpm up` / `pnpm up:dev` / `pnpm reset`) is fully wired but undocumented for new contributors. i18n key parity is perfect (557/557).

## Feature implementation status table

| #  | Feature                       | Status                              | Missing                                                                                                                                                                                                                                                                                |
|----|-------------------------------|-------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 01 | Project Setup & Infrastructure| Done (with doc drift)               | README + dev-docs/setup.mdx still describe `pnpm dev`; Docker compose / Supabase local workflow (Makefile + `pnpm up`/`up:dev`/`down`/`logs`/`reset`) is implemented but undocumented for new contributors                                                                              |
| 02 | MIDI Engine & Progressive Reveal | Partial                          | Soundfonts NOT implemented — `soundfont-loader.ts` is just a PolySynth fallback (admits this in comment); no GM samples, no cache versioning with hash, no SW eviction of stale soundfont keys, no fallback cascade logging; `loadMidiFromBuffer` exposed but unused; `test-melody.ts` dead       |
| 03 | Auth & Profile                | Done                                | All requirements appear met (Google + Discord OAuth, guest, nickname unique + profanity, avatar with hash fallback, debounced uniqueness check). Spec 03 was largely written before the engagement extensions in spec 08; nothing missing per spec 03 itself                          |
| 04 | Multiplayer Rooms & Real-Time | Done                                | Host migration, reconnect (with 30s disconnect timer), `room:state` snapshot with version field, server-side scoring/timestamps, bot messages, guess verification with Levenshtein + diacritic + leading-article strip all present                                                      |
| 05 | Daily Sound                   | Partial                             | Core flow done (4 phases × 1 attempt, deterministic selection w/ 100-day window, daily streak, history calendar, BRT cron, emoji grid share). OG image strategy diverges from spec: spec says pre-generate to Supabase Storage via cron; impl uses on-demand `@vercel/og` edge route (still acceptable but contradicts spec). OG image route hard-codes Portuguese tagline "Ouça. Adivinhe. Compartilhe." regardless of locale |
| 06 | MIDI Catalog & Admin          | Partial                             | `pnpm seed:midis` referenced in CLAUDE.md / deploy-checklist / progress.mdx but the script literally does not exist — no entry in any `package.json`, no source file. Admin upload form is multi-step (upload → metadata → answers → review) and uses auto-computed phases per spec 02 update (not the manual track/beat configurator from spec 06; spec 02 supersedes — spec 06 should be reconciled) |
| 07 | PWA & Social Sharing          | Partial                             | No push notification registration / permission UX / notification scheduling (spec marks Fase 2 but says "setup na Fase 1"). No `<InstallPrompt>` component. OG image pre-generation strategy not aligned with spec. Manifest is good (icons 72→512). SW only bypasses cross-origin API, no soundfont precache (because soundfonts don't exist) |
| 08 | XP & Level System             | Done                                | `xp_events` audit table present, sources for MP correct / finish / round-played / daily / streak / login / referral all wired; level formula + safety cap (50k/day) in shared constants. Some XP sources defined in spec aren't yet checked into the enum on the DB side — verify against `20260417120005_xp_events.sql` if expanding |
| 09 | Dev Docs Portal               | Done                                | `/admin/docs` with admin gate, MDX, sidebar, search, dev escape `ALLOW_ADMIN_WITHOUT_ROLE`. Content covers setup, arch, conventions, troubleshooting, progress, runbooks. Setup page is stale (see #01)                                                                                |
| 10 | i18n (next-intl)              | Done                                | 557/557 keys in sync between pt-BR and en. Locale switcher, prefix routing, `NEXT_LOCALE` cookie all present. Three minor hardcoded-string leaks (see findings)                                                                                                                         |
| 11 | Achievements                  | Done                                | 8-badge catalog, `user_achievements` table, server-side checks fire-and-forget, socket unlock emission, `xp_source = 'achievement_unlocked'` extension                                                                                                                                  |
| 12 | Admin Dashboard               | Done                                | `/admin` landing + stats, `/admin/catalog`, category enable/disable via `admin_config`, `requireAdmin` middleware returning 404 (not 403) per spec                                                                                                                                      |

## Findings (ordered by severity)

### [CRITICAL] `pnpm seed:midis` is referenced everywhere but does not exist
**File:** root `package.json` (script missing), `CLAUDE.md:28`, `docs/deploy-checklist.md:184`, `apps/web/src/content/dev-docs/progress.mdx:61`, `specs/features/06-midi-catalog.md:86`
**Issue:** The deploy checklist instructs operators to run `pnpm seed:midis` to populate the production catalog. The script is not defined in `package.json`, no source file exists in `apps/server` / `apps/web` / `packages/shared`, and no JSON seed data file exists. The TASK-018 entry in `progress.mdx` claims this is done.
**Impact:** A production deploy will go live with zero MIDIs unless an admin manually uploads each via `/admin/catalog/new`. Daily Sound cron will fail loudly (or pick from an empty pool). MVP target is 30-50 verified MIDIs per spec 06.
**Fix:** Either (a) build the seed script as specified (read JSON catalog file + use Supabase admin client to insert rows and upload to Storage), or (b) remove all references and document the manual upload workflow as the intended path.
**Effort:** M (script + JSON metadata for ~30 songs + curating actual `.mid` files)

### [HIGH] Real soundfonts not implemented; engine falls back to PolySynth
**File:** `apps/web/src/lib/midi/soundfont-loader.ts:14-44`
**Issue:** Spec 02 (and `.claude/rules/audio.md`) specify: Piano (~2 MB) precached, Guitar/Bass/Strings/Drums lazy, 20 MB total budget, cache key with `<hash8>` version, SW eviction of stale entries on `activate`, fallback cascade with logging. None of this exists — `createInstrumentRegistry` simply returns `new Tone.PolySynth(Tone.Synth)` keyed by `'drum' | 'melodic'`. The comment in the file admits "Real soundfont samplers will land behind the same interface when TASK-018 seeds the catalog."
**Impact:** Audio is generic synth tone for every instrument; no acoustic piano timbre that's part of the product identity ("Timbre retrô é identidade" per CLAUDE.md). Spec 02 mobile autoplay flow still works because it depends on `Tone.start()`, not on soundfonts. Spec 07 SW soundfont precache is also blocked.
**Fix:** Implement `Tone.Sampler` with FatBoy/VCSL samples (per spec 02 source recommendation), add hash-keyed Cache Storage entries, log fallback path. Coordinate with the seed script.
**Effort:** L

### [HIGH] No push notification infrastructure
**File:** entire `apps/web/src/app/sw.ts` and components/
**Issue:** Spec 07 requires push subscription registration (Fase 1 setup, Fase 2 send), contextual permission ask (after 3rd Daily / after signup), and three planned notifications (Daily reminder 20h, streak risk 22h, friend created room). Grep for `push`, `Notification`, `pushManager`, `subscribe` returns zero relevant matches. The SW is `serwist` with default cache only, no `push` event handler.
**Impact:** A core MVP retention lever from spec 07 is absent. Streak users have no nudge to return — direct retention impact on the most critical engagement loop (Daily).
**Fix:** Add `push`/`notificationclick` handlers to `sw.ts`, build a `<NotificationPermission>` modal triggered contextually, persist subscription to a new `push_subscriptions` table, schedule sends from the Railway cron.
**Effort:** L

### [HIGH] OG image pre-generation strategy diverges from spec 07
**File:** `apps/web/src/app/api/og/daily/[number]/route.tsx`, `apps/web/src/app/api/og/room/[code]/route.tsx`
**Issue:** Spec 07 (post-audit revision) requires the daily OG image to be **pre-generated** by the 03:00 UTC cron and stored in Supabase Storage at `og/daily/{n}.png`, with `og:image` pointing to that static URL — explicitly to avoid 1-2s cold starts of `@vercel/og`. Implementation is on-demand `@vercel/og` at the edge for both daily and room. Acceptable trade-off for room (rare share); not aligned for daily (the critical-path share).
**Impact:** Twitter/WhatsApp preview will sometimes time out or show no image when the share happens within minutes of the daily flip. SEO/virality impact.
**Fix:** Either (a) add a cron step that POSTs to the OG route and uploads result to Storage, or (b) explicitly document the divergence in spec 07 as accepted.
**Effort:** S

### [HIGH] OG daily route hard-codes Portuguese tagline, ignoring locale
**File:** `apps/web/src/app/api/og/daily/[number]/route.tsx:76`
**Issue:** `<div>Ouça. Adivinhe. Compartilhe.</div>` is hardcoded Portuguese in the rendered image. Spec 10 ("Regra de ouro") says user-facing text must come from `messages/<locale>.json`; the route doesn't even accept `locale` from query/params.
**Impact:** English-speaking users sharing the daily image see Portuguese copy.
**Fix:** Accept `?locale=en|pt-BR`, read the appropriate string. The strings already exist in `messages/*.json` under `home.heroTagline` (`Listen. Guess. Repeat.` / `Ouça. Adivinhe. Repita.`) — note slight wording inconsistency too.
**Effort:** XS

### [HIGH] README and dev-docs/setup.mdx don't mention the actual local workflow
**File:** `README.md:117-132`, `apps/web/src/content/dev-docs/setup.mdx:62-66`
**Issue:** Both documents instruct contributors to run `pnpm dev`. `package.json` has a full Docker compose workflow now (`pnpm up`, `up:dev`, `down`, `logs`, `reset`) plus a `Makefile` with `make up/dev/down/logs/reset/clean` that integrates `supabase start`. None of this is in the README or in the dev-docs. The recent commit `308c133` apparently added Docker but didn't update docs.
**Impact:** A new contributor reading either entry point cannot reproduce the current developer workflow. Onboarding regression.
**Fix:** Update both files with a "Local with Docker" section pointing at Makefile + `pnpm up:dev`. Decide whether `pnpm dev` (raw turbo) is still the recommended path or fallback.
**Effort:** S

### [HIGH] `apps/web/src/hooks/room/` contains non-hook helpers, violating CLAUDE.md naming convention
**File:** `apps/web/src/hooks/room/apply-socket-auth.ts`, `apps/web/src/hooks/room/register-room-listeners.ts`
**Issue:** CLAUDE.md says "Hooks: camelCase com prefixo use (`useMidiPlayer`, `useRoom`)". These exports are `applySocketAuth` and `registerRoomListeners` — plain helper functions, not hooks. They were extracted from `useRoom` (mentioned in v1.0 cleanup progress note) but placed under `hooks/`, which the convention defines as the hooks directory.
**Impact:** Convention drift. Confuses new contributors about what counts as a hook.
**Fix:** Move both to `apps/web/src/lib/room/` (helper layer) or inline them back into `use-room.ts`. The 178-line `use-room.ts` is fine to keep helpers near.
**Effort:** XS

### [MEDIUM] Next.js version inconsistency between root and apps/web
**File:** `package.json:29` (`next ^15.5.15`) vs `apps/web/package.json:33` (`next ^15.1.6`)
**Issue:** Both ranges resolve to 15.5.15 in `pnpm-lock.yaml` lines 3539 / 4907, so no runtime drift today. But the `^15.1.6` floor in the app is much lower than what's actually installed — confusing on upgrade audits.
**Impact:** Cosmetic/maintenance. A future `pnpm update --latest` on the workspace would surface the discrepancy.
**Fix:** Bump `apps/web/package.json` to `^15.5.15` (or remove `next` from root devDeps if it's only there for tooling reasons — root doesn't run Next directly).
**Effort:** XS

### [MEDIUM] Two `as any` casts on socket.io emit
**File:** `apps/server/src/services/achievement-service.ts:28`, `apps/server/src/services/xp-service.ts:34`
**Issue:** `(io.to(`user:${userId}`).emit as any)(event, payload)` — uses dynamic event names not in the typed `ServerToClientEvents` union for that emit signature. Both are covered by a `biome-ignore` comment with a real justification ("socket.io's emit is dynamically typed here"). Real cause: dynamic per-user rooms with typed events that the TypedSocket overload doesn't infer.
**Impact:** Type safety lost at exactly the place achievement/XP payloads are emitted to per-user rooms. If a payload shape changes, the compiler won't catch the mismatch on the server-side emit.
**Fix:** Define a `UserBroadcastEvents` map and a small typed `emitToUser<K extends keyof UserBroadcastEvents>` helper that uses `keyof` + `Parameters<>` to keep typing. Then drop both `as any` and the ignores.
**Effort:** S

### [MEDIUM] `loadMidiFromBuffer` and `test-melody.ts` are dead code
**File:** `apps/web/src/lib/midi/test-melody.ts` (whole file), `apps/web/src/hooks/use-midi-player.ts:13,149-161,182` (the hook method)
**Issue:** `generateTestMelodyBuffer()` is only referenced in `dev-docs/arch/audio.mdx` (documentation). `loadMidiFromBuffer` is exposed by the hook but has zero callers in app code (grep `\.loadMidiFromBuffer\(` yields nothing). They were used by the now-removed `/dev/audio` smoke route (per TASK-022 in progress.mdx: "removed dev/audio route + HashDebugLogger").
**Impact:** Dead code carries a maintenance tax and gives a false impression that the hook supports in-memory loading.
**Fix:** Delete `test-melody.ts` and update audio.mdx; remove `loadMidiFromBuffer` from the hook and `parseMidiFromBuffer` from `parser.ts` (if also unused).
**Effort:** XS

### [MEDIUM] `eslint-disable` comment in a Biome-only project
**File:** `apps/web/src/components/admin/test-play-sandbox.tsx:103`
**Issue:** `// eslint-disable-next-line react-hooks/exhaustive-deps` — the project doesn't use ESLint at all (Biome handles lint). Biome currently doesn't ship `useExhaustiveDependencies` rule under the same name; this directive has no effect.
**Impact:** Either Biome warns and the comment doesn't silence it, or no rule fires either way. Either way, the comment is misleading.
**Fix:** Replace with `// biome-ignore lint/correctness/useExhaustiveDependencies: <reason>` if Biome warns, or delete the comment if Biome doesn't flag it.
**Effort:** XS

### [MEDIUM] Hardcoded Portuguese in shared UI primitive
**File:** `apps/web/src/components/ui/dialog.tsx:53`
**Issue:** `<span className="sr-only">Fechar</span>` — Portuguese for "Close" is hardcoded in a shared Shadcn-derived primitive used across the app, bypassing next-intl. Spec 10 explicitly forbids hardcoded user-facing strings.
**Impact:** Screen reader users in English locale hear "Fechar" instead of "Close". Accessibility-i18n regression.
**Fix:** Accept a `closeLabel` prop on `DialogContent` defaulting to a translated value supplied by callers, or use `useTranslations('common.actions')` with a `close` key (already exists in both message files).
**Effort:** XS

### [MEDIUM] Hardcoded English strings in pages
**File:** `apps/web/src/app/[locale]/admin/catalog/[id]/edit/page.tsx:57`, `apps/web/src/app/[locale]/(game)/daily/history/page.tsx:66`
**Issue:** Two visible bits of UI text bypass next-intl:
- `<div>...Not found</div>` shown when an admin tries to edit a nonexistent catalog entry.
- `<Button>Login</Button>` shown to guests on the daily history page.
**Impact:** Inconsistency in localization; pt-BR users see English.
**Fix:** Move both into `messages/{pt-BR,en}.json` and reference via `useTranslations`.
**Effort:** XS

### [MEDIUM] Two `biome-ignore noArrayIndexKey` in a stable list
**File:** `apps/web/src/components/admin/midi-upload-form.tsx:394,434`
**Issue:** Justified as "dynamic list with add/remove by index", but the items are `acceptedTitles` / `acceptedArtists` string variations. Adding a stable id (uuid generated when a slot is created) would avoid the warning and protect against React reordering bugs if the form ever supports drag-reorder.
**Impact:** Latent risk if the form gains reorder capability; minor lint debt today.
**Fix:** Generate `id` on slot creation, key by it. Or accept the trade-off and remove if the lists are append-only and never reorder.
**Effort:** XS

### [MEDIUM] `start_url` in manifest doesn't include locale prefix
**File:** `apps/web/public/manifest.webmanifest:5-6`
**Issue:** `"start_url": "/", "scope": "/"`. The app's middleware always redirects `/` to `/<locale>/...`, so an installed PWA gets a 307 on launch every time, then a fresh page load. Minor but a visible cold-start delay on mobile.
**Impact:** Slight launch latency from PWA shortcut. Some old WebAPK behaviors cache the redirected URL, but new installs hit the redirect each time.
**Fix:** Either keep current behavior (acceptable) or pre-compute start_url server-side based on `Accept-Language` (PWA manifest is static so this isn't trivial) — likely no action needed, document the choice.
**Effort:** XS (or skip)

### [MEDIUM] `nav-visibility.ts` is a `.ts` helper file in `components/shared/`
**File:** `apps/web/src/components/shared/nav-visibility.ts`
**Issue:** Pure JS functions placed under `components/` directory. CLAUDE.md doesn't ban this explicitly, but it's the only non-`.tsx` file under `components/shared/` and would logically live in `lib/` or alongside the consumers in `lib/nav/`.
**Impact:** Slight inconsistency.
**Fix:** Move to `apps/web/src/lib/nav-visibility.ts`.
**Effort:** XS

### [LOW] `manifest.webmanifest` declares `"lang": "pt-BR"` only
**File:** `apps/web/public/manifest.webmanifest:12`
**Issue:** Hard-coded `pt-BR` even though the app supports `en`. PWA spec allows only one `lang` per manifest; this is acceptable but worth confirming intent.
**Impact:** Screen readers reading the manifest may default to pt-BR pronunciation rules for English users at the PWA install prompt.
**Fix:** Document as accepted, or generate per-locale manifests routed by middleware. Probably accept the current default since pt-BR is primary.
**Effort:** XS (or skip)

### [LOW] `console.debug` in production code path
**File:** `apps/web/src/lib/midi/phase-player.ts:118`
**Issue:** CLAUDE.md says "Sem console.log em production code — usar logger estruturado no server." Frontend doesn't have a structured logger; this is `console.debug` (lowest level, dropped by browsers by default), but it does emit `[PhasePlayer] bpm=… phase=…` on every play. Other browser `console.warn`/`console.error` calls are in error boundaries / fetch failures and are justified.
**Impact:** Low (debug level is muted by default), but noisy in DevTools when verbose logging is on.
**Fix:** Wrap behind `process.env.NEXT_PUBLIC_DEBUG_AUDIO === '1'` or a small `debug()` helper.
**Effort:** XS

### [LOW] `<html lang>` always `en` in offline page despite being bilingual
**File:** `apps/web/src/app/offline/page.tsx:8`
**Issue:** `<html lang="en">` but the page renders both English and Portuguese paragraphs. The page intentionally lives outside `[locale]` (justified comment exists), but the `lang` attribute lies to assistive tech.
**Impact:** Mild a11y concern for screen readers.
**Fix:** Drop the `lang` attribute (let UA infer) or set `lang="und"`; or pick one language and let the alternate be a secondary `<p lang="pt-BR">`.
**Effort:** XS

### [LOW] Specs 06 vs 02 contradict on phase configuration
**File:** `specs/features/06-midi-catalog.md:62-67,99-102` vs `specs/features/02-midi-engine.md:50-68`
**Issue:** Spec 06 requires a manual `PhaseConfigurator` UI (admin selects tracks via checkbox + beat range slider per phase, with preview). Spec 02 specifies auto-computed phases (4/8/16/32 bars, no track selection). The implementation follows spec 02 (auto-compute in `midi-analyzer.ts`). Spec 06 is now stale.
**Impact:** Documentation contradiction — confuses anyone reading both.
**Fix:** Update spec 06 to reflect the auto-compute design, or note the supersession.
**Effort:** XS

### [LOW] `audits/` was empty but referenced by tooling output
**File:** `C:\Users\guilh\workspace\whats-the-sound\audits\` (directory)
**Issue:** Directory exists but was empty before this audit. No README or .gitkeep.
**Impact:** None; just a convention.
**Fix:** Optional .gitkeep or index README.
**Effort:** XS

### [LOW] Some shared package exports re-export under multiple subpaths
**File:** `packages/shared/package.json:8-44`
**Issue:** The package exposes both `./index.js` (re-exports everything) and named subpath exports (`./types`, `./constants`, `./enums`, `./achievements`, `./utils`, `./chat`, `./zod`, `./env`). Most consumers use the root barrel (`from '@wts/shared'`). The subpath exports are useful for tree-shaking but only `./env` is actually imported via a subpath (`@wts/shared/env`) in `apps/server/src/index.ts`.
**Impact:** Low — extra `exports` entries are fine; just confirm they aren't dead.
**Fix:** Either start importing via subpaths in critical client bundles (real benefit) or trim unused entries from `exports`.
**Effort:** S

### [LOW] No tests anywhere in the repo
**File:** repo-wide
**Issue:** Glob for `**/*.{test,spec}.{ts,tsx}` and `**/__tests__/**` returns nothing. CLAUDE.md acknowledges this ("v1.0 (MVP): Testes manuais"). Spec 04 explicitly lists **"Testes obrigatórios antes de TASK-011"** for the guess algorithm (5 specific cases like "bohemian rhapsody"/"bohemiam rapsody"/articles). Those tests don't exist.
**Impact:** Guess verification is the most spec-sensitive piece of code and has no automated coverage. A regression in `normalizeText` or `levenshteinDistance` would only surface in manual QA.
**Fix:** Add Vitest to `packages/shared` with the 5 spec-mandated cases as a starter. Effort to set up Vitest + 5 tests is small.
**Effort:** S

## TODOs / FIXMEs found

The codebase is unusually clean here — grep `TODO|FIXME|HACK|XXX` against TS/TSX/JS/MJS files returns only:

- `apps/web/src/lib/auth/guest.ts:47` — `XXXX` inside a doc comment about generated nickname format (`Guest_XXXX`). Not a real TODO.
- `apps/web/src/components/shared/referral-capture.tsx:61` — `?ref=XXX` in a docstring. Not a real TODO.
- `apps/web/src/app/[locale]/[...rest]/page.tsx:4` — comment uses "any" in English prose ("not-found.tsx for any unmatched path"). Matched only by lazy `\bany\b` grep, not an actual `any` type.
- `apps/web/src/middleware.ts:15,52` — uses "any" in prose comments ("before any routing", "render without any i18n routing").
- `packages/shared/src/constants/index.ts:84` — "any plausible human session" in prose.
- `specs/features/04-multiplayer-rooms.md:66` — "Se TODOS acertarem" (Portuguese capitalized).
- `specs/features/08-xp-system.md:197` — `XXX XP` placeholder in spec example.
- `specs/features/09-dev-docs.md:58` — `TASK-XXX` placeholder convention.

**No actual TODO/FIXME/HACK markers in source code.** This is a strong signal of either disciplined cleanup (TASK-022 QA pass) or sufficient deferral via specs.

## i18n gaps (keys missing in one locale)

- **None.** Programmatic key-tree diff of `apps/web/messages/pt-BR.json` (557 keys) vs `apps/web/messages/en.json` (557 keys) shows zero asymmetry.

Three runtime gaps remain (covered above in findings):
- `Fechar` hardcoded in `components/ui/dialog.tsx:53`
- `Not found` hardcoded in `app/[locale]/admin/catalog/[id]/edit/page.tsx:57`
- `Login` hardcoded in `app/[locale]/(game)/daily/history/page.tsx:66`
- `Ouça. Adivinhe. Compartilhe.` hardcoded in `app/api/og/daily/[number]/route.tsx:76`

## Dead code candidates

- `apps/web/src/lib/midi/test-melody.ts` — exported `generateTestMelodyBuffer` has no importers in source (only mentioned in dev-docs/arch/audio.mdx).
- `apps/web/src/hooks/use-midi-player.ts:13,149-161,182` — `loadMidiFromBuffer` exposed but never called.
- `apps/web/src/lib/midi/parser.ts` — `parseMidiFromBuffer` may also be unused (only consumed by the dead `loadMidiFromBuffer`; verify before deleting).
- Possibly unused fine-grained subpath exports in `packages/shared/package.json` (see LOW finding).

No other clearly-dead modules; the codebase has been swept (TASK-022 + v1.0 cleanup per progress.mdx). The MIDI test melody is the most obvious leftover from the deleted `/dev/audio` smoke route.

## Positive observations

- **Zero `any` in source.** The only two `as any` casts are both narrowly bounded (`socket.io` dynamic emit), justified with comments, and covered by a single Biome rule ignore each. No `@ts-ignore` or `@ts-expect-error` anywhere.
- **i18n key parity is perfect.** 557 keys, 557 keys, zero drift — rare for a project this size. ICU plurals used correctly in `home.dashboard.welcome.loginStreak` etc.
- **Strict TS config.** `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noImplicitReturns` all on in `tsconfig.base.json`. All workspaces extend it.
- **Biome config is strict.** `noExplicitAny: error`, `noUnusedVariables: error`, `noUnusedImports: error`, `noNonNullAssertion: warn`. No `noNonNullAssertion` violations (`!.` etc.) found.
- **Server-side scoring + timestamps** correctly implemented (spec 04 anti-cheat). Room snapshot deliberately excludes `midi.title`/`artist`.
- **Host migration** end-to-end (`room-manager.ts:199-232` + emit in `room-events.ts:203-235` + spec-aligned `joinedAt` ordering).
- **Guess verification** is faithful to spec: `normalizeText` strips diacritics via NFD + `\p{Mn}`, removes leading articles `the|o|a|os|as|um|uma`, scales thresholds for candidates >20 chars.
- **Idempotent XP via `(source, source_ref)` UNIQUE** at the DB level (`20260417120005_xp_events.sql`), and `xp-service.ts` honors it. Daily safety cap (`XP_DAILY_SAFETY_CAP = 50_000`) lives in shared constants.
- **`requireAdmin` middleware returns 404** (not 403) per spec 09/12 — doesn't leak route existence.
- **Dev escape hatch** `ALLOW_ADMIN_WITHOUT_ROLE` for local admin testing, documented in setup.mdx.
- **Standalone Next.js build + Docker multi-stage** is production-ready (Dockerfile uses pinned pnpm@10.26.2 + bash for the explicit web build script).
- **`@vercel/og` runtime correctly set to `edge`** with safe param parsing (`Number(number) || 0`).
- **next-intl middleware composed carefully** with Supabase session refresh — cookies preserved across redirects (web/middleware.ts:25-37).
- **No service role key leakage** detected — only used server-side via `getSupabaseAdmin()`.

## Recommended pre-deploy work

Highest-impact items in suggested order:

1. **Decide on `pnpm seed:midis`** (CRITICAL). Either implement it (+ JSON catalog of ~30 verified MIDIs + actual .mid files in Supabase Storage) OR explicitly remove all references and document the manual upload workflow in deploy-checklist.md. Production cannot launch without a catalog.
2. **Bring soundfonts online or accept synth-only audio** (HIGH). The brand promise of "MIDI retrô" reads weak with PolySynth-only. If you must defer, update spec 02 to say "Phase 2 soundfonts" and surface it on the landing page somehow.
3. **Update README + dev-docs/setup.mdx with Docker workflow** (HIGH). 30 minutes of work; protects new contributors.
4. **Fix the OG daily route locale hardcode** (HIGH). One line in `route.tsx`; meaningful for sharing UX.
5. **Triage the 3 hardcoded UI strings + remove dead code** (MEDIUM bundle). Half an hour total. Restores i18n discipline and cleans the MIDI module.
6. **Add Vitest + the 5 spec-mandated guess verification tests** (MEDIUM/LOW but high leverage). The guess algorithm is the most semantically loaded code in the repo and has zero coverage. Five tests gate against future regressions and unblock the next time someone touches normalization.
7. **Reconcile spec 06 vs spec 02** (LOW). Just a doc edit — pick one source of truth for phase configuration.
8. **Push notifications** (HIGH but largest scope). If the goal is to recover Daily retention, this is the highest single ROI item. Defer to a v1.1 milestone post-launch if launch can't wait.
