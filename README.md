# 🔊 What's the Sound?

**Listen. Guess. Repeat.**

What's the Sound? (WTS) is a multiplayer PWA music guessing game. Listen to progressively longer snippets of songs in MIDI format and compete with friends to identify the track — as fast as possible.

Inspired by the competitive dynamics of [Gartic](https://gartic.io) and the nostalgic Brazilian TV segment “Qual é a Música?” by Silvio Santos.

## How it Works

1. **Listen** — The game plays a few notes of a song in MIDI format
2. **Guess** — Type your guess in the chat. Receive “hot or cold” feedback
3. **Compete** — The faster you guess, the more points you earn. 4 progressive reveal phases

### Progressive Reveal

Each song is revealed in **4 phases**, adding more sound layers:

| Phase | What plays       | Score (1st correct guess) |
| ----- | ---------------- | ------------------------- |
| 1     | 3–5 melody notes | 1000 pts                  |
| 2     | Extended melody  | 750 pts                   |
| 3     | Melody + harmony | 500 pts                   |
| 4     | Full MIDI track  | 250 pts                   |

Within each phase, scoring decreases for subsequent correct guesses (Gartic-style) — 2nd place earns less than 1st, 3rd less than 2nd, and so on.

### Game Modes

* **Multiplayer** — Create rooms, invite friends, play in real-time with interactive chat and smart feedback
* **Daily Sound** — One song per day, the same for everyone. Share your results on social media
* **XP + Level** — Play while logged in to earn XP and level up (badge `[Lv.X]` in chat/leaderboard). Guests can play everything but don’t accumulate progress

## Stack

| Layer       | Technology                                                                                |
| ----------- | ----------------------------------------------------------------------------------------- |
| Frontend    | Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · Radix UI + Shadcn-style components |
| Audio       | Tone.js · @tonejs/midi                                                                    |
| Real-Time   | Socket.io                                                                                 |
| Backend     | Fastify 5 · TypeScript                                                                    |
| Database    | PostgreSQL (Supabase)                                                                     |
| Auth        | Supabase Auth (Google + Discord)                                                          |
| i18n        | next-intl (pt-BR default + en)                                                            |
| PWA         | Serwist 9                                                                                 |
| Monorepo    | Turborepo · pnpm                                                                          |
| Lint/Format | Biome                                                                                     |

## Monorepo Structure

```
whats-the-sound/
├── apps/
│   ├── web/            ← Frontend (Next.js 15)
│   └── server/         ← Backend (Fastify + Socket.io)
├── packages/
│   └── shared/         ← Shared types, enums, constants, env helpers
├── supabase/           ← Config + versioned SQL migrations
├── specs/              ← Product and feature specifications (10 specs)
├── docs/               ← Design system, UX principles, and deploy checklist
├── .claude/            ← Claude Code memory, rules, and agents
└── CLAUDE.md           ← Development agent configuration
```

Each service is isolated in its own folder with independent `package.json` and `tsconfig.json`. The root manages workspaces, global scripts, and shared configuration (Biome, Turbo). No files leak between services.

## Getting Started

### Prerequisites

* **Node.js 20+** (uses native `--env-file` introduced in 20.6)
* **pnpm 9+**
* **Supabase account** (free tier, São Paulo region recommended)
* Optional for full OAuth: Google Cloud Console and Discord Developer Portal accounts

### Initial Setup (one-time)

**1. Clone and install**

```bash
git clone https://github.com/guiponsoni/whats-the-sound.git
cd whats-the-sound
pnpm install
```

**2. Configure environment variables**

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/server/.env.example apps/server/.env.local
```

Fill both files with your Supabase project credentials:

* `apps/web/.env.local` → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
* `apps/server/.env.local` → `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `DAILY_SEED`

> Supabase uses the new key format: `sb_publishable_*` (public) and `sb_secret_*` (server-only).

**3. Apply migrations**

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <YOUR_PROJECT_REF>

pnpm db:push
```

**4. Smoke test**

```bash
pnpm --filter @wts/server run smoke:db
```

You should see 6 green checks (tables + storage bucket + auth reachable).

### Run in Development

Two supported workflows. Pick one — they target the same code but differ in isolation.

**Docker compose (recommended)** — closer to production, isolates Node/pnpm versions, hot reload via volume mounts. Requires Docker Desktop running.

```bash
# 1. Populate the root .env (copy from .env.example, fill Supabase keys)
cp .env.example .env

# 2. Build + run with hot reload
docker compose -f docker-compose.dev.yml up --build

# or, if you want the matching production image
docker compose up --build
```

Useful shortcuts (defined in the root `Makefile` / `package.json`):

| Command       | What it does                                                |
| ------------- | ----------------------------------------------------------- |
| `pnpm up:dev` | `supabase start` (local DB) + `docker compose dev` attached |
| `pnpm up`     | `supabase start` + `docker compose` (prod build, detached)  |
| `pnpm down`   | Stop docker services + `supabase stop`                      |
| `pnpm logs`   | Follow logs from both containers                            |
| `pnpm reset`  | Wipe DB, re-run migrations, restart app                     |

**Native pnpm (fallback)** — for fast iteration when Docker is heavy on your machine. You point at a cloud Supabase project; nothing local except Node.

```bash
# Per-app .env.local files (same vars as the root .env, just split)
cp apps/web/.env.example apps/web/.env.local
cp apps/server/.env.example apps/server/.env.local

pnpm dev
```

Either way the apps land here:

| App           | URL                                            | Description                                |
| ------------- | ---------------------------------------------- | ------------------------------------------ |
| `@wts/web`    | [http://localhost:3000](http://localhost:3000) | Next.js (redirects / → /pt-BR/)            |
| `@wts/server` | [http://localhost:3001](http://localhost:3001) | Fastify (GET /health = `{ status: "ok" }`) |

Both reload on save. Stop everything with a single `Ctrl+C` (or `pnpm down` if you used Docker detached).

### Available Scripts

| Command                                 | Description                                 |
| --------------------------------------- | ------------------------------------------- |
| `pnpm dev`                              | Native dev: turbo runs frontend + backend   |
| `pnpm up:dev`                           | Docker dev (with hot reload)                |
| `pnpm up`                               | Docker prod image build + run (detached)    |
| `pnpm down`                             | Stop docker + supabase local                |
| `pnpm logs`                             | Follow docker logs                          |
| `pnpm reset`                            | Wipe DB, re-run migrations, restart docker  |
| `pnpm build`                            | Production build for both apps              |
| `pnpm lint`                             | Run Biome across monorepo                   |
| `pnpm type-check`                       | Run `tsc --noEmit`                          |
| `pnpm format`                           | Format with Biome                           |
| `pnpm db:push`                          | Apply Supabase migrations                   |
| `pnpm db:diff`                          | Show local vs remote DB diff                |
| `pnpm db:reset`                         | Reset linked database (destructive)         |
| `pnpm --filter @wts/server smoke:db`    | Schema + auth smoke test                    |
| `pnpm --filter @wts/web generate-icons` | Regenerate PWA icons                        |

## Development

The project follows **Spec-Driven Development** — every feature has a detailed spec in `specs/features/`, maintained as the source of truth even after MVP.

| Document                          | Content                                                                |
| --------------------------------- | ---------------------------------------------------------------------- |
| `specs/overview.md`               | Product vision, personas, roadmap                                      |
| `specs/features/01-07.md`         | Core specs: setup, MIDI engine, auth, multiplayer, daily, catalog, PWA |
| `specs/features/08-xp-system.md`  | XP + Level system                                                      |
| `specs/features/09-dev-docs.md`   | Internal /admin/docs portal                                            |
| `specs/features/10-i18n.md`       | Internationalization (pt-BR + en)                                      |
| `specs/technical/architecture.md` | Architecture and decisions                                             |
| `specs/technical/database.md`     | Full schema, RLS, triggers                                             |
| `docs/design-system.md`           | Synthwave palette, typography, components                              |
| `docs/ux-principles.md`           | UX principles and accessibility                                        |
| `docs/deploy-checklist.md`        | Pre-deploy and production checklist                                    |

### Progress — v1.0.0

| Sprint                                  | Status | Tasks                                  |
| --------------------------------------- | ------ | -------------------------------------- |
| 1 — Foundation                          | ✅      | 001, 002, 003, 004, 024, 026, 028, 032 |
| 2 — MIDI Engine + Auth + Internal Infra | ✅      | 005, 006, 007, 008, 025, 029           |
| 3 — Multiplayer Core                    | ✅      | 009, 010, 011, 027                     |
| 4 — Multiplayer Frontend                | ✅      | 012, 013, 014                          |
| 5 — Daily Sound + XP + Polish           | ✅      | 015, 016, 017, 018, 019, 020, 030, 031 |
| 6 — Admin + QA + Deploy                 | ✅      | 021, 022, 023                          |

**32 tasks / ~110h / 6 sprints — MVP complete.**

## Deploy

| Service         | Platform | Config                     |
| --------------- | -------- | -------------------------- |
| Frontend        | Vercel   | `vercel.json` (root)       |
| Backend         | Railway  | `apps/server/railway.json` |
| Database & Auth | Supabase | `supabase/` migrations     |

### Environment Variables (Production)

**Vercel (frontend):**

| Variable                               | Example                             |
| -------------------------------------- | ----------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | `https://xxx.supabase.co`           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...`                |
| `NEXT_PUBLIC_SERVER_URL`               | `https://wts-server.up.railway.app` |
| `NEXT_PUBLIC_APP_URL`                  | `https://whatsthesound.io`          |

**Railway (backend):**

| Variable              | Example                      |
| --------------------- | ---------------------------- |
| `NODE_ENV`            | `production`                 |
| `PORT`                | `3001`                       |
| `SUPABASE_URL`        | `https://xxx.supabase.co`    |
| `SUPABASE_SECRET_KEY` | `sb_secret_...`              |
| `DATABASE_URL`        | `postgresql://...`           |
| `DAILY_SEED`          | `random-seed-string-8chars+` |
| `CORS_ORIGINS`        | `https://whatsthesound.io`   |

### Deployment Steps

See `docs/deploy-checklist.md` for the full deployment checklist and production testing steps.

## License

MIT
