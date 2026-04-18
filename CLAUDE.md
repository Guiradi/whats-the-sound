# What's the Sound? (WTS)

Jogo PWA multiplayer de adivinhação musical com áudios MIDI e revelação progressiva. Inspirado no Gartic (competição social) e "Qual é a Música?" (adivinhação por notas).

## Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript 5.x strict
- **Styling:** Tailwind CSS v4 + Shadcn/UI
- **Audio:** Tone.js 15.x + @tonejs/midi 2.x
- **Real-Time:** Socket.io 4.x (client + server)
- **Backend:** Fastify 5.x + TypeScript
- **Database:** PostgreSQL 15 (Supabase)
- **Auth:** Supabase Auth (Google + Discord OAuth)
- **Storage:** Supabase Storage (MIDI files)
- **PWA:** Serwist 9.x
- **Monorepo:** Turborepo 2.x + pnpm 9.x
- **Lint/Format:** Biome 1.x
- **Deploy:** Vercel (frontend) + Railway (backend)

## Commands

```bash
pnpm dev              # Roda frontend + backend em dev
pnpm build            # Build de produção (ambos apps)
pnpm lint             # Biome check em todo o monorepo
pnpm type-check       # tsc --noEmit em todo o monorepo
pnpm format           # Biome format
pnpm seed:midis       # Seed do catálogo de 100 MIDIs
pnpm db:push          # Push migrations para Supabase
pnpm db:reset         # Reset do banco + re-seed
```

## Code Style

- **Linter/Formatter:** Biome (lint + format unificado)
- **Naming:**
  - Arquivos/pastas: kebab-case (`audio-visualizer.tsx`, `use-midi-player.ts`)
  - Componentes React: PascalCase (`AudioVisualizer`, `GameBoard`)
  - Hooks: camelCase com prefixo use (`useMidiPlayer`, `useRoom`)
  - Types/Interfaces: PascalCase (`MidiEntry`, `RoomState`)
  - Enums: PascalCase com valores UPPER_SNAKE_CASE
  - Constants: UPPER_SNAKE_CASE (`MAX_PLAYERS`, `PHASE_SCORES`)
  - DB columns: snake_case (`midi_file_url`, `created_at`)
- **Imports:** Absolute paths com aliases (@/components, @/lib, @/hooks, @/types)
- **Components:** Function components only. Named exports para componentes, default export para páginas.
- **Server vs Client:** Componentes são Server Components por padrão. Usar `"use client"` apenas quando necessário (hooks, eventos, browser APIs).
- **Todo código em inglês.** Nomes de funções, variáveis, tipos, arquivos, comentários, schema do banco (tabelas, colunas, enums) e documentação interna **SEMPRE em inglês**.
- **UI text via next-intl desde o MVP** (pt-BR default + en). Nenhuma string voltada ao jogador fica hardcoded em componentes. Adicionar string nova = adicionar em `apps/web/messages/pt-BR.json` **E** `apps/web/messages/en.json` em paralelo. Identifiers de key (`home.hero.title`) também em inglês — só o valor varia por locale. Ver `specs/features/10-i18n.md`.
- **Zod** para validação de input em API endpoints e forms.
- **Sem `any`** — usar `unknown` e narrowing quando tipo é incerto.

## File Structure

```
whats-the-sound/
├── CLAUDE.md
├── .claude/rules/
│   ├── frontend.md
│   ├── database.md
│   ├── socket.md
│   └── audio.md
├── specs/
│   ├── overview.md
│   ├── features/
│   │   ├── 01-project-setup.md
│   │   ├── 02-midi-engine.md
│   │   ├── 03-auth.md
│   │   ├── 04-multiplayer-rooms.md
│   │   ├── 05-daily-sound.md
│   │   ├── 06-midi-catalog.md
│   │   ├── 07-pwa-sharing.md
│   │   ├── 08-xp-system.md       ← XP + Level (MVP, logados only)
│   │   ├── 09-dev-docs.md        ← Portal interno /admin/docs
│   │   └── 10-i18n.md            ← next-intl pt-BR + en (MVP)
│   └── technical/
│       ├── architecture.md
│       └── database.md
├── docs/
│   ├── design-system.md
│   └── ux-principles.md
├── tasks/
│   ├── backlog.md          ← TODAS as tasks pendentes
│   ├── execution-plan.md   ← Sprints e dependências
│   └── completed.md        ← Tasks finalizadas
├── apps/
│   ├── web/                ← Next.js 15 frontend
│   │   ├── src/
│   │   │   ├── app/        ← App Router pages
│   │   │   │   ├── (game)/ ← Route group: /room/[code], /daily
│   │   │   │   ├── (auth)/ ← Route group: /login, /auth/callback
│   │   │   │   ├── (admin)/← Route group: /admin/*
│   │   │   │   └── layout.tsx
│   │   │   ├── components/ ← React components
│   │   │   │   ├── ui/     ← Shadcn/UI base components
│   │   │   │   ├── game/   ← GameBoard, PlayerList, GameChat, etc.
│   │   │   │   ├── daily/  ← DailyChallenge, DailyResult, etc.
│   │   │   │   ├── room/   ← RoomLobby, RoomConfig, etc.
│   │   │   │   ├── auth/   ← LoginModal, UserAvatar, etc.
│   │   │   │   └── shared/ ← ShareButton, AudioVisualizer, etc.
│   │   │   ├── hooks/      ← Custom hooks
│   │   │   │   ├── use-midi-player.ts
│   │   │   │   ├── use-room.ts
│   │   │   │   ├── use-auth.ts
│   │   │   │   └── use-socket.ts
│   │   │   ├── lib/        ← Utilities, services, configs
│   │   │   │   ├── supabase/  ← Supabase client (browser + server)
│   │   │   │   ├── socket.ts  ← Socket.io client instance
│   │   │   │   ├── midi/      ← MIDI parser, phase player
│   │   │   │   └── utils.ts   ← Levenshtein, formatting, etc.
│   │   │   ├── types/      ← Frontend-specific types
│   │   │   └── styles/     ← globals.css
│   │   ├── public/         ← Static assets, manifest, icons
│   │   └── next.config.ts
│   └── server/             ← Fastify + Socket.io backend
│       ├── src/
│       │   ├── routes/     ← REST API routes
│       │   │   ├── health.ts
│       │   │   ├── catalog.ts
│       │   │   ├── daily.ts
│       │   │   ├── profile.ts
│       │   │   └── admin.ts
│       │   ├── services/   ← Business logic
│       │   │   ├── room-manager.ts
│       │   │   ├── game-loop.ts
│       │   │   ├── guess-verifier.ts
│       │   │   ├── scoring.ts
│       │   │   └── daily-selector.ts
│       │   ├── socket/     ← Socket.io event handlers
│       │   │   ├── index.ts
│       │   │   ├── room-events.ts
│       │   │   └── game-events.ts
│       │   ├── types/      ← Server-specific types
│       │   ├── middleware/  ← Auth, rate-limit, validation
│       │   └── index.ts    ← Server entry point
│       └── tsconfig.json
└── packages/
    └── shared/             ← Shared types and constants
        ├── src/
        │   ├── types/      ← Socket events, DTOs, enums
        │   ├── constants/  ← Scoring values, phase config
        │   └── index.ts
        └── tsconfig.json
```

## Architecture Decisions

1. **PWA, não app nativo** — Alcance máximo, sem app store. Instalável via browser.
2. **MIDI, não áudio real** — Zero problemas de copyright. Timbre retrô é identidade.
3. **Revelação em camadas** (tracks) e não "mais segundos" — Cria experiência progressiva única.
4. **Socket.io rooms = Game rooms** — Mapping 1:1, reconexão automática, fallback polling.
5. **Scoring server-side** — Anti-cheat. Timestamp do server define ordem de acerto.
6. **Pontuação decrescente estilo Gartic** — 1º a acertar leva mais pontos, decay por posição.
7. **Guest mode sem conta** — Zero fricção para novos jogadores.
8. **Fastify, não NestJS** — Leve e rápido para o escopo do MVP.
9. **Monorepo** — Type-safety end-to-end com types compartilhados.
10. **Supabase** — Auth + DB + Storage unificado, tier gratuito, região Brasil.

## Key Conventions

- **Toda feature começa pela spec** — Ler `specs/features/XX-*.md` antes de codar.
- **Tasks são atômicas** — Cada task do backlog é completável em 1-6 horas.
- **Backlog é source of truth** — Todo trabalho pendente está em `tasks/backlog.md`.
- **Atualizar status** — Marcar task como `[→]` ao iniciar, `[✓]` ao concluir.
- **Mover tasks concluídas** — Após completar, mover de backlog.md para completed.md.
- **Respostas NUNCA no client** — Título/artista da música NUNCA enviados antes do round_end.
- **Mobile-first** — Todo componente é pensado primeiro para mobile.
- **Dark mode only** — Sem tema claro no MVP.
- **Sem console.log em production** — Usar logger estruturado no server.
- **Commits convencionais** — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`

## Workflow: Sprint Execution

1. Ler `tasks/execution-plan.md` para entender a sprint atual
2. Ler a task no `tasks/backlog.md` — contém spec inline com TUDO necessário
3. Ler a spec de referência (`specs/features/XX-*.md`) para contexto completo
4. Seguir a ordem de dependências (nunca pular uma task que depende de outra incompleta)
5. Implementar a task conforme a spec
6. Validar usando o checklist da task
7. Rodar: `pnpm lint && pnpm type-check && pnpm build`
8. **Atualizar o Dev Docs Portal** (feature 09) — toda TASK concluída atualiza:
   - A seção arquitetural correspondente em `apps/web/src/content/dev-docs/arch/*.mdx` (ou `setup/`, `conventions/`, `troubleshooting/` conforme o caso)
   - Uma entrada nova em `apps/web/src/content/dev-docs/progress.mdx` com resumo do que foi entregue e link para `tasks/completed.md#TASK-XXX`
   - Rodapé "Última atualização: TASK-XXX — YYYY-MM-DD" da page tocada
   - Antes da TASK-029 estar pronta, escrever o conteúdo em `.md` colado na spec relacionada ou em um scratch; migrar quando o portal existir
9. Atualizar status da task no backlog (`[→]` → `[✓]`)
10. Mover task concluída para `tasks/completed.md`

## Specs & Docs

| Documento                        | Conteúdo                                    |
|----------------------------------|---------------------------------------------|
| `specs/overview.md`              | Visão do produto, personas, fases, métricas |
| `specs/features/01-07.md`        | Features core do produto (setup, MIDI, auth, MP, daily, catálogo, PWA) |
| `specs/features/08-xp-system.md` | XP + Level (badge visual, fontes, curva quadrática) |
| `specs/features/09-dev-docs.md`  | Portal interno /admin/docs (MDX + role admin) |
| `specs/features/10-i18n.md`      | Internacionalização pt-BR + en (next-intl, prefixo por locale) |
| `specs/technical/architecture.md`| Stack, diagrama, decisões arquiteturais     |
| `specs/technical/database.md`    | Schema DDL completo, RLS, triggers          |
| `docs/design-system.md`         | Cores, tipografia, espaçamento, componentes |
| `docs/ux-principles.md`         | Princípios UX, tom de voz, acessibilidade   |
| `tasks/backlog.md`              | Todas as tasks com spec inline              |
| `tasks/execution-plan.md`       | Sprints organizadas com dependências        |
| `tasks/v1-checklists.md`       | Checklists: pré-deploy, deploy, testes prod |

## Testing

- **v1.0 (MVP):** Testes manuais conforme `tasks/v1-checklists.md` — 3 seções: pré-deploy (~45 min), deploy step-by-step, testes em produção (~20 min)
- **Futuro (Fase 2+):**
  - Unit tests: Vitest para services (guess-verifier, scoring, daily-selector)
  - Integration tests: Playwright para fluxos críticos (login, jogo completo, daily)
  - Coverage mínimo futuro: 70% em services/
