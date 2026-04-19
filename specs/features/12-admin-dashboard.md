# Feature: Admin Dashboard & Category Management

## Fase: 1 — MVP
## Prioridade: P2
## Estimativa: ~6h (backend 2.5h + frontend 3.5h)
## Depende de: 03-auth, 06-midi-catalog

## Overview

Painel `/admin/*` acessível apenas para `users.role = 'admin'`. Cobre três frentes no MVP:
1. Visão geral do sistema (usuários, partidas, daily, catálogo).
2. Gestão do catálogo MIDI (upload, edição de metadata, enable/disable por item).
3. Gestão de categorias (desabilitar categorias inteiras para criação de sala sem apagar dados).

## Schema

- Tabela `admin_config` — KV store genérico:
  - `key TEXT PRIMARY KEY`
  - `value JSONB NOT NULL`
  - `updated_at TIMESTAMPTZ`
  - RLS: `SELECT` público apenas para `key = 'disabled_categories'`; `UPDATE`/`INSERT` somente `role = 'admin'`.
- Nenhuma alteração em `midi_catalog` ou `users` além do que já existe.

## Endpoints

Base: `apps/server/src/routes/admin.ts` e `apps/server/src/routes/catalog.ts`.

| Método | Path | Auth | Descrição |
|---|---|---|---|
| GET | `/api/admin/disabled-categories` | público | Lista de categorias desabilitadas (consumido pelo formulário de criação de sala). |
| GET | `/api/admin/stats` | admin | Contadores paralelos: users (por role + is_guest), game_sessions (por status), daily_results, catálogo (ativo/difficulty/categoria). |
| POST | `/api/admin/disabled-categories/enable` | admin | Body `{ category }`. Remove de `disabled_categories`. |
| POST | `/api/admin/disabled-categories/disable` | admin | Body `{ category }`. Adiciona a `disabled_categories`. |
| CRUD | `/api/admin/catalog/*` | admin | Upload MIDI + edit metadata + toggle `is_active` por item. |

Guard: `requireAdminRole(supabase, userId)` lê `users.role`. Se falha, retorna **404** (não 403) para não vazar existência da rota.

**Identidade do admin:** extraída do access token Supabase via middleware de auth (não confiar em headers controláveis pelo client). Ver `specs/features/03-auth.md` para o middleware.

## Frontend

- Route group `apps/web/src/app/(admin)/admin/*` com guard server-side baseado em `users.role`.
- Dashboard (`/admin`) com métricas em cards + link para seções.
- `/admin/catalog` — tabela paginada com filtros de categoria/dificuldade, ações por linha.
- `/admin/categories` — toggle por categoria com modal de confirmação. Ações refletem imediatamente na validação do formulário de criação de sala (via GET público).
- `/admin/docs` — Dev Docs Portal (feature 09).

## i18n

Namespace `admin.{dashboard,catalog,categories,common}` paralelo em pt-BR/en.

## Verificação manual

1. Acessar `/admin` como não-admin: redirect/404.
2. Login com conta `role=admin`: dashboard carrega métricas.
3. Desabilitar categoria: criar nova sala — categoria some das opções. Reabilitar: volta.
4. Toggle de `is_active` em item do catálogo: MIDI desaparece do seletor de sala.
5. `/admin/docs`: renderiza MDX (ver feature 09).
