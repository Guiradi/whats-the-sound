# Backlog — What's the Sound?

> Single source of truth para todo trabalho pendente.
> Formato: `[status] TASK-XXX: Título (estimativa) — spec de referência`
> Status: `[ ]` pendente, `[→]` em progresso, `[✓]` completo, `[⏸]` pausado

---

## Sprint 1 — Fundação

---

## Sprint 2 — MIDI Engine + Auth

---

## Sprint 3 — Multiplayer Core

### [✓] TASK-009: Socket.io Server + Room Management (4h) — specs/features/04-multiplayer-rooms.md
    → Socket.io Setup:
      • Integrar Socket.io ao Fastify server
      • Configurar CORS para frontend
      • Auth middleware: validar token Supabase no handshake (ou aceitar guest)
    → Room Manager Service:
      • createRoom(config) → gera código 5 chars, cria room no Socket.io + DB
      • joinRoom(code, player) → adiciona jogador à room
      • leaveRoom(socketId) → remove jogador, transfere host se necessário
      • getRoomState(code) → retorna estado completo da room
      • listPublicRooms() → retorna rooms públicas aguardando
    → Room State (in-memory):
      • Map<roomCode, RoomState> com:
        - config (categoria, rodadas, tempo, etc)
        - players (lista com score, status)
        - gameState (fase atual, rodada, timer)
        - midiPlaylist (lista de MIDI IDs)
    → Eventos implementados:
      • room:create → cria sala, retorna código
      • room:join → adiciona jogador, broadcast para sala
      • room:leave → remove jogador, broadcast
      • room:state → sync completo (para reconexão)
    → Cleanup:
      • Auto-destruir rooms vazias após 5 min
      • Desconexão: marcar player como offline, remover após 30s sem reconexão
    → Validação:
      • Criar sala retorna código de 5 chars
      • 2 clients conseguem entrar na mesma sala
      • Estado sincronizado entre clients
      • Room auto-destrói quando vazia

### [✓] TASK-010: Game Loop Engine (6h) — specs/features/04-multiplayer-rooms.md
    → State Machine:
      • Implementar FSM: LOBBY → ROUND_START → PHASE_1 → PHASE_2 → PHASE_3 → PHASE_4 → ROUND_END → GAME_END
      • Transições automáticas por timer
      • Transição antecipada se todos acertaram
    → Round Management:
      • startGame(roomCode) — seleciona MIDIs (sem repetição), inicia primeira rodada
      • startRound(roomCode) — countdown 3s, seleciona MIDI, emite round_start
      • startPhase(roomCode, phase) — emite phase_start com audio data, inicia timer
      • endRound(roomCode) — revela resposta, calcula scores, emite round_end
      • endGame(roomCode) — calcula ranking final, emite game_end, salva no DB
    → Scoring Engine:
      • calculateScore(phase, guessPosition) → pontuação conforme tabela de decay
      • Phase 1: 1000 base, -100 por posição, piso 300
      • Phase 2: 750 base, -75 por posição, piso 225
      • Phase 3: 500 base, -50 por posição, piso 150
      • Phase 4: 250 base, -25 por posição, piso 100
      • Empate (< 50ms): mesma pontuação
    → Timer:
      • Server-side timer com precisão de 100ms
      • Broadcast de timer tick a cada 1s para sync visual
      • Auto-advance quando timer chega a 0
    → Validação:
      • Jogo completo de 5 rodadas funciona do início ao fim
      • Pontuação calculada corretamente (1º > 2º > 3º)
      • Timer avança fases automaticamente
      • GAME_END mostra ranking correto

### [✓] TASK-011: Guess Verification System (3h) — specs/features/04-multiplayer-rooms.md
    → Serviço GuessVerifier:
      • normalize(text) → lowercase, remove acentos, remove artigos
      • levenshteinDistance(a, b) → distância de edição
      • verify(guess, midi) → retorna: 'correct' | 'hot' | 'warm' | 'artist_match' | 'wrong'
      • Thresholds: ≤1 correct, 2-3 hot, 4-5 warm, artist match check separado
    → Integração com Game Loop:
      • Receber game:guess event
      • Normalizar palpite
      • Verificar contra accepted_titles e accepted_artists
      • Se correct: calcular pontuação, broadcast player_correct
      • Se hot/warm/artist_match: broadcast bot message de feedback
      • Se wrong: broadcast mensagem normal no chat
      • Rate limit: 1 palpite/segundo por jogador
    → Anti-cheat:
      • Respostas nunca enviadas ao client antes do round_end
      • Timestamp de acerto = timestamp do server (não do client)
      • Log de palpites para análise posterior
    → Validação:
      • "bohemian rhapsody" aceita variações (rapsody, Bohemian Rhapsody)
      • Acertar artista mas não música → feedback específico
      • Rate limit funciona (rejeita palpites muito rápidos)
      • Levenshtein funciona corretamente com acentos

---

## Sprint 4 — Frontend do Multiplayer

_(todas as tasks concluídas — ver `tasks/completed.md`)_

---

## Sprint 5 — Daily Sound + Polish

_(todas as tasks concluídas — ver `tasks/completed.md`)_

---

## Sprint 5 (adicionais pós-auditoria)

### [✓] TASK-015: Daily Sound — Backend (3h) — specs/features/05-daily-sound.md
    → Daily Selection:
      • Função selectDailyMidi(date, seed) → determinístico, sem repetição em 100 dias
      • Cron job (ou Supabase Edge Function) à meia-noite BRT:
        - Seleciona MIDI do dia
        - Insere em daily_schedule
        - Categoria baseada no dia da semana
    → API:
      • GET /api/daily — retorna { id, date, category, phase1AudioData }
      • POST /api/daily/guess — verifica palpite { midiId, guess, phase } → resultado
      • GET /api/daily/result — retorna resultado do dia (se já jogou)
      • GET /api/daily/history — calendário de resultados passados (user logado)
    → Streak Logic:
      • Calculado via trigger no DB (já criado na TASK-002)
      • Endpoint retorna streak atual e max no resultado
    → Validação:
      • Mesma música para todos os jogadores no mesmo dia
      • Não permite jogar o mesmo dia duas vezes
      • Streak incrementa corretamente
      • Resultado correto após acertar/errar

### [✓] TASK-016: Daily Sound — Frontend (4h) — specs/features/05-daily-sound.md
    → Página /daily:
      • Estado "não jogou": botão "Começar" + info do dia + categoria
      • Estado "jogando": AudioVisualizer + fase atual + input + tentativas anteriores
      • Estado "completou": DailyResult card + share + countdown próximo daily
    → Componentes:
      • DailyChallenge — container principal do gameplay solo
      • DailyResult — card de resultado com grid de fases
      • ShareButton — gera texto emoji e copia/compartilha
      • DailyCountdown — timer até próximo daily (HH:MM:SS)
      • PhaseAttempts — lista de tentativas da sessão com resultado
    → Daily Result Card (texto compartilhável):
      ```
      🔊 What's the Sound? #47
      🎵 Acertei na Fase 2!
      🟩❌ 🟩✅ ⬜— ⬜—
      🔥 Streak: 12 dias
      whatsthesound.io/daily
      ```
    → Validação:
      • Fluxo completo funciona: ouvir → palpitar → acertar/errar → resultado
      • Replay funciona em cada fase
      • Resultado persiste (voltar à página mostra resultado)
      • Share gera texto correto

### [✓] TASK-017: Daily Sound — Histórico + Calendário (2h) — specs/features/05-daily-sound.md
    → Página /daily/history (logados):
      • Calendário de contribuições (estilo GitHub)
      • Cores: verde (acertou), vermelho (errou), cinza (não jogou)
      • Click em dia → modal com: música, artista, fase acertada
      • Stats: total jogado, % acerto, streak atual, max streak
    → Componentes:
      • DailyCalendar — grid de contribuições
      • DayDetailModal — info de um dia específico
      • DailyStats — grid de stats resumidas
    → Validação:
      • Calendário renderiza corretamente (últimos 90 dias)
      • Cores corretas por dia
      • Modal mostra info do dia passado
      • Guest vê mensagem de "crie uma conta"

### [✓] TASK-018: MIDI Catalog Seed (100 músicas) (4h) — specs/features/06-midi-catalog.md
    → Seed Script:
      • Arquivo JSON com metadata das 100 músicas (title, artist, category, difficulty, phases)
      • Script pnpm seed:midis que:
        1. Lê JSON
        2. Faz upload dos .mid files para Supabase Storage
        3. Insere registros na tabela midi_catalog
        4. Gera accepted_titles e accepted_artists básicos
    → Distribuição:
      • Rock: 15, Pop: 15, MPB: 10, Sertanejo: 10
      • Games: 15, Anime: 10, Classical: 5
      • Electronic: 10, Hip-Hop: 10
    → Phase Config por música:
      • Cada música precisa de config manual das 4 fases
      • Template de preenchimento para facilitar
    → Validação:
      • 100 músicas no banco com todas as fases configuradas
      • Todas reproduzem corretamente nas 4 fases
      • Categorias com contagem correta
      • accepted_titles inclui variações comuns

### [✓] TASK-019: OG Images dinâmicas (2h) — specs/features/07-pwa-sharing.md
    → Next.js OG Image (Vercel OG):
      • /api/og/daily/[number] — OG image para Daily Sound #N
        - Visual: logo WTS + "Daily Sound #47" + resultado (se disponível) + fundo synthwave
      • /api/og/room/[code] — OG image para convite de sala
        - Visual: logo WTS + "Sala [CODE]" + categoria + "Junte-se!"
    → Meta Tags dinâmicas:
      • /daily → og:image aponta para /api/og/daily/[number]
      • /room/[code] → og:image aponta para /api/og/room/[code]
    → Validação:
      • OG image renderiza corretamente (testar com Twitter Card Validator)
      • Tamanho: 1200x630px
      • Gera em < 500ms

### [✓] TASK-020: Landing Page + Home (3h) — specs/features/07-pwa-sharing.md
    → Página / (Home):
      • Hero: logo WTS + tagline "Ouça. Adivinhe. Repita." + CTA "Jogar Agora"
      • Duas seções: "Daily Sound" (CTA) + "Multiplayer" (CTA)
      • Como funciona (3 passos visuais): 1. Ouça o MIDI → 2. Adivinhe a música → 3. Compita com amigos
      • Footer: links, créditos, versão
    → SEO:
      • Schema.org markup (WebApplication + Game)
      • sitemap.xml + robots.txt
      • Meta tags otimizadas
    → Validação:
      • Lighthouse Performance ≥ 80
      • Lighthouse SEO ≥ 90
      • CTAs levam para /daily e /rooms
      • Responsivo (mobile + desktop)

---

## Sprint 6 — Admin + QA + Deploy

### [ ] TASK-021: Admin Panel — Catálogo MIDI (4h) — specs/features/06-midi-catalog.md
    → Página /admin/catalog (protegida por role admin):
      • Tabela de músicas: título, artista, categoria, dificuldade, play_count, correct_rate
      • Filtros: categoria, dificuldade, search por título/artista
      • Ações: editar, desativar, preview
    → Página /admin/catalog/new:
      • Form multi-step:
        1. Upload .mid file
        2. Metadata: título, artista, categoria, dificuldade, ano
        3. Phase Configurator: selecionar tracks + range de beats por fase + preview
        4. Accepted answers: título e artista variations
        5. Review + Save
    → Componentes:
      • MidiCatalogTable — tabela com sort e filtros
      • MidiUploadForm — form multi-step
      • PhaseConfigurator — interface visual com player de preview
    → Proteção:
      • Middleware que verifica role = 'admin'
      • 404 para não-admins
    → Validação:
      • Upload funciona e arquivo vai para Supabase Storage
      • Fases configuráveis e preview funciona
      • Tabela lista todas as músicas com filtros
      • Apenas admins acessam

### [ ] TASK-022: QA Pass + Bug Fixes (4h)
    → Testes manuais:
      • Fluxo completo multiplayer: criar sala → jogar 5 rodadas → resultado
      • Fluxo completo Daily Sound: jogar → resultado → compartilhar
      • Auth: login Google, login Discord, guest mode, logout
      • PWA: instalar, offline shell, push registration
      • Mobile: testar em Chrome Android, Safari iOS
      • Desktop: Chrome, Firefox, Safari, Edge
    → Performance:
      • Lighthouse audit (Performance, PWA, SEO, A11y)
      • Verificar latência WebSocket < 200ms
      • Verificar audio playback latency < 100ms
    → Fixes:
      • Resolver bugs encontrados nos testes
      • Ajustar responsividade se necessário
      • Otimizar assets (imagens, fonts)

### [ ] TASK-023: Deploy Production (3h) — specs/technical/architecture.md
    → Frontend (Vercel):
      • Conectar repo GitHub → auto-deploy da branch main
      • Configurar variáveis de ambiente (production)
      • Configurar domínio customizado (whatsthesound.io ou similar)
      • Verificar build e preview deploy
    → Backend (Railway):
      • Criar projeto Railway
      • Configurar variáveis de ambiente
      • Deploy do apps/server
      • Verificar WebSocket funciona no domínio Railway
    → DNS & SSL:
      • Configurar DNS para domínio
      • SSL automático via Vercel/Railway
    → CI/CD (GitHub Actions):
      • Workflow: push to main → type-check → lint → build → deploy
      • Notificação de falha
    → Validação:
      • Site acessível no domínio final
      • WebSocket conecta do frontend para backend
      • Auth OAuth callbacks funcionam com URLs de produção
      • PWA instalável em produção
      • Lighthouse scores aceitáveis

---

## Sprint 1 (adicionais pós-auditoria)

---

## Sprint 2 (adicionais pós-auditoria)

---

## Sprint 3 (adicionais pós-auditoria)

### [✓] TASK-027: Rate Limiting (2h) — specs/features/04-multiplayer-rooms.md
    → Chat & Guess (Socket.io):
      • 1 palpite / segundo por jogador (já mencionado em TASK-011, consolidar aqui)
      • 5 mensagens de chat / 10 segundos por jogador (burst tolerável)
      • Exceder → evento `error:rate_limited` com cooldown em ms
    → Room creation:
      • 3 salas / 10 minutos por socketId (guest) e por userId (logado)
      • Exceder → rejeitar com código e mensagem
    → REST API (Fastify):
      • @fastify/rate-limit: 60 req/min por IP (anon) e 300/min por userId
      • Endpoints de escrita (POST /daily/guess, PATCH /profile) com limites específicos
    → Implementação:
      • In-memory (sliding window) por simplicidade — suficiente para 1 instância Railway
      • Documentar limitação: não escala horizontal (precisaria Redis); revisitar quando necessário
    → Validação:
      • Spam de 20 mensagens em 1s recebe rate limit em algumas
      • Criar 4 salas consecutivas rejeita a 4ª
      • REST com 100 req/s retorna 429 nas excedentes

---

## Sprint 5 (adicionais pós-auditoria)

### [✓] TASK-030: XP Engine — Backend (3.5h) — specs/features/08-xp-system.md
    → Nota: depende de TASK-015 (daily backend, para gerar eventos de daily) e TASK-010 (game loop, para eventos multiplayer). Schema (`users.xp`, `users.level`, `xp_events`) já foi criado em TASK-002. Esta task implementa apenas o serviço + integração.
    → Constants em @wts/shared:
      • Adicionar `XP_VALUES` com: `multiplayerCorrectDivisor=10`, `multiplayerFinishBase=50`, `podiumBonus={1:100,2:50,3:25}`, `dailyCorrectByPhase={1:150,2:100,3:75,4:50}`, `dailyParticipation=15`, `dailyStreakMultiplier=10`, `dailyStreakCap=30`
      • `XP_DAILY_CAP = 2000` (por user por dia BRT)
      • `XP_LEVEL_FORMULA = (xp) => Math.floor(Math.sqrt(xp / 100)) + 1` (source of truth; trigger do DB usa a mesma fórmula)
    → Service `apps/server/src/services/xp-service.ts`:
      • `awardXp({ userId, source, sourceRef, amount, context })` — função única que:
        1. Valida que `userId` existe e `users.is_guest === false`; guest → no-op
        2. Calcula XP total ganho no dia (BRT) via query em `xp_events` com filtro de data; aplica cap
        3. Persiste em `xp_events` (UNIQUE constraint torna idempotente — conflict = no-op)
        4. Se não capped, `UPDATE users SET xp = xp + amount` (trigger `sync_user_level` recalcula nível)
        5. Retorna `{ previousLevel, newLevel, amountCredited, capped }`
      • Todas as chamadas passam um `source_ref` estável (ex: `round_score_id`, `daily_result_id`, `streak_bump_${userId}_${date}`)
      • Rodar async via `setImmediate` ou fila — não bloquear request original
    → Integrações:
      • `scoring-service` (TASK-010): após INSERT em `round_scores`, chamar `awardXp('multiplayer_correct', round_score_id, floor(points/10), {phase, position})`
      • `game-loop` (TASK-010): ao emitir `GAME_END`, para cada player conectado, `awardXp('multiplayer_finish', gameSessionId+playerId, base + podiumBonus, {finalPosition})`
      • `daily-service` (TASK-015): após INSERT em `daily_results`, decidir entre `daily_correct` (com bonus por fase) ou `daily_participation`
      • Trigger de streak (TASK-002/015): após `daily_streak` incrementar ≥ 2, emitir `daily_streak_bonus` com `amount = 10 * min(streak, 30)` e `source_ref = streak_${userId}_${date}`
    → API REST:
      • `GET /api/me/xp` — retorna `{ xp, level, todayEarned, todayCap, recent: LastXpEvent[10] }` para tela de perfil
    → Socket event:
      • Quando `awardXp` detecta level-up e user está em sala ativa, emitir `xp:level_up` para o socket do user (e broadcast o novo level para a sala — PlayerList atualiza)
    → Validação:
      • Guest jogando mp e daily: zero rows em `xp_events`, `users.xp` inalterado (teste com usuário marcado `is_guest`)
      • User logado: acertar rodada gera evento com `amount = pts/10`, `users.xp` incrementa, level atualiza automaticamente via trigger
      • Reprocessar mesma rodada (mesmo `source_ref`): zero duplicação, `users.xp` não incrementa duas vezes
      • Ganhar mais de 2000 XP em um dia: `xp_events` marca `capped=true`, `users.xp` para no cap
      • Cruzar threshold de level: evento socket `xp:level_up` chega ao client correto, com previous/new level

### [✓] TASK-031: XP Engine — Frontend (2.5h) — specs/features/08-xp-system.md
    → Nota: depende de TASK-030 (backend service e evento socket) e de TASK-013/014/016 (telas onde o badge aparece).
    → Componentes novos:
      • `components/shared/LevelBadge.tsx` — stateless, recebe `level: number | 'guest'`, decide classe por faixa (1-9 muted, 10-24 cyan, 25-49 magenta, 50+ gradient gold→magenta), exibe `[Lv.X]` ou `[Guest]`
      • `components/shared/LevelUpModal.tsx` — overlay animado `previousLevel → newLevel`, scale-pop + glow, auto-dismiss em 4s ou click
      • Hook `useLevelUp()` — subscribe ao evento socket `xp:level_up`, mantém fila de modais (caso múltiplos em sequência)
    → Extend components existentes (do MP):
      • `PlayerList` (TASK-013) — mostrar `<LevelBadge>` compacto em cada linha
      • `GameChat` (TASK-013) — prefixo `[Lv.12]` nas mensagens dos players logados, `[Guest]` nos guests
      • `Podium`/`FinalRanking` (TASK-014) — badge grande ao lado do avatar do pódio
    → Extend components do Daily (TASK-016):
      • `DailyResult` — mostrar XP ganho (ex: "+100 XP") com destaque; se guest, banner "Você teria ganho +100 XP. Crie uma conta para acumular" com CTA para `/login`
    → Extend `/profile` (TASK-008):
      • Card de XP com: level atual, XP total, progresso até próximo level (barra), XP ganho hoje vs cap
      • Lista "últimos ganhos" (10 eventos mais recentes com source traduzido em PT-BR)
    → Types compartilhados:
      • Estender `RoomPlayer` em `@wts/shared/types` com `level: number | null` (null = guest)
      • Adicionar evento `xp:level_up` em `ServerToClientEvents`
      • Ajustar `RoomStateSnapshot` na spec 04 e nas docs (TASK-029 atualiza)
    → Validação:
      • Guest: badge `[Guest]` no chat, player list, pódio; banner de XP no final do Daily
      • Logado: badge `[Lv.X]` com cor correta por faixa; testar em 4 valores (Lv.5, Lv.15, Lv.30, Lv.60)
      • Level up mid-game: modal aparece, badge atualiza em tempo real para todos da sala
      • Perfil exibe XP/level/progresso corretos; refresh mantém consistência com backend
