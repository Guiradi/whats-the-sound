# 🔊 What's the Sound?

**Ouça. Adivinhe. Repita.**

What's the Sound? (WTS) é um jogo PWA multiplayer de adivinhação musical. Escute trechos progressivos de músicas em formato MIDI e compita com amigos para descobrir qual é a música — o mais rápido possível.

Inspirado na dinâmica competitiva do [Gartic](https://gartic.io) e na nostalgia do quadro "Qual é a Música?" do Silvio Santos.

## Como funciona

1. **Ouça** — O jogo toca poucas notas de uma música em MIDI
2. **Adivinhe** — Digite seu palpite no chat. Receba dicas de "quente ou frio"
3. **Compita** — Quem acerta primeiro ganha mais pontos. 4 fases de revelação progressiva

### Modos de jogo

- **Multiplayer** — Crie salas, convide amigos, jogue em tempo real com pontuação estilo Gartic (1º a acertar leva mais pontos)
- **Daily Sound** — Uma música por dia, igual pra todo mundo. Compartilhe seu resultado nas redes sociais

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 (App Router) + Tailwind CSS v4 + Shadcn/UI |
| Audio | Tone.js + @tonejs/midi |
| Real-Time | Socket.io |
| Backend | Fastify + TypeScript |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth (Google + Discord) |
| PWA | Serwist |
| Monorepo | Turborepo + pnpm |

## Estrutura do Monorepo

```
whats-the-sound/
├── apps/
│   ├── web/            ← Frontend (Next.js 15)
│   └── server/         ← Backend (Fastify + Socket.io)
├── packages/
│   └── shared/         ← Types e constants compartilhados
├── specs/              ← Especificações do produto
├── docs/               ← Design system e UX
├── tasks/              ← Backlog e sprints
└── CLAUDE.md           ← Configuração do agente de desenvolvimento
```

## Primeiros passos

```bash
# Instalar dependências
pnpm install

# Rodar em desenvolvimento (frontend + backend)
pnpm dev

# Build de produção
pnpm build

# Lint e type check
pnpm lint
pnpm type-check
```

## Desenvolvimento

O projeto segue o modelo **Spec-Driven Development** — toda feature tem uma especificação detalhada antes de qualquer código ser escrito. As specs estão em `specs/features/` e as tasks atômicas em `tasks/backlog.md`.

Para entender o projeto:

- **Visão do produto** → `specs/overview.md`
- **Arquitetura técnica** → `specs/technical/architecture.md`
- **Schema do banco** → `specs/technical/database.md`
- **Design system** → `docs/design-system.md`
- **Backlog de tasks** → `tasks/backlog.md`
- **Plano de execução** → `tasks/execution-plan.md`

## Licença

Projeto privado. Todos os direitos reservados.
