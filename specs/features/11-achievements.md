# Feature: Achievements System

## Fase: 1 — MVP
## Prioridade: P2
## Estimativa: ~8h (backend 4h + frontend 4h)
## Depende de: 08-xp-system, 04-multiplayer-rooms, 05-daily-sound

## Overview

Sistema de conquistas com 8 badges MVP. Desbloqueio dispara modal animado, grava em `user_achievements`, emite XP bonus via pipeline existente e aparece no `/profile`. Catálogo é estático em `packages/shared/src/achievements/catalog.ts` — três tiers visuais (bronze/silver/gold) e um ícone Lucide cada.

## Catálogo MVP

| ID | Trigger | Tier | XP |
|---|---|---|---|
| `first_login` | Primeiro login registrado via `touch-login` | bronze | +50 |
| `login_streak_7` | `login_streak` atinge 7 | silver | +150 |
| `first_daily` | Primeira Daily concluída | bronze | +50 |
| `daily_streak_7` | `daily_streak` atinge 7 | silver | +200 |
| `daily_phase_1` | Acertar Daily na fase 1 | gold | +100 |
| `mp_first_win` | Primeira vitória MP (1º lugar em GAME_END) | silver | +150 |
| `invite_first` | Um convidado completa sua primeira partida | silver | +100 |
| `invite_5` | Cinco convidados completaram a primeira partida | gold | +300 |

## Schema

- Migration `20260420120000_achievements.sql`.
- Tabela `user_achievements`: `(user_id, achievement_id)` com `UNIQUE`, `unlocked_at TIMESTAMPTZ`, RLS "select/insert só own".
- Valor `'achievement_unlocked'` adicionado ao enum `xp_source`.

## Backend

- `apps/server/src/services/achievement-service.ts`
  - `checkAchievements(userId, trigger, ctx)` invocado fire-and-forget (`setImmediate`) de:
    - `login-service.touchLogin` (trigger `login`, ctx `{ streak }`)
    - `daily-service.submitGuess` no `justCompleted` (trigger `daily`, ctx `{ phase, isCorrect, date }`)
    - `game-loop.endGame` (trigger `mp`, ctx `{ winnerId, roomCode }`)
    - `referral-service.maybeRewardReferrer` (trigger `referral`, ctx `{ referrerId }`)
  - INSERT com `ON CONFLICT DO NOTHING` na tabela; se inserção sucede, enfileira `xpService.awardXp({ source: 'achievement_unlocked', sourceRef: ach_<userId>_<id> })` e emite `achievement:unlocked` no socket `user:${userId}`.
- `apps/server/src/services/achievement-checks.ts` — 8 funções de verificação puras, uma por badge, com queries Supabase otimizadas.
- `GET /api/me/achievements` → retorna `{ catalog, unlocked }`.

## Frontend

- `apps/web/src/hooks/use-achievement-unlock.ts` — fila local (múltiplos unlocks seguidos viram modais enfileirados).
- `apps/web/src/hooks/use-achievement-notifications.ts` — listener socket `achievement:unlocked`.
- `apps/web/src/components/achievements/achievement-unlock-modal.tsx` — modal auto-dismiss 5s, respeita `prefers-reduced-motion`.
- `apps/web/src/components/achievements/achievement-badge.tsx` — cores por tier, glow em gold.
- `apps/web/src/components/achievements/achievements-card.tsx` — card no `/profile` listando catálogo com estado locked/unlocked.
- `XpNotificationBridge` reutilizado: passa a montar ambos (toast de XP + unlock modal).

## i18n

`achievements.unlock.title`, `achievements.unlock.cta`, `achievements.card.*`, `achievements.tiers.{bronze,silver,gold}`, `achievements.catalog.{id}.{title,description}`. Paralelismo obrigatório entre `pt-BR.json` e `en.json`.

## Verificação manual

1. Primeiro login: modal `first_login` aparece após touch-login inicial e soma +50 XP.
2. Completar primeira daily corretamente: dois modais em sequência (`first_daily` → `daily_phase_1` se fase 1).
3. Abrir `/profile`: card lista 8 badges com status correto.
4. Reconnect sem desbloquear nenhum novo: nenhum modal reaparece (idempotência via UNIQUE).
