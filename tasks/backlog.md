# Backlog — What's the Sound?

> Single source of truth para todo trabalho pendente.
> Formato: `[status] TASK-XXX: Título (estimativa) — spec de referência`
> Status: `[ ]` pendente, `[→]` em progresso, `[✓]` completo, `[⏸]` pausado

---

## Sprint 1 — Fundação

### [ ] TASK-001: Setup do Monorepo com Turborepo (2h) — specs/features/01-project-setup.md
    → Estrutura:
      • Criar monorepo: apps/web (Next.js 15) + apps/server (Fastify) + packages/shared
      • Turborepo config: turbo.json com pipelines (dev, build, lint, type-check)
      • pnpm workspace: pnpm-workspace.yaml
    → Frontend (apps/web):
      • Next.js 15 App Router com TypeScript strict
      • Tailwind CSS v4 configurado
      • Biome config (biome.json) com rules padrão
      • tsconfig.json com path aliases (@/components, @/lib, @/hooks, @/types)
      • Layout raiz com metadata do PWA
      • Página placeholder "/" com logo WTS
    → Backend (apps/server):
      • Fastify com TypeScript
      • Estrutura: src/routes/, src/services/, src/socket/, src/types/
      • GET /health endpoint
      • CORS configurado (aceitar localhost em dev)
    → Shared (packages/shared):
      • TypeScript types compartilhados
      • Enums (MidiCategory, GameStatus, etc)
      • Constants (scoring values, phase config)
    → Scripts:
      • pnpm dev — roda ambos apps simultaneamente
      • pnpm build — build de produção
      • pnpm lint — Biome check em tudo
      • pnpm type-check — tsc --noEmit em tudo
    → Validação:
      • pnpm build completa sem erros
      • pnpm type-check zero erros
      • pnpm lint zero warnings
      • Página "/" renderiza no browser

### [ ] TASK-002: Setup Supabase + Schema inicial (2h) — specs/technical/database.md
    → Supabase Project:
      • Criar projeto no Supabase (região São Paulo)
      • Configurar Auth providers: Google OAuth + Discord OAuth
      • Criar Storage bucket "midis" (público, read-all)
    → Migrations:
      • 001_create_enums.sql — midi_category, midi_difficulty, game_status, user_role
      • 002_create_users.sql — tabela users + trigger auto-create + RLS
      • 003_create_midi_catalog.sql — tabela midi_catalog + RLS
      • 004_create_game_tables.sql — game_sessions, game_players, round_scores + RLS
      • 005_create_daily_tables.sql — daily_results, daily_schedule + RLS
      • 006_create_functions.sql — update_user_stats, update_daily_streak, update_midi_stats
      • 007_create_storage.sql — bucket midis + policies
    → Environment:
      • .env.local no apps/web com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
      • .env no apps/server com SUPABASE_SERVICE_ROLE_KEY e DATABASE_URL
      • .env.example em ambos apps
    → Validação:
      • Todas as migrations rodam sem erro (supabase db push)
      • RLS ativo em todas as tabelas
      • Auth com Google funciona (redirect + callback)
      • Storage bucket acessível publicamente

### [ ] TASK-003: Design System + Tailwind Theme (2h) — docs/design-system.md
    → Tailwind Config:
      • Estender tema com cores custom (bg, accent, text) conforme design-system.md
      • Configurar fonts: Space Grotesk (Google Fonts) + Inter (Google Fonts)
      • Configurar boxShadow glow effects
      • Configurar animações custom (fade-in, slide-up, scale-pop, pulse-glow)
    → CSS Global:
      • globals.css com CSS variables (:root)
      • Dark mode como default (sem toggle no MVP)
      • Reset de estilos base (body bg-primary, text text-primary)
      • Scrollbar custom (dark, fina)
    → Componentes Shadcn/UI:
      • Instalar Shadcn/UI (pnpx shadcn-ui@latest init)
      • Customizar theme.css para match com design system
      • Instalar componentes base: Button, Input, Card, Dialog, Toast, Avatar, Badge
    → Validação:
      • Página "/" renderiza com tema dark correto
      • Botão Primary tem glow cyan no hover
      • Fonts carregam corretamente
      • Cores batem com o design-system.md

### [ ] TASK-004: PWA Setup com Serwist (2h) — specs/features/07-pwa-sharing.md
    → Manifest:
      • public/manifest.json com name, short_name, icons, colors, display standalone
      • Gerar ícones em todos os tamanhos necessários (72-512px)
      • Splash screen config
    → Service Worker:
      • Instalar e configurar Serwist para Next.js App Router
      • Precache: shell HTML/CSS/JS das rotas principais (/, /daily, /rooms)
      • Runtime cache: Network-first para API, Cache-first para assets
      • Offline fallback page
    → Meta Tags:
      • <meta name="theme-color"> dinâmico
      • Apple touch icon
      • Viewport config para PWA
    → Validação:
      • Lighthouse PWA score ≥ 90
      • App instalável no Chrome/Android
      • Offline: shell carrega sem internet
      • Ícone correto na home screen

---

## Sprint 2 — MIDI Engine + Auth

### [ ] TASK-005: MIDI Audio Engine com Tone.js (6h) — specs/features/02-midi-engine.md
    → Dependências:
      • Instalar tone e @tonejs/midi no apps/web
    → MIDI Parser:
      • Serviço MidiParser que carrega .mid e extrai tracks, notas, BPM, metadata
      • Normalizar para formato interno MidiData
      • Lidar com MIDIs de 1 track vs multi-track
    → Soundfont Loader:
      • Carregar soundfonts GM para instrumentos comuns (Piano, Guitar, Bass, Strings, Drums)
      • Cache no service worker
      • Fallback para Tone.Synth se soundfont falhar
    → Phase Player:
      • Função playPhase(midiData, phaseConfig) que:
        - Filtra tracks conforme phaseConfig.tracks
        - Filtra notas conforme startBeat/endBeat
        - Agenda notas no Tone.Transport
        - Reproduz com timing correto
      • Função stop() que para imediatamente
      • Função replay() que repete a fase atual
    → Hook useMidiPlayer:
      • loadMidi(url) → carrega e parseia MIDI
      • play(phase) → reproduz fase específica
      • stop(), replay()
      • Estados: isPlaying, isLoading, currentPhase, progress (0-1)
    → Audio Analyser:
      • Conectar Tone.Analyser ao output
      • Expor dados de frequência para visualização (FFT)
    → Validação:
      • Carregar um MIDI de teste e reproduzir todas as 4 fases
      • Fase 1 toca apenas notas especificadas
      • Fase 4 toca todas as tracks
      • Stop para imediatamente, Replay funciona
      • Funciona no Chrome, Firefox e Safari (testar autoplay restrictions)

### [ ] TASK-006: Componente AudioVisualizer (3h) — specs/features/02-midi-engine.md
    → Componente:
      • AudioVisualizer recebe dados FFT do Tone.Analyser
      • Renderiza barras de frequência com canvas ou SVG
      • Cores: gradiente de cyan para magenta
      • Animação suave via requestAnimationFrame
      • Responsivo: ocupa width disponível, height fixo (120px mobile, 160px desktop)
    → Estados visuais:
      • Idle: barras estáticas baixas, cor muted
      • Playing: barras pulsando conforme frequência
      • Phase transition: animação de "wave" passando pelas barras
    → Performance:
      • requestAnimationFrame com throttle (30fps suficiente)
      • Desabilitar quando tab em background (Page Visibility API)
    → Validação:
      • Barras reagem ao áudio em tempo real
      • Sem jank visual (60fps no container, 30fps no canvas)
      • Funciona em mobile sem lag

### [ ] TASK-007: Auth com Supabase (Google + Discord) (3h) — specs/features/03-auth.md
    → Supabase Auth Client:
      • Configurar @supabase/ssr para Next.js App Router
      • Middleware de sessão (middleware.ts)
      • Cookies httpOnly para tokens
    → Páginas:
      • /login — botões Google e Discord + input nickname para guest
      • /auth/callback — route handler que processa OAuth redirect
    → Componentes:
      • LoginModal — modal reutilizável com botões de login + guest mode
      • UserAvatar — avatar com fallback de iniciais
      • Providers: AuthProvider context com useAuth() hook
    → Hook useAuth:
      • user: User | null
      • isGuest: boolean
      • isLoading: boolean
      • signInWithGoogle(), signInWithDiscord()
      • signOut()
      • guestLogin(nickname: string)
    → Guest Mode:
      • Salvar nickname no localStorage
      • Gerar guestId único (uuid v4) salvo no localStorage
      • Banner "Crie uma conta para salvar seu progresso"
    → Validação:
      • Login Google funciona (redirect → callback → home)
      • Login Discord funciona
      • Guest mode funciona (nickname → pode jogar)
      • Sessão persiste entre reloads
      • Logout limpa sessão

### [ ] TASK-008: Página de Perfil (2h) — specs/features/03-auth.md
    → Página /profile:
      • Avatar grande + nickname editável
      • Grid de stats: total_games, total_wins, total_correct, daily_streak, max_daily_streak, points_total
      • Botão logout
    → Componentes:
      • ProfileCard — avatar, nickname, stats
      • NicknameInput — input com validação real-time (debounce 500ms, check unicidade)
      • StatGrid — grid responsivo de stats com ícones
    → API:
      • PATCH /api/profile — atualizar nickname
      • Validação: único, 3-20 chars, [a-zA-Z0-9_], sem palavrões (lista básica)
    → Validação:
      • Perfil exibe dados do OAuth (nome, avatar)
      • Nickname editável e salva corretamente
      • Nickname duplicado mostra erro
      • Guest vê "Crie uma conta" ao invés do perfil

---

## Sprint 3 — Multiplayer Core

### [ ] TASK-009: Socket.io Server + Room Management (4h) — specs/features/04-multiplayer-rooms.md
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

### [ ] TASK-010: Game Loop Engine (6h) — specs/features/04-multiplayer-rooms.md
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

### [ ] TASK-011: Guess Verification System (3h) — specs/features/04-multiplayer-rooms.md
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

### [ ] TASK-012: Tela de Salas + Lobby (4h) — specs/features/04-multiplayer-rooms.md
    → Página /rooms:
      • Input de código + botão "Entrar"
      • Botão "Criar Sala"
      • Lista de salas públicas (nome do host, categoria, jogadores, vagas)
      • Skeleton loading para lista
    → Página /room/[code] — Lobby:
      • Lista de jogadores conectados com avatares
      • Chat livre (pre-game)
      • Config da sala (host only): categoria, rodadas, tempo, max players, público/privado
      • Botão "Iniciar" (host only, visível quando ≥ 2 jogadores)
      • Botão "Copiar Link"
      • Contador: "5/12 jogadores"
    → Componentes:
      • RoomList — lista de salas públicas
      • RoomLobby — layout do lobby
      • RoomConfig — form de configuração (host only)
      • PlayerListLobby — lista de jogadores no lobby
    → Socket.io Client:
      • Hook useRoom(code) — join, leave, state, players, chat
      • Reconexão automática com state sync
    → Validação:
      • Criar sala gera código e redireciona para /room/[code]
      • Entrar via código funciona
      • Lista de salas públicas atualiza em tempo real
      • Chat do lobby funciona entre jogadores

### [ ] TASK-013: Tela de Jogo — Game Board (6h) — specs/features/04-multiplayer-rooms.md
    → Layout Desktop (3 colunas):
      • Esquerda: PlayerList com scores e status
      • Centro: GameBoard (rodada, fase, timer, visualizador, info)
      • Direita: GameChat (mensagens + input)
    → Layout Mobile:
      • Header compacto com rodada e timer
      • Centro: GameBoard fullscreen
      • Bottom: Input de palpite fixo
      • Drawer: Chat (swipe up) e Players (swipe)
    → Componentes:
      • GameBoard — container central com AudioVisualizer + info da rodada
      • PlayerList — sidebar com avatares, nicknames, scores, indicador "acertou ✓"
      • GameChat — chat com mensagens de jogadores e bot, auto-scroll
      • ChatInput — input de palpite com Enter para enviar
      • GameTimer — barra de progresso (verde → amarelo → vermelho)
      • PhaseIndicator — mostra fase atual (1/4, 2/4...) com dots
      • RoundTransition — overlay de transição entre rodadas (countdown 3-2-1)
      • RoundReveal — overlay com resposta revelada (música, artista, quem acertou)
    → Integrações:
      • useMidiPlayer para reprodução de áudio
      • useRoom para eventos Socket.io
      • Animações: confete no primeiro acerto, shake no erro, pulse no timer urgente
    → Validação:
      • Jogo completo funciona no desktop (3 colunas)
      • Jogo completo funciona no mobile (layout responsivo)
      • Áudio toca em sync com os eventos do server
      • Chat mostra mensagens de jogadores e bot com estilos diferentes
      • Timer visual sincronizado com server

### [ ] TASK-014: Tela de Resultado + Compartilhamento (3h) — specs/features/04-multiplayer-rooms.md
    → Tela de Resultado (GAME_END):
      • Pódio animado (1º com efeito dourado, 2º prata, 3º bronze)
      • Ranking completo com score, acertos, fase média
      • Stats da partida: total rodadas, total acertos, música mais rápida
      • Botão "Jogar Novamente" (volta ao lobby com mesma config)
      • Botão "Compartilhar Resultado"
    → Compartilhamento:
      • Gerar texto formatado com resultado
      • Web Share API (mobile) / Clipboard (desktop)
      • Toast "Copiado!" após copiar
    → Componentes:
      • Podium — pódio animado com top 3
      • FinalRanking — lista completa de jogadores
      • MatchStats — grid de stats da partida
      • ShareResultButton — botão com lógica de share/copy
    → Validação:
      • Pódio anima corretamente
      • Ranking ordena por pontuação
      • Compartilhar gera texto correto e copia/compartilha
      • "Jogar Novamente" funciona

---

## Sprint 5 — Daily Sound + Polish

### [ ] TASK-015: Daily Sound — Backend (3h) — specs/features/05-daily-sound.md
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

### [ ] TASK-016: Daily Sound — Frontend (4h) — specs/features/05-daily-sound.md
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

### [ ] TASK-017: Daily Sound — Histórico + Calendário (2h) — specs/features/05-daily-sound.md
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

### [ ] TASK-018: MIDI Catalog Seed (100 músicas) (4h) — specs/features/06-midi-catalog.md
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

### [ ] TASK-019: OG Images dinâmicas (2h) — specs/features/07-pwa-sharing.md
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

### [ ] TASK-020: Landing Page + Home (3h) — specs/features/07-pwa-sharing.md
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
