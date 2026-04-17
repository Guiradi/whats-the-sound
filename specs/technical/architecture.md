# Technical Architecture — What's the Sound?

## Stack Completa

| Camada           | Tecnologia              | Versão   | Justificativa                                           |
|------------------|-------------------------|----------|---------------------------------------------------------|
| Frontend         | Next.js (App Router)    | 15.x     | SSR, PWA, OG Images, file-based routing                 |
| UI Framework     | Tailwind CSS            | v4       | Utility-first, dark mode nativo, performance            |
| UI Components    | Shadcn/UI               | latest   | Componentes acessíveis, customizáveis, não é dependência|
| Audio Engine     | Tone.js                 | 15.x     | Web Audio API wrapper, scheduling, soundfonts           |
| MIDI Parser      | @tonejs/midi            | 2.x      | Parsing de MIDI files, compatível com Tone.js           |
| Real-Time        | Socket.io               | 4.x      | Rooms, reconexão automática, fallback polling           |
| Backend API      | Fastify                 | 5.x      | Leve, rápido, TypeScript nativo, plugins                |
| Database         | PostgreSQL (Supabase)   | 15       | RLS, real-time subscriptions, managed                   |
| Auth             | Supabase Auth           | —        | Google + Discord OAuth, session management              |
| Storage          | Supabase Storage        | —        | MIDI files, avatares                                    |
| PWA              | Serwist                 | 9.x      | Service worker moderno para Next.js App Router          |
| Monorepo         | Turborepo               | 2.x      | Build caching, task pipeline                            |
| Package Manager  | pnpm                    | 9.x      | Workspaces nativos, rápido                              |
| Linting          | Biome                   | 1.x      | Lint + format unificado, rápido                         |
| TypeScript       | TypeScript              | 5.x      | Strict mode                                             |
| Deploy (Front)   | Vercel                  | —        | Edge functions, OG Image API, preview deploys           |
| Deploy (Back)    | Railway                 | —        | WebSocket support, auto-scaling, managed                |
| CI/CD            | GitHub Actions          | —        | Build, test, deploy automático                          |

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser/PWA)                       │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  Next.js    │  │  Tone.js     │  │  Socket.io   │               │
│  │  App Router │  │  MIDI Player │  │  Client      │               │
│  │  (UI/SSR)   │  │  + Soundfont │  │  (Real-time) │               │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                │                  │                        │
│  ┌──────┴──────┐         │           ┌──────┴───────┐               │
│  │  Service    │         │           │  WebSocket   │               │
│  │  Worker     │         │           │  Connection  │               │
│  │  (Serwist)  │         │           │              │               │
│  └─────────────┘         │           └──────┬───────┘               │
└──────────────────────────┼──────────────────┼───────────────────────┘
                           │                  │
                    HTTPS (REST)        WSS (WebSocket)
                           │                  │
┌──────────────────────────┼──────────────────┼───────────────────────┐
│                      VERCEL (Frontend Host)  │                       │
│  ┌─────────────────────┐ │                  │                        │
│  │  Next.js Server     │ │                  │                        │
│  │  - API Routes       ◄─┘                  │                        │
│  │  - OG Image Gen     │                    │                        │
│  │  - SSR Pages        │                    │                        │
│  └──────────┬──────────┘                    │                        │
└─────────────┼───────────────────────────────┼───────────────────────┘
              │                               │
              │ HTTPS                         │ WSS
              │                               │
┌─────────────┼───────────────────────────────┼───────────────────────┐
│             │         RAILWAY (Backend)      │                       │
│  ┌──────────▼──────────┐  ┌─────────────────▼──────┐               │
│  │  Fastify Server     │  │  Socket.io Server      │               │
│  │  - REST API         │  │  - Room Management     │               │
│  │  - Auth middleware  │  │  - Game Loop           │               │
│  │  - MIDI catalog API │  │  - Chat & Scoring      │               │
│  │  - Daily Sound cron │  │  - Real-time events    │               │
│  └──────────┬──────────┘  └─────────────────┬──────┘               │
│             │                               │                        │
│             └───────────┬───────────────────┘                        │
└─────────────────────────┼───────────────────────────────────────────┘
                          │
                    Supabase Client
                          │
┌─────────────────────────┼───────────────────────────────────────────┐
│                    SUPABASE (BaaS)                                    │
│                         │                                            │
│  ┌──────────┐  ┌───────▼────────┐  ┌──────────────┐                │
│  │  Auth    │  │  PostgreSQL    │  │  Storage     │                │
│  │  Google  │  │  - users       │  │  - midis/    │                │
│  │  Discord │  │  - rooms       │  │  - avatars/  │                │
│  │          │  │  - scores      │  │              │                │
│  │          │  │  - daily_sound │  │              │                │
│  │          │  │  - midi_catalog│  │              │                │
│  └──────────┘  └────────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

## Decisões Arquiteturais

### 1. Monorepo (Turborepo) ao invés de repos separados
- **Por quê:** Frontend e backend compartilham types (TypeScript interfaces para eventos Socket.io, DTOs, enums). Monorepo garante type-safety end-to-end.
- **Trade-off:** Deploy precisa de configs separadas (Vercel ignora apps/server, Railway ignora apps/web).

### 2. Fastify ao invés de NestJS
- **Por quê:** NestJS adiciona ~15 dependências e muita cerimônia (decorators, modules, providers) para um backend que essencialmente gerencia salas e verifica palpites. Fastify é 2x mais rápido em benchmarks e tem 1/5 do boilerplate.
- **Trade-off:** Menos estrutura opinada — requer disciplina na organização do código.

### 3. Socket.io ao invés de WebSocket puro ou Supabase Realtime
- **Por quê:** Socket.io tem conceito nativo de "rooms" que mapeia 1:1 com salas do jogo. Reconexão automática, fallback para polling, e ecosystem maduro (adapters para Redis se precisar escalar).
- **Trade-off:** Overhead de ~15KB no client vs WebSocket puro. Aceitável.

### 4. Supabase ao invés de Firebase ou Postgres self-hosted
- **Por quê:** PostgreSQL (mais robusto que Firestore para queries complexas de ranking), Auth com OAuth social built-in, Storage para MIDI files, tier gratuito generoso, hosting no Brasil (região São Paulo).
- **Trade-off:** Vendor lock-in no Auth e Storage (mitigável — PostgreSQL é portável).

### 5. Tone.js ao invés de Web MIDI API
- **Por quê:** Web MIDI API é para dispositivos MIDI físicos, não para playback de arquivos. Tone.js interpreta MIDI via Web Audio API com soundfonts, permite controle fino de scheduling (tocar notas específicas), e inclui analyser para visualização de áudio.
- **Trade-off:** Requer soundfonts (~2-5MB), mitigado por cache no service worker.

### 6. Vercel + Railway ao invés de tudo em um server
- **Por quê:** Vercel é otimizado para Next.js (edge caching, OG image API, preview deploys). Railway suporta WebSockets nativamente e long-running processes (game loops). Separar permite escalar independentemente.
- **Trade-off:** Dois serviços de hosting, CORS entre domínios.

## Padrões de Comunicação

### Client → Server (REST)
- Auth (login/logout/session)
- Catálogo de MIDIs (listagem, daily sound)
- Profile (CRUD)
- Rankings (read)

### Client ↔ Server (WebSocket — Socket.io)
- Sala: create, join, leave, config
- Game loop: round start, phase change, round end, game end
- Chat: messages, guesses, bot responses
- Scoring: acerto, pontuação, ranking update

### Eventos Socket.io (Shared Types)

```typescript
// Client → Server
interface ClientToServerEvents {
  'room:create': (config: RoomConfig) => void;
  'room:join': (code: string, nickname: string) => void;
  'room:leave': () => void;
  'room:start': () => void;                    // host only
  'game:guess': (guess: string) => void;
  'chat:message': (message: string) => void;
}

// Server → Client
interface ServerToClientEvents {
  'room:created': (room: RoomState) => void;
  'room:joined': (player: PlayerInfo) => void;
  'room:left': (playerId: string) => void;
  'room:state': (state: RoomState) => void;    // full state sync on reconnect
  'game:round_start': (round: RoundInfo) => void;
  'game:phase_start': (phase: PhaseInfo) => void;
  'game:phase_audio': (audioData: PhaseAudioData) => void;
  'game:guess_result': (result: GuessResult) => void;
  'game:player_correct': (info: PlayerCorrectInfo) => void;
  'game:round_end': (result: RoundResult) => void;
  'game:end': (result: GameResult) => void;
  'chat:message': (msg: ChatMessage) => void;
  'chat:bot': (msg: BotMessage) => void;
  'score:update': (scores: ScoreUpdate) => void;
  'error': (error: GameError) => void;
}
```

## Estratégia de Cache

| Recurso              | Estratégia         | TTL         | Onde          |
|----------------------|--------------------|-------------|---------------|
| Shell (HTML/CSS/JS)  | Cache-first        | Até novo SW | Service Worker|
| Soundfonts           | Cache-first        | 30 dias     | Service Worker|
| MIDI files (fase)    | Network-first      | Sessão      | Memory        |
| API: categorias      | Stale-while-reval  | 1 hora      | Next.js cache |
| API: daily sound     | Stale-while-reval  | Até meia-noite| Next.js cache|
| API: rankings        | No cache           | —           | —             |
| API: room state      | No cache (WS)     | —           | —             |

## Estratégia de Auth

1. **Login:** Client redireciona para Supabase OAuth → callback com tokens
2. **Session:** Access token + refresh token em cookies httpOnly (Supabase SSR)
3. **API calls REST:** Token enviado via header `Authorization: Bearer <token>`
4. **WebSocket:** Token enviado no handshake (`auth: { token }`)
5. **Validação:** Servidor valida token com Supabase em cada request/conexão
6. **Guest:** Sem token, identificado por socket ID + nickname temporário

## Estratégia de Deploy

### Ambientes
- **Development:** localhost (pnpm dev roda ambos apps)
- **Preview:** Auto-deploy de PRs no Vercel + branch deploy no Railway
- **Production:** Main branch → auto-deploy

### CI/CD (GitHub Actions)
```yaml
on push to main:
  1. Install dependencies (pnpm)
  2. Type check (tsc --noEmit)
  3. Lint (biome check)
  4. Build web (next build)
  5. Build server (tsc)
  6. Deploy web → Vercel
  7. Deploy server → Railway
```

### Environment Variables
```
# Shared
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server only, NEVER in client

# Frontend
NEXT_PUBLIC_SOCKET_URL=          # URL do server Socket.io
NEXT_PUBLIC_SITE_URL=            # URL do site (para OG images)

# Backend
DATABASE_URL=                    # Supabase PostgreSQL connection string
DAILY_SOUND_SEED=                # Secret seed para seleção determinística
CORS_ORIGIN=                     # URL do frontend
PORT=                            # Porta do server
```

## Segurança

- **RLS (Row Level Security):** Ativo em todas as tabelas do Supabase
- **Rate limiting:** Fastify rate-limit plugin (100 req/min por IP)
- **WebSocket auth:** Token validado no handshake, conexão rejeitada se inválido
- **Input sanitization:** Zod para validação de input em todos os endpoints
- **Respostas nunca no client:** Título/artista da música NUNCA enviados antes do fim da rodada
- **CORS:** Restrito ao domínio do frontend
- **Helmet:** Headers de segurança no Fastify
