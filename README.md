# 🔊 What's the Sound?

**Ouça. Adivinhe. Repita.**

What's the Sound? (WTS) é um jogo PWA multiplayer de adivinhação musical. Escute trechos progressivos de músicas em formato MIDI e compita com amigos para descobrir qual é a música — o mais rápido possível.

Inspirado na dinâmica competitiva do [Gartic](https://gartic.io) e na nostalgia do quadro "Qual é a Música?" do Silvio Santos.

## Como funciona

1. **Ouça** — O jogo toca poucas notas de uma música em MIDI
2. **Adivinhe** — Digite seu palpite no chat. Receba dicas de "quente ou frio"
3. **Compita** — Quem acerta primeiro ganha mais pontos. 4 fases de revelação progressiva

### Revelação Progressiva

Cada música é revelada em **4 fases**, adicionando mais camadas sonoras:

| Fase | O que toca | Pontuação (1º a acertar) |
|------|-----------|--------------------------|
| 1 | 3-5 notas da melodia | 1000 pts |
| 2 | Melodia estendida | 750 pts |
| 3 | Melodia + harmonia | 500 pts |
| 4 | Música MIDI completa | 250 pts |

Dentro de cada fase, a pontuação decai para cada acerto subsequente (estilo Gartic) — o 2º ganha menos que o 1º, o 3º menos que o 2º, e assim por diante.

### Modos de jogo

- **Multiplayer** — Crie salas, convide amigos, jogue em tempo real com chat interativo e feedback inteligente
- **Daily Sound** — Uma música por dia, igual pra todo mundo. Compartilhe seu resultado nas redes sociais
- **XP + Level** — Jogue logado para acumular XP e subir de nível (badge `[Lv.X]` no chat/pódio). Guests podem jogar tudo, só não acumulam progresso

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · Radix UI + Shadcn-style components |
| Audio | Tone.js · @tonejs/midi |
| Real-Time | Socket.io |
| Backend | Fastify 5 · TypeScript |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth (Google + Discord) |
| i18n | next-intl (pt-BR default + en) |
| PWA | Serwist 9 |
| Monorepo | Turborepo · pnpm |
| Lint/Format | Biome |

## Estrutura do Monorepo

```
whats-the-sound/
├── apps/
│   ├── web/            ← Frontend (Next.js 15)
│   └── server/         ← Backend (Fastify + Socket.io)
├── packages/
│   └── shared/         ← Types, enums, constants, env helpers compartilhados
├── supabase/           ← Config + migrations SQL versionadas
├── specs/              ← Especificações do produto e features (10 specs)
├── docs/               ← Design system, UX principles e deploy checklist
├── .claude/            ← Memory, rules e agentes do Claude Code
└── CLAUDE.md           ← Configuração do agente de desenvolvimento
```

Cada serviço é isolado em sua própria pasta com `package.json` e `tsconfig.json` independentes. O root gerencia workspaces, scripts globais e configuração compartilhada (Biome, Turbo). Nenhum arquivo de um serviço vaza para outro.

## Primeiros passos

### Pré-requisitos

- **Node.js 20+** (usamos `--env-file` nativo que apareceu na 20.6)
- **pnpm 9+**
- **Conta no [Supabase](https://supabase.com)** (tier gratuito, região São Paulo)
- Opcional para OAuth completo: contas no [Google Cloud Console](https://console.cloud.google.com) e [Discord Developer Portal](https://discord.com/developers/applications)

### Setup inicial (uma vez)

**1. Clonar e instalar**

```bash
git clone https://github.com/guiponsoni/whats-the-sound.git
cd whats-the-sound
pnpm install
```

**2. Configurar variáveis de ambiente**

Copiar os templates:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/server/.env.example apps/server/.env.local
```

Preencher ambos os arquivos com as credenciais do seu projeto Supabase:

- `apps/web/.env.local` → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `apps/server/.env.local` → `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `DAILY_SEED`

> As chaves usam o formato novo do Supabase: `sb_publishable_*` (público) e `sb_secret_*` (server-only).

**3. Aplicar migrations no Supabase**

```bash
# Login e link (uma vez)
pnpm exec supabase login
pnpm exec supabase link --project-ref <SEU_PROJECT_REF>

# Aplicar as 8 migrations
pnpm db:push
```

**4. Smoke test**

```bash
pnpm --filter @wts/server run smoke:db
```

Deve imprimir 6 checks verdes (tabelas + storage bucket + auth admin reachable).

### Rodar em desenvolvimento

Da **raiz** do projeto, um único comando sobe tudo:

```bash
pnpm dev
```

O Turborepo dispara em paralelo:

| App | URL | O que é |
|---|---|---|
| `@wts/web` | http://localhost:3000 | Next.js (redireciona / → /pt-BR/) |
| `@wts/server` | http://localhost:3001 | Fastify (GET /health = `{ status: "ok" }`) |

Ambos recarregam ao salvar. O server usa `tsx watch --env-file=.env.local`; o web usa `next dev` (Next auto-carrega `.env.local`).

Para matar, `Ctrl+C` uma vez — Turborepo encerra os dois.

### Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Roda frontend + backend em modo dev (watch mode) |
| `pnpm build` | Build de produção de ambos apps |
| `pnpm lint` | Biome check em todo o monorepo |
| `pnpm type-check` | `tsc --noEmit` em todo workspace |
| `pnpm format` | Biome format --write |
| `pnpm db:push` | Supabase CLI aplica migrations pendentes |
| `pnpm db:diff` | Supabase CLI exibe diff entre local e remoto |
| `pnpm db:reset` | Reset do banco linked (destrutivo) |
| `pnpm --filter @wts/server smoke:db` | Smoke test do schema + auth |
| `pnpm --filter @wts/web generate-icons` | Regerar ícones PWA a partir de `icon-source.svg` |

## Desenvolvimento

O projeto segue o modelo **Spec-Driven Development** — toda feature tem uma especificação detalhada em `specs/features/`, mantida como fonte de verdade mesmo após o MVP.

| Documento | Conteúdo |
|-----------|----------|
| `specs/overview.md` | Visão do produto, personas, roadmap |
| `specs/features/01-07.md` | Specs core: setup, MIDI engine, auth, multiplayer, daily, catálogo, PWA |
| `specs/features/08-xp-system.md` | XP + Level (fontes, curva quadrática, badge) |
| `specs/features/09-dev-docs.md` | Portal interno /admin/docs (MDX gated) |
| `specs/features/10-i18n.md` | Internacionalização pt-BR + en via next-intl |
| `specs/technical/architecture.md` | Stack, diagrama, decisões arquiteturais |
| `specs/technical/database.md` | Schema DDL completo, RLS, triggers |
| `docs/design-system.md` | Paleta synthwave, tipografia, componentes |
| `docs/ux-principles.md` | Princípios de UX, tom de voz, acessibilidade |
| `docs/deploy-checklist.md` | Checklist de pré-deploy, deploy e smoke em produção |

### Progresso — v1.0.0

| Sprint | Status | Tasks |
|---|---|---|
| 1 — Fundação | ✅ | 001, 002, 003, 004, 024, 026, 028, 032 |
| 2 — MIDI Engine + Auth + Infra Interna | ✅ | 005, 006, 007, 008, 025, 029 |
| 3 — Multiplayer Core | ✅ | 009, 010, 011, 027 |
| 4 — Frontend Multiplayer | ✅ | 012, 013, 014 |
| 5 — Daily Sound + XP + Polish | ✅ | 015, 016, 017, 018, 019, 020, 030, 031 |
| 6 — Admin + QA + Deploy | ✅ | 021, 022, 023 |

**32 tasks / ~110h / 6 sprints — MVP completo.**

## Deploy

| Serviço | Plataforma | Config |
|---------|-----------|--------|
| Frontend | [Vercel](https://vercel.com) | `vercel.json` na raiz |
| Backend | [Railway](https://railway.app) | `apps/server/railway.json` |
| Database & Auth | [Supabase](https://supabase.com) | `supabase/` migrations |

### Variáveis de ambiente (produção)

**Vercel (frontend):**

| Variável | Exemplo |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `NEXT_PUBLIC_SERVER_URL` | `https://wts-server.up.railway.app` |
| `NEXT_PUBLIC_APP_URL` | `https://whatsthesound.io` |

**Railway (backend):**

| Variável | Exemplo |
|----------|---------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` |
| `DATABASE_URL` | `postgresql://...` |
| `DAILY_SEED` | `random-seed-string-8chars+` |
| `CORS_ORIGINS` | `https://whatsthesound.io` |

### Deploy step-by-step

Ver `docs/deploy-checklist.md` para o checklist completo de deploy e testes.

## Licença

Projeto privado. Todos os direitos reservados.
