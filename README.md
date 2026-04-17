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

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 (App Router) · Tailwind CSS v4 · Shadcn/UI |
| Audio | Tone.js · @tonejs/midi |
| Real-Time | Socket.io |
| Backend | Fastify · TypeScript |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth (Google + Discord) |
| PWA | Serwist |
| Monorepo | Turborepo · pnpm |
| Lint/Format | Biome |

## Estrutura do Monorepo

```
whats-the-sound/
├── apps/
│   ├── web/            ← Frontend (Next.js 15)
│   └── server/         ← Backend (Fastify + Socket.io)
├── packages/
│   └── shared/         ← Types e constants compartilhados
├── specs/              ← Especificações do produto e features
├── docs/               ← Design system e UX principles
├── tasks/              ← Backlog e plano de execução por sprints
└── CLAUDE.md           ← Configuração do agente de desenvolvimento
```

Cada serviço é isolado em sua própria pasta com `package.json` e `tsconfig.json` independentes. O root gerencia workspaces, scripts globais e configuração compartilhada (Biome, Turbo). Nenhum arquivo de um serviço vaza para outro.

## Primeiros passos

### Pré-requisitos

- Node.js 20+
- pnpm 9+
- Conta no [Supabase](https://supabase.com) (tier gratuito)

### Setup

```bash
# Clonar o repositório
git clone https://github.com/guiponsoni/whats-the-sound.git
cd whats-the-sound

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp apps/web/.env.example apps/web/.env.local
cp apps/server/.env.example apps/server/.env

# Push das migrations para o Supabase
pnpm db:push

# Seed do catálogo de 100 MIDIs
pnpm seed:midis

# Rodar em desenvolvimento (frontend + backend)
pnpm dev
```

### Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Roda frontend + backend em modo dev |
| `pnpm build` | Build de produção de ambos apps |
| `pnpm lint` | Biome check em todo o monorepo |
| `pnpm type-check` | TypeScript check sem emitir |
| `pnpm format` | Biome format |
| `pnpm seed:midis` | Popula o catálogo de 100 MIDIs |
| `pnpm db:push` | Push de migrations para o Supabase |
| `pnpm db:reset` | Reset do banco + re-seed |

## Desenvolvimento

O projeto segue o modelo **Spec-Driven Development** — toda feature tem uma especificação detalhada antes de qualquer código ser escrito. As specs estão em `specs/features/` e as tasks atômicas em `tasks/backlog.md`.

| Documento | Conteúdo |
|-----------|----------|
| `specs/overview.md` | Visão do produto, personas, roadmap |
| `specs/features/*.md` | Spec detalhada de cada feature (7 specs) |
| `specs/technical/architecture.md` | Stack, diagrama, decisões arquiteturais |
| `specs/technical/database.md` | Schema DDL completo, RLS, triggers |
| `docs/design-system.md` | Paleta synthwave, tipografia, componentes |
| `docs/ux-principles.md` | Princípios de UX, tom de voz, acessibilidade |
| `tasks/backlog.md` | 23 tasks atômicas com spec inline |
| `tasks/execution-plan.md` | 6 sprints com dependências e checklists |

## Deploy

| Serviço | Plataforma |
|---------|-----------|
| Frontend | [Vercel](https://vercel.com) |
| Backend | [Railway](https://railway.app) |
| Database & Auth | [Supabase](https://supabase.com) |

## Licença

Projeto privado. Todos os direitos reservados.
