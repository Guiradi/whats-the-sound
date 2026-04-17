# Database Schema — What's the Sound?

## Engine: PostgreSQL 15 (Supabase)

## Diagrama de Relacionamentos

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   users      │     │  game_sessions   │     │  midi_catalog    │
│──────────────│     │──────────────────│     │──────────────────│
│ id (PK)      │◄──┐ │ id (PK)          │  ┌─►│ id (PK)          │
│ nickname     │   │ │ room_code        │  │  │ title            │
│ avatar_url   │   │ │ host_id (FK)     │──┘  │ artist           │
│ total_games  │   │ │ category         │     │ category         │
│ total_wins   │   │ │ max_rounds       │     │ difficulty       │
│ total_correct│   │ │ time_per_phase   │     │ midi_file_url    │
│ daily_streak │   │ │ status           │     │ accepted_titles  │
│ max_streak   │   │ │ created_at       │     │ accepted_artists │
│ points_total │   │ │ ended_at         │     │ phases           │
│ created_at   │   │ └──────────────────┘     │ is_active        │
│ updated_at   │   │                          │ play_count       │
└──────────────┘   │ ┌──────────────────┐     │ correct_rate     │
                   │ │  game_players    │     │ created_at       │
                   │ │──────────────────│     │ updated_at       │
                   ├─┤ user_id (FK)     │     └──────────────────┘
                   │ │ session_id (FK)  │──┐
                   │ │ nickname         │  │  ┌──────────────────┐
                   │ │ final_score      │  │  │  round_scores    │
                   │ │ final_position   │  │  │──────────────────│
                   │ │ correct_count    │  ├─►│ session_id (FK)  │
                   │ │ is_guest         │  │  │ player_id (FK)   │
                   │ │ joined_at        │  │  │ midi_id (FK)     │──►midi_catalog
                   │ └──────────────────┘  │  │ round_number     │
                   │                       │  │ phase_guessed    │
                   │ ┌──────────────────┐  │  │ points_earned    │
                   │ │  daily_results   │  │  │ guess_position   │
                   │ │──────────────────│  │  │ created_at       │
                   └─┤ user_id (FK)     │  │  └──────────────────┘
                     │ midi_id (FK)     │──┘
                     │ date             │
                     │ phase_guessed    │
                     │ attempts         │
                     │ completed        │
                     │ created_at       │
                     └──────────────────┘
```

## Schema Completo (DDL)

### Enums

```sql
CREATE TYPE midi_category AS ENUM (
  'rock', 'pop', 'mpb', 'sertanejo', 'games',
  'anime', 'classical', 'electronic', 'hiphop'
);

CREATE TYPE midi_difficulty AS ENUM ('easy', 'medium', 'hard');

CREATE TYPE game_status AS ENUM (
  'waiting',      -- lobby, aguardando jogadores
  'playing',      -- jogo em andamento
  'finished'      -- jogo encerrado
);

CREATE TYPE user_role AS ENUM ('player', 'admin');

CREATE TYPE xp_source AS ENUM (
  'multiplayer_correct',
  'multiplayer_finish',
  'daily_correct',
  'daily_participation',
  'daily_streak_bonus'
);
```

### Tabela: users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT UNIQUE NOT NULL CHECK (
    length(nickname) BETWEEN 3 AND 20
    AND nickname ~ '^[a-zA-Z0-9_]+$'
  ),
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'player',
  total_games INTEGER NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  daily_streak INTEGER NOT NULL DEFAULT 0,
  max_daily_streak INTEGER NOT NULL DEFAULT 0,
  points_total BIGINT NOT NULL DEFAULT 0,
  xp BIGINT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_users_nickname ON users (nickname);
CREATE INDEX idx_users_points_total ON users (points_total DESC);
CREATE INDEX idx_users_daily_streak ON users (daily_streak DESC);
CREATE INDEX idx_users_xp ON users (xp DESC);
CREATE INDEX idx_users_level ON users (level DESC, xp DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-criar perfil no primeiro login
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, nickname, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      'player_' || substr(NEW.id::text, 1, 8)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles"
  ON users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users profile is created via trigger"
  ON users FOR INSERT WITH CHECK (auth.uid() = id);
```

### Tabela: midi_catalog

```sql
CREATE TABLE midi_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  category midi_category NOT NULL,
  difficulty midi_difficulty NOT NULL DEFAULT 'medium',
  year INTEGER CHECK (year >= 1900 AND year <= 2030),
  midi_file_url TEXT NOT NULL,
  accepted_titles TEXT[] NOT NULL DEFAULT '{}',
  accepted_artists TEXT[] NOT NULL DEFAULT '{}',
  phases JSONB NOT NULL,
  -- phases format:
  -- {
  --   "phase1": { "tracks": [0], "startBeat": 0, "endBeat": 4, "description": "..." },
  --   "phase2": { "tracks": [0], "startBeat": 0, "endBeat": 16, "description": "..." },
  --   "phase3": { "tracks": [0,1], "startBeat": 0, "endBeat": 32, "description": "..." },
  --   "phase4": { "tracks": [0,1,2,3], "startBeat": 0, "endBeat": 64, "description": "..." }
  -- }
  is_active BOOLEAN NOT NULL DEFAULT true,
  play_count INTEGER NOT NULL DEFAULT 0,
  correct_rate REAL NOT NULL DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_midi_category ON midi_catalog (category) WHERE is_active = true;
CREATE INDEX idx_midi_difficulty ON midi_catalog (difficulty) WHERE is_active = true;
CREATE INDEX idx_midi_active ON midi_catalog (is_active);

CREATE TRIGGER midi_catalog_updated_at
  BEFORE UPDATE ON midi_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE midi_catalog ENABLE ROW LEVEL SECURITY;

-- Jogadores podem ler catálogo (sem respostas — filtrado pela API)
CREATE POLICY "Anyone can read active midis"
  ON midi_catalog FOR SELECT USING (is_active = true);

-- Apenas admins podem inserir/atualizar
CREATE POLICY "Admins can manage catalog"
  ON midi_catalog FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

### Tabela: game_sessions

```sql
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL CHECK (length(room_code) = 5),
  host_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category midi_category,         -- NULL = aleatório/todas
  max_rounds INTEGER NOT NULL DEFAULT 10 CHECK (max_rounds IN (5, 10, 15)),
  time_per_phase INTEGER NOT NULL DEFAULT 20 CHECK (time_per_phase IN (15, 20, 30)),
  max_players INTEGER NOT NULL DEFAULT 12 CHECK (max_players BETWEEN 2 AND 20),
  is_public BOOLEAN NOT NULL DEFAULT true,
  status game_status NOT NULL DEFAULT 'waiting',
  current_round INTEGER NOT NULL DEFAULT 0,
  midi_playlist UUID[] NOT NULL DEFAULT '{}',  -- lista ordenada de midi IDs para a partida
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_sessions_room_code ON game_sessions (room_code);
CREATE INDEX idx_sessions_status ON game_sessions (status) WHERE status = 'waiting';
CREATE INDEX idx_sessions_public ON game_sessions (is_public, status) WHERE is_public = true AND status = 'waiting';

-- RLS
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sessions"
  ON game_sessions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create sessions"
  ON game_sessions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Host can update own session"
  ON game_sessions FOR UPDATE USING (host_id = auth.uid());
```

> **Decisão explícita sobre guest mode (clarificada pós-auditoria):** Guests **NÃO criam salas** — criar exige conta (Google/Discord OAuth; o "zero fricção" do overview se refere a entrar em salas, não a criá-las). Guests podem entrar em salas existentes via código/link — isso é permitido pela policy de `game_players` que faz INSERT livre. Se no futuro decidirmos permitir guests criarem salas, será necessário: (a) afrouxar a policy acima com rate-limit baseado em IP/socketId, (b) adicionar coluna `anonymous_host_token` para identificar o host guest, e (c) lidar com re-ingresso via cookie.

### Tabela: game_players

```sql
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL = guest
  nickname TEXT NOT NULL,
  final_score INTEGER NOT NULL DEFAULT 0,
  final_position INTEGER,
  correct_count INTEGER NOT NULL DEFAULT 0,
  is_guest BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(session_id, user_id)  -- um user por sessão (exceto guests)
);

-- Índices
CREATE INDEX idx_game_players_session ON game_players (session_id);
CREATE INDEX idx_game_players_user ON game_players (user_id) WHERE user_id IS NOT NULL;
-- Usado pela lógica de host migration: ordenar players conectados por ordem de entrada
CREATE INDEX idx_game_players_session_joined ON game_players (session_id, joined_at);

-- RLS
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read game players"
  ON game_players FOR SELECT USING (true);

CREATE POLICY "Players can join games"
  ON game_players FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update game players"
  ON game_players FOR UPDATE USING (true);
```

### Tabela: round_scores

```sql
CREATE TABLE round_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  midi_id UUID NOT NULL REFERENCES midi_catalog(id),
  round_number INTEGER NOT NULL,
  phase_guessed INTEGER CHECK (phase_guessed BETWEEN 1 AND 4),  -- NULL = não acertou
  points_earned INTEGER NOT NULL DEFAULT 0,
  guess_position INTEGER,  -- posição de acerto (1º, 2º, 3º...)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(session_id, player_id, round_number)
);

-- Índices
CREATE INDEX idx_round_scores_session ON round_scores (session_id, round_number);
CREATE INDEX idx_round_scores_player ON round_scores (player_id);
CREATE INDEX idx_round_scores_midi ON round_scores (midi_id);

-- RLS
ALTER TABLE round_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scores"
  ON round_scores FOR SELECT USING (true);

CREATE POLICY "System can insert scores"
  ON round_scores FOR INSERT WITH CHECK (true);
```

### Tabela: daily_results

```sql
CREATE TABLE daily_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  midi_id UUID NOT NULL REFERENCES midi_catalog(id),
  date DATE NOT NULL,
  phase_guessed INTEGER CHECK (phase_guessed BETWEEN 1 AND 4),  -- NULL = não acertou
  attempts JSONB NOT NULL DEFAULT '[]',
  -- attempts format: [
  --   { "phase": 1, "guess": "bohemian...", "result": "wrong" },
  --   { "phase": 2, "guess": "bohemian rhapsody", "result": "correct" }
  -- ]
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, date)  -- um resultado por dia por user
);

-- Índices
CREATE INDEX idx_daily_user_date ON daily_results (user_id, date DESC);
CREATE INDEX idx_daily_date ON daily_results (date);
-- Partial index para queries de histórico que só querem dias completos (calendário da /daily/history)
CREATE INDEX idx_daily_user_completed ON daily_results (user_id, date DESC) WHERE completed = true;

-- RLS
ALTER TABLE daily_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily results"
  ON daily_results FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily results"
  ON daily_results FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily results"
  ON daily_results FOR UPDATE USING (auth.uid() = user_id);
```

### Tabela: daily_schedule

```sql
CREATE TABLE daily_schedule (
  date DATE PRIMARY KEY,
  midi_id UUID NOT NULL REFERENCES midi_catalog(id),
  category midi_category,
  total_plays INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice
CREATE INDEX idx_daily_schedule_date ON daily_schedule (date DESC);

-- RLS
ALTER TABLE daily_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read daily schedule"
  ON daily_schedule FOR SELECT USING (true);

CREATE POLICY "Only admins can manage schedule"
  ON daily_schedule FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

### Tabela: xp_events

```sql
CREATE TABLE xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source xp_source NOT NULL,
  source_ref TEXT NOT NULL,         -- ex: round_score_id, daily_result_id, streak_<user>_<date>
  amount INTEGER NOT NULL,           -- XP creditado (0 se capped)
  capped BOOLEAN NOT NULL DEFAULT false,
  context JSONB,                     -- { phase, position, streak, ... }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(source, source_ref)         -- idempotência: reemitir o mesmo evento é no-op
);

-- Índices
CREATE INDEX idx_xp_events_user_date ON xp_events (user_id, created_at DESC);
CREATE INDEX idx_xp_events_source ON xp_events (source);

-- RLS
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own xp events"
  ON xp_events FOR SELECT USING (auth.uid() = user_id);
-- Service role bypassa RLS no backend para inserts via xp-service
```

Ver `specs/features/08-xp-system.md` para o cap diário (2000 XP/dia), fontes, curva de level e decisões.

## Functions & Triggers

### Atualizar stats do user após partida multiplayer

```sql
CREATE OR REPLACE FUNCTION update_user_stats_after_game()
RETURNS TRIGGER AS $$
BEGIN
  -- Só atualiza se o jogador NÃO é guest
  IF NEW.user_id IS NOT NULL AND NEW.final_position IS NOT NULL THEN
    UPDATE users SET
      total_games = total_games + 1,
      total_wins = total_wins + CASE WHEN NEW.final_position = 1 THEN 1 ELSE 0 END,
      total_correct = total_correct + NEW.correct_count,
      points_total = points_total + NEW.final_score
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_game_player_update
  AFTER UPDATE OF final_position ON game_players
  FOR EACH ROW
  WHEN (NEW.final_position IS NOT NULL AND OLD.final_position IS NULL)
  EXECUTE FUNCTION update_user_stats_after_game();
```

### Atualizar streak do Daily Sound

```sql
CREATE OR REPLACE FUNCTION update_daily_streak()
RETURNS TRIGGER AS $$
DECLARE
  yesterday_played BOOLEAN;
  current_streak INTEGER;
BEGIN
  -- Verifica se jogou ontem
  SELECT EXISTS (
    SELECT 1 FROM daily_results
    WHERE user_id = NEW.user_id
    AND date = NEW.date - INTERVAL '1 day'
  ) INTO yesterday_played;

  IF yesterday_played THEN
    -- Incrementa streak
    UPDATE users SET
      daily_streak = daily_streak + 1,
      max_daily_streak = GREATEST(max_daily_streak, daily_streak + 1)
    WHERE id = NEW.user_id;
  ELSE
    -- Reseta streak para 1
    UPDATE users SET
      daily_streak = 1,
      max_daily_streak = GREATEST(max_daily_streak, 1)
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_daily_result_insert
  AFTER INSERT ON daily_results
  FOR EACH ROW EXECUTE FUNCTION update_daily_streak();
```

### Sync de users.level com users.xp (feature 08)

```sql
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

Fórmula mantida em sincronia com `XP_LEVEL_FORMULA` em `@wts/shared/constants` — se mudar, ajustar os dois juntos.

### Atualizar play_count e correct_rate do midi

```sql
CREATE OR REPLACE FUNCTION update_midi_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE midi_catalog SET
    play_count = play_count + 1,
    correct_rate = (
      SELECT COALESCE(
        AVG(CASE WHEN phase_guessed IS NOT NULL THEN 1.0 ELSE 0.0 END),
        0
      )
      FROM round_scores WHERE midi_id = NEW.midi_id
    )
  WHERE id = NEW.midi_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_round_score_insert
  AFTER INSERT ON round_scores
  FOR EACH ROW EXECUTE FUNCTION update_midi_stats();
```

## Migration Strategy

- Migrations gerenciadas via Supabase CLI (`supabase migration new`, `supabase db push`)
- Cada migration é um arquivo SQL incrementado em `supabase/migrations/`
- Nomenclatura: `YYYYMMDDHHMMSS_description.sql`
- Regras:
  - Toda migration DEVE ser reversível (incluir DOWN quando possível)
  - Toda nova tabela DEVE ter RLS habilitado
  - Toda FK DEVE ter ON DELETE definido
  - Nunca alterar migrations já aplicadas em produção

## Storage Buckets

```sql
-- Bucket para arquivos MIDI
INSERT INTO storage.buckets (id, name, public)
VALUES ('midis', 'midis', true);

-- Política: qualquer um pode ler MIDIs
CREATE POLICY "Public MIDI access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'midis');

-- Apenas admins podem fazer upload
CREATE POLICY "Admin MIDI upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'midis'
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```
