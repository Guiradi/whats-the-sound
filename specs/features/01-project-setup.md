# Feature: Project Setup & Infrastructure

## Fase: 1 — MVP
## Prioridade: P0
## Estimativa: 4 horas
## Depende de: Nada (é a primeira task)

## Overview
Configuração inicial do monorepo com Next.js 15, Fastify, Socket.io, Supabase e todas as ferramentas de desenvolvimento. Inclui configuração de PWA, linting, TypeScript strict, e deploy pipeline básico.

## Requisitos Funcionais

### Monorepo Structure
- Monorepo com Turborepo: `apps/web` (Next.js) + `apps/server` (Fastify + Socket.io)
- Shared packages: `packages/shared` (types, constants, utils compartilhados entre front e back)

### Frontend (apps/web)
- Next.js 15 com App Router
- TypeScript strict mode
- Tailwind CSS v4 + Shadcn/UI
- Serwist para PWA (service worker, manifest, offline shell)
- Biome para linting e formatting
- Path aliases configurados (@/components, @/lib, @/hooks, etc)

### Backend (apps/server)
- Fastify com TypeScript
- Socket.io integrado ao Fastify
- CORS configurado para o domínio do frontend
- Health check endpoint (GET /health)
- Estrutura de pastas: routes/, services/, socket/, types/

### Infraestrutura
- Supabase project criado com:
  - Auth providers: Google + Discord habilitados
  - Storage bucket "midis" para arquivos MIDI
  - Database com schema inicial
- Variáveis de ambiente (.env.local / .env) para ambos apps
- Docker Compose para dev local (opcional, mas recomendado)

### PWA Manifest
```json
{
  "name": "What's the Sound?",
  "short_name": "WTS",
  "description": "Ouça. Adivinhe. Repita.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a1a",
  "theme_color": "#00f0ff",
  "icons": [...]
}
```

## Requisitos Não-Funcionais
- `pnpm build` deve completar sem erros em ambos apps
- `pnpm type-check` zero erros
- `pnpm lint` zero warnings
- Lighthouse PWA score ≥ 90
- Tempo de cold start do frontend < 2s em dev

## Componentes
- Nenhum componente visual nesta task — apenas setup

## Telas / Fluxos
- Página placeholder "/" com logo do WTS e texto "Em breve"

## Edge Cases
- Garantir que o Socket.io server funcione tanto em dev (localhost) quanto em prod (domínio separado)
- Service worker não deve cachear API calls, apenas assets estáticos
- Variáveis de ambiente do Supabase não devem ser expostas no client (usar NEXT_PUBLIC_ apenas para anon key e URL)

## Decisões de Design
- **Turborepo** ao invés de Nx: mais leve, menos configuração
- **Biome** ao invés de ESLint + Prettier: mais rápido, configuração unificada
- **Serwist** ao invés de next-pwa: mantido ativamente, melhor integração com App Router
- **pnpm** como package manager: workspaces nativos, mais rápido que npm/yarn

## Traduções necessárias
- Nenhuma nesta fase (i18n será implementado na Fase 4)
