# Feature: XP & Level System

## Fase: 1 — MVP
## Prioridade: P1
## Estimativa: ~6h (backend 3.5h + frontend 2.5h)
## Depende de: 03-auth, 04-multiplayer-rooms, 05-daily-sound

## Overview

Sistema de progressão para usuários **logados**. Jogar, ganhar e manter streak acumula XP; XP define nível numérico exibido como badge junto ao nickname (ex: `[Lv.12] Guilherme`). Nível é puramente **visual no MVP** — sem cosmetics, títulos desbloqueáveis ou efeitos gameplay. É motivação de longo prazo e diferenciador entre conta logada vs guest.

**Princípio central:** guests **podem jogar tudo** (zero fricção permanece intacto), mas nunca ganham XP. A UI mostra um CTA discreto "Crie uma conta para ganhar XP" durante partidas de guest.

## Requisitos Funcionais

### Fontes de XP

XP é emitido pelo backend em cada evento-fonte. Todo ganho é persistido em `xp_events` para audit e replay.

| Fonte | Quando | Valor |
|---|---|---|
| `multiplayer_correct` | Jogador acerta em uma rodada MP (qualquer fase) | `floor(roundPoints / 10)` (ex: 1000 pts = +100 XP) |
| `multiplayer_finish` | Partida MP encerra (`GAME_END`) e jogador estava conectado ao final | +50 base + pódio: 1º=+100, 2º=+50, 3º=+25 |
| `multiplayer_round_played` | Rodada MP termina e jogador estava conectado | +5 (recompensa participação) |
| `daily_correct` | Jogador acerta o Daily Sound | Fase 1=+150, Fase 2=+100, Fase 3=+75, Fase 4=+50 |
| `daily_participation` | Jogador submete Daily sem acertar | +15 |
| `daily_streak_bonus` | `daily_streak` de `users` cruza um incremento ≥ 2 | `+10 × min(newStreak, 30)` (cap em +300) |
| `daily_login` | Primeiro `touch-login` do dia (BRT) | +25 |
| `login_streak_bonus` | Login streak ≥ 2 dias consecutivos | `+5 × min(newStreak, 7)` (cap em +35) |
| `first_match_of_day` | Primeira partida concluída do dia (MP ou Daily) | +30 |
| `referral_bonus` | Amigo convidado completa sua primeira partida | +100 (ao referrer) |

Todos os valores são **constantes em `@wts/shared/constants`** para fácil rebalanceamento sem code change por arquivo.

### Regras

- **Guests NUNCA ganham XP.** Rounds e daily submissions de guest são ignoradas pelo XP service. Guard via prefix `guest:` no `userId`.
- **Idempotência:** cada evento tem `source_ref` único (ex: `mp_correct_<gameSession>_<round>_<player>`, `login_<dateISO>_<userId>`, `referral_<invitedUserId>`). Reinserir o mesmo `source_ref` é no-op (UNIQUE constraint).
- **Sem cap artificial:** a curva quadrática de level já faz o pacing — cada nível exige esforço crescente. Existe apenas um **cap de segurança anti-bot de 50.000 XP/dia** (`XP_DAILY_SAFETY_CAP`) para conter scripts automatizados; jogadores humanos reais nunca chegam perto.
- **Retroatividade:** XP só começa a contar a partir do deploy do sistema — não há backfill de partidas antigas.

### Login streak

`users.last_login_date` + `users.login_streak` + `users.max_login_streak` (migration `20260419120000_login_tracking.sql`).

Fluxo: frontend chama `POST /api/me/touch-login` 1× por sessão/dia (idempotência por `sessionStorage`). Server calcula:

- `last_login_date === hoje` → no-op.
- `last_login_date === hoje - 1` → `streak += 1`.
- Qualquer outro caso → `streak = 1`.

`max_login_streak` acompanha o pico. XP de `daily_login` sempre dispara; `login_streak_bonus` só quando `streak >= 2`.

### Referral

`users.referral_code` (6 chars, único, auto-gerado no trigger `handle_new_user`), `users.referred_by_user_id`, `users.referred_at`, `users.referral_completed_at` (migration `20260419120001_referrals.sql`).

Fluxo:
1. **Captura:** `ReferralCapture` no layout salva `?ref=XXX` em `localStorage` (TTL 30 dias).
2. **Aplicação:** quando user autentica, `POST /api/me/apply-referral { code }` grava `referred_by_user_id`. Idempotente — só sucede se a coluna ainda está `NULL` e `code != self.referral_code`.
3. **Recompensa:** quando o convidado completa sua primeira partida (MP ou Daily), `referral-service.maybeRewardReferrer()` marca `referral_completed_at` e dispara `awardXp('referral_bonus', referral_<invitedUserId>, +100)` para o referrer.

### Curva de Nível

Fórmula: `level = floor(sqrt(xp / 100)) + 1`

| Level | XP mínimo |
|---|---|
| 1 | 0 |
| 2 | 100 |
| 3 | 400 |
| 5 | 1.600 |
| 10 | 8.100 |
| 20 | 36.100 |
| 50 | 240.100 |
| 100 | 980.100 |

**Nota técnica:** `users.level` é redundante (derivável de `xp`), mas materializamos a coluna porque: (1) ranking ordena por level frequentemente e um `ORDER BY level DESC, xp DESC` é mais rápido que calcular sqrt em toda query; (2) trigger mantém em sync, zero risco de drift.

### Badge Visual

Formato: `[Lv.12]` como **prefixo** do nickname no chat, na PlayerList do jogo e no pódio final.

Cores do badge por faixa:

| Faixa | Estilo | Cor |
|---|---|---|
| 1-9 | Texto muted | `text-text-muted` (#8a8ab0) |
| 10-24 | Texto sólido | `text-accent-cyan` |
| 25-49 | Texto sólido | `text-accent-magenta` |
| 50+ | Gradiente | `bg-gradient-to-r from-yellow-400 to-accent-magenta bg-clip-text` |

**Exibição:**
- Chat: prefixo antes do nickname: `[Lv.12] Guilherme: bohemian rhapsody`
- PlayerList: linha própria abaixo do nickname, compacta
- Pódio/Result: badge grande ao lado do avatar
- Input de chat do próprio jogador: **NÃO** mostra badge (reduz ruído)

### Guest UX

Durante qualquer partida (MP ou Daily) jogada como guest:
- Badge aparece como `[Guest]` em vez de `[Lv.X]` (cinza muted)
- No final da partida, banner discreto: `"Você teria ganho +240 XP 🔒 Crie uma conta para acumular"`
- Link "Criar conta" leva para `/login` preservando contexto de retorno

### Level-up

Quando um evento XP faz o user cruzar um threshold de nível:
1. Backend emite evento `xp:level_up` (via Socket.io se em sala) com `{ previousLevel, newLevel, xpGained }`
2. Cliente mostra toast/modal animado: "🎉 Lv.13!"
3. Se em jogo MP, badge do jogador atualiza em tempo real para todos da sala

## Requisitos Não-Funcionais

- Processamento XP **não bloqueia** o fluxo de jogo: é dispatched async (setImmediate / worker queue) após a escrita do `round_scores`. Se o XP service falhar, partida não é impactada.
- Zero XP duplicado sob race conditions — garantido por UNIQUE constraint + idempotência do service.
- Ranking por XP consultável em `< 100ms` para top 100 (índice já coberto por `idx_users_points_total`, adicionar `idx_users_xp`).

## Data Model (já nasce em TASK-002)

```sql
-- Adicionar a users (TASK-002):
ALTER TABLE users
  ADD COLUMN xp BIGINT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  ADD COLUMN level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1);

CREATE INDEX idx_users_xp ON users (xp DESC);
CREATE INDEX idx_users_level ON users (level DESC, xp DESC);

-- Tabela de audit de XP
CREATE TYPE xp_source AS ENUM (
  'multiplayer_correct',
  'multiplayer_finish',
  'daily_correct',
  'daily_participation',
  'daily_streak_bonus'
);

CREATE TABLE xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source xp_source NOT NULL,
  source_ref TEXT NOT NULL,        -- ex: round_score_id, daily_result_id, streak_day
  amount INTEGER NOT NULL,          -- pode ser 0 se capped
  capped BOOLEAN NOT NULL DEFAULT false,
  context JSONB,                    -- { phase, position, streak, ... }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source, source_ref)        -- idempotência
);

CREATE INDEX idx_xp_events_user_date ON xp_events (user_id, created_at DESC);

ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own xp events"
  ON xp_events FOR SELECT USING (auth.uid() = user_id);
-- Admins podem inserir (service role bypassa RLS no backend).

-- Trigger que mantém users.level em sync com users.xp
CREATE OR REPLACE FUNCTION sync_user_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level = floor(sqrt(NEW.xp::numeric / 100))::int + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_level_on_xp_change
  BEFORE UPDATE OF xp ON users
  FOR EACH ROW WHEN (OLD.xp IS DISTINCT FROM NEW.xp)
  EXECUTE FUNCTION sync_user_level();

CREATE TRIGGER users_level_on_insert
  BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION sync_user_level();
```

## Componentes

### Backend (`apps/server/src/services/xp-service.ts`)
- `awardXp(userId, source, sourceRef, amount, context)` — função pura: valida guest guard, aplica cap diário, persiste `xp_events`, incrementa `users.xp`, retorna `{ previousLevel, newLevel, capped }`
- Hooks de integração (chamados pelos services existentes):
  - `scoring-service` → `awardXp(playerId, 'multiplayer_correct', roundScoreId, pts/10, {phase})` após insert em `round_scores`
  - `game-loop` → `awardXp` para cada player ao emitir `GAME_END`
  - `daily-service` → `awardXp` após insert em `daily_results`; separado para streak bonus quando `daily_streak` trigger incrementa

### Frontend
- `<LevelBadge level={number} />` — componente stateless, decide cor por faixa, exibe `[Lv.X]` ou `[Guest]`
- `<LevelUpModal />` — overlay animado ao receber `xp:level_up` via socket ou no `/daily` result screen
- Extend `PlayerList` e `Podium` existentes (TASK-013/014) para consumir `level` de `RoomStateSnapshot.players[]` (adicionar campo no type)
- Extend `/profile` (TASK-008) para exibir XP total, level atual, progresso para próximo level (barra), e histórico das últimas 10 `xp_events`

## Edge Cases

- **Usuário converte guest → logged in mid-session:** XP só vale dali para frente. Partidas parciais de guest não migram.
- **Host migration mid-round:** XP calculado por jogador, não por host. Transferência não afeta.
- **Reconexão após `GAME_END`:** se o player desconectou antes do finish mas estava na sala quando acertou algo, `multiplayer_correct` já foi emitido. `multiplayer_finish` **não** é emitido para quem não estava conectado ao final.
- **Cap diário atingido mid-partida:** player continua jogando normalmente, `xp_events` registra com `capped=true`, UI de final mostra "Você ganhou XXX XP (cap diário atingido)".
- **Daily jogado em retroativo (não permitido no MVP):** se no futuro abrirmos, adicionar flag `is_backfill` em `xp_events` e decidir se dá XP.

## Decisões de Design

- **Level ≠ pontos totais:** `users.points_total` continua existindo para ranking de partidas (pontos da rodada Gartic-style), enquanto `xp` é progressão long-term. São eixos diferentes — um jogador casual pode ter points_total alto em pouco tempo, mas level alto exige consistência.
- **Cap diário obrigatório:** sem cap, uma sessão maratona viraria "farming" que distorce ranking. 2000 XP/dia ≈ 2-3 partidas boas + 1 daily acertado + streak. Suficiente para progredir, insuficiente para burlar.
- **XP só para logados:** é o principal incentivo para conta. Diluir com "XP anônimo por dispositivo" enfraquece a conversão para login.
- **Level visual sem cosmetics no MVP:** reduz escopo massivamente. Cosmetics (avatar frames, titles) ficam para Fase 3 (monetização), onde level vira requisito de unlock. MVP provando que a mecânica engaja é pré-requisito.
- **Fórmula quadrática:** cresce lentamente no início (motivador rápido), satura no meio (desafio), requer muito XP no topo (prestígio). Curva clássica de jogos.
