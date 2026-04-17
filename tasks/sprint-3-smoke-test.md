# Sprint 3 — Smoke Test Checklist

> Executar sequencialmente. Cada seção tem **pré-requisitos**, **passos**, e **resultado esperado**.
> Se algo falhar, anotar em qual passo e qual browser/OS. Não pular passos.
> Sprint 3 é backend-heavy (Socket.io + game services). A maioria dos testes usa **DevTools Console** para interagir com o server via socket.io-client.

**Duração estimada:** ~30-40 min se tudo passar na primeira; +15 min se encontrar bugs.

**Resultado:** ⏳ PENDING

---

## 0 · Setup prévio (5 min)

### 0.1 Gates locais verdes

```bash
pnpm install
pnpm lint
pnpm type-check
pnpm build
```

- [ ] `lint`: 4/4 passed (server tem 11 warnings — são `noNonNullAssertion` em array access, OK)
- [ ] `type-check`: 4/4 passed
- [ ] `build`: 3/3 passed

**Se qualquer um falhar, parar aqui.**

### 0.2 Env vars presentes

- [ ] `apps/web/.env.local` existe com `NEXT_PUBLIC_SERVER_URL=http://localhost:3001`
- [ ] `apps/server/.env.local` existe com ao menos `PORT=3001`

### 0.3 Dev servers up

```bash
pnpm dev
```

- [ ] Web sobe em `http://localhost:3000`
- [ ] Server sobe em `http://localhost:3001`
- [ ] Console do server mostra: `Socket.io server initialized`
- [ ] Nenhum erro de env validation

### 0.4 Health check

```bash
curl -i http://localhost:3001/health
```

- [ ] Response 200 OK com `{ status: "ok" }`

---

## 1 · Socket.io Connection — TASK-009 (5 min)

### 1.1 Conectar como usuário autenticado

Abrir `http://localhost:3000` no Chrome **logado na sua conta**. Abrir DevTools → Console. Colar:

```js
// Pegar o access token do Supabase armazenado no localStorage
const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-'));
const sbData = JSON.parse(localStorage.getItem(sbKey) || '{}');
const token = sbData?.access_token;
console.log('Token:', token ? '✅ found' : '❌ not found');

const { io } = await import('https://cdn.socket.io/4.7.5/socket.io.esm.min.js');
const socket = io('http://localhost:3001', { withCredentials: true, auth: { token } });
socket.on('connect', () => console.log('✅ Connected:', socket.id));
socket.on('connect_error', (err) => console.error('❌ Connect error:', err.message));
socket.on('error:generic', (e) => console.log('⚠️ Error:', e));
socket.on('error:rate_limited', (e) => console.log('🚦 Rate limited:', e));
socket.on('room:state', (s) => console.log('📦 Room state:', s));
socket.on('chat:message', (m) => console.log('💬 Chat:', m.text));
socket.on('phase:start', (p) => console.log('🎵 Phase start:', p.phase, 'ends at:', p.endsAt));
socket.on('round:reveal', (r) => console.log('🎤 Reveal:', r.title, '-', r.artist));
socket.on('room:host_changed', (h) => console.log('👑 Host changed:', h));
```

- [ ] `Token: ✅ found` aparece no console
- [ ] Console mostra: `✅ Connected: <socketId>`
- [ ] Server console mostra: `socket connected` com userId = seu UUID do Supabase (NÃO `guest:...`)

### 1.2 Conectar como guest (sem token)

Abrir aba anônima (ou deslogada). Console:

```js
const { io } = await import('https://cdn.socket.io/4.7.5/socket.io.esm.min.js');
const guestSocket = io('http://localhost:3001', { withCredentials: true });
guestSocket.on('connect', () => console.log('✅ Guest connected:', guestSocket.id));
guestSocket.on('connect_error', (err) => console.error('❌ Connect error:', err.message));
```

- [ ] Conecta normalmente (guest aceito sem token)
- [ ] Server log: userId começa com `guest:`

**Nota:** O Socket.io NÃO lê cookies automaticamente — o token do Supabase precisa ser passado explicitamente via `auth: { token }` no handshake. Isso é por design (segurança).

---

## 2 · Room Management — TASK-009 (8 min)

### 2.1 Criar sala

No console do mesmo tab:

```js
socket.emit('room:create', { category: 'random', maxRounds: 5, timePerPhaseSec: 15, maxPlayers: 12, isPublic: true }, (res) => console.log('🏠 Room created:', res));
```

- [ ] Callback imprime `🏠 Room created: { code: "XXXXX" }` (5 chars)
- [ ] Evento `room:state` recebido com snapshot: `room.code` = o código, `room.status` = `LOBBY`, `players` = 1 player (você)
- [ ] `room.hostId` = seu `userId` (guest:xxx)
- [ ] Anotar o código da sala: `______`

### 2.2 Segundo jogador entra

Abrir **segunda aba** do Chrome em `http://localhost:3000`. Console:

```js
const { io } = await import('https://cdn.socket.io/4.7.5/socket.io.esm.min.js');
const s2 = io('http://localhost:3001', { withCredentials: true });
s2.on('connect', () => console.log('✅ P2 Connected:', s2.id));
s2.on('room:state', (s) => console.log('📦 P2 Room state:', JSON.stringify(s.players.length), 'players, status:', s.room.status));
s2.on('chat:message', (m) => console.log('💬 P2 Chat:', m.text));
s2.on('phase:start', (p) => console.log('🎵 P2 Phase start:', p.phase));
s2.on('round:reveal', (r) => console.log('🎤 P2 Reveal:', r.title));
s2.on('error:generic', (e) => console.log('⚠️ P2 Error:', e));
s2.on('error:rate_limited', (e) => console.log('🚦 P2 Rate limited:', e));
```

Depois de conectar:

```js
s2.emit('room:join', { code: 'XXXXX', nickname: 'Player2' });
```

(Substituir XXXXX pelo código anotado)

- [ ] Tab 1 recebe `room:state` com `players.length = 2`
- [ ] Tab 2 recebe `room:state` com `players.length = 2`
- [ ] Player2 aparece na lista com nickname `Player2`
- [ ] Server log mostra `socket connected` para o segundo socket

### 2.3 Chat no lobby

Tab 2:

```js
s2.emit('chat:send', 'Hello from Player 2!');
```

- [ ] Tab 1 recebe `chat:message` com text "Hello from Player 2!"
- [ ] Tab 2 recebe `chat:message` com text "Hello from Player 2!"
- [ ] `kind` = `player`, `authorId` = userId do player 2

### 2.4 Sala pública aparece na lista

Não há REST endpoint para listar salas ainda, mas o room manager internal funciona. Validar pelo `room:state` recebido: `room.config.isPublic = true`.

- [ ] No snapshot recebido: `room.config.isPublic === true`

---

## 3 · Game Loop — TASK-010 (10 min)

### 3.1 Iniciar jogo (host only)

Tab 1 (host):

```js
socket.emit('game:start');
```

- [ ] Ambos tabs recebem `chat:message` com text contendo "Game starting! 5 rounds."
- [ ] Ambos recebem `chat:message` com "Round 1 of 5"
- [ ] Ambos recebem `room:state` com `room.status = "ROUND_START"`
- [ ] Após ~3s: ambos recebem `phase:start` com `phase: 1`
- [ ] `room:state` muda pra `status = "PHASE_1"`

### 3.2 Não-host não pode iniciar

Tab 2 (não-host):

```js
s2.emit('game:start');
```

- [ ] Nada acontece (silenciosamente ignorado — host check no game loop)

### 3.3 Guess verification durante fase

Esperar estar numa fase ativa (PHASE_1). Tab 2:

```js
s2.emit('game:guess', 'wrong answer');
```

- [ ] Chat message recebido nos dois tabs com o texto "wrong answer" (wrong guess vira chat)

```js
s2.emit('game:guess', 'completely random gibberish xyz');
```

- [ ] Outra chat message com o palpite errado

### 3.4 Acertar música

A stub MIDI provider usa uma das 15 músicas hardcoded. Pra acertar, precisamos saber qual é. Observar o `round:reveal` ao final de cada rodada (ou tentar nomes comuns).

Tentar no Tab 1:

```js
socket.emit('game:guess', 'Bohemian Rhapsody');
```

Se for a música certa:
- [ ] Chat message bot: `"Player_XXXXXX guessed correctly! (+XXXX pts)"`
- [ ] `room:state` snapshot mostra `round.correctPlayerIds` incluindo seu userId
- [ ] Player totalScore > 0 no snapshot

Se não for a música (provavelmente), aguardar rodada acabar e anotar o título revelado para testar na próxima rodada.

### 3.5 Transições automáticas de fase

Observar que após `timePerPhaseSec` (15s configurado), o jogo avança:

- [ ] PHASE_1 → PHASE_2 (após 15s) — `phase:start` com `phase: 2`
- [ ] PHASE_2 → PHASE_3 (após 15s) — `phase:start` com `phase: 3`
- [ ] PHASE_3 → PHASE_4 (após 15s) — `phase:start` com `phase: 4`
- [ ] PHASE_4 → ROUND_END (após 15s) — `round:reveal` com título e artista
- [ ] ROUND_END → próximo ROUND_START (após ~5s) — "Round 2 of 5"

### 3.6 Round reveal

Ao final de uma rodada:

- [ ] Evento `round:reveal` recebido com `{ title, artist, correctPlayerIds }`
- [ ] `title` é um dos stub MIDIs (ex. "Bohemian Rhapsody", "Billie Jean", etc.)
- [ ] `correctPlayerIds` é array (pode estar vazio se ninguém acertou)

### 3.7 Acertar na próxima rodada com o título revelado

Usar o título revelado na rodada anterior. Esperar a próxima fase ativa e testar:

```js
// Substituir pelo título real revelado
socket.emit('game:guess', 'Billie Jean');
```

- [ ] Bot message confirma acerto com pontuação
- [ ] Pontuação varia conforme fase (Phase 1: até 1000, Phase 4: até 250)

### 3.8 Fim do jogo

Deixar as 5 rodadas completarem (com 15s por fase, cada rodada = ~65s; total ~5min):

- [ ] Após rodada 5: `room:state` com `status = "GAME_END"`
- [ ] Chat message: "Game over! Final results are in."
- [ ] Snapshot `players` mostra `totalScore` para cada jogador
- [ ] Quem acertou mais tem score mais alto

**Atalho:** Se quiser acelerar, acertar todas as músicas com ambos os jogadores causa early advance (pula timer). Tentar adivinhar usando nomes dos stubs: Bohemian Rhapsody, Billie Jean, Garota de Ipanema, Smells Like Teen Spirit, Imagine, Yesterday, Evidências, Take On Me, Sweet Child O Mine, Hotel California, Despacito, Shape of You, Aquarela, Zelda Theme, Mario Theme.

---

## 4 · Guess Verifier — TASK-011 (5 min)

Esses testes podem ser feitos durante um jogo ativo. Iniciar novo jogo se necessário:

```js
socket.emit('game:start');
```

### 4.1 Normalização e tolerância

Esperar fase ativa. Testar com variações (pode não ser a música certa, mas verifica que o sistema processa):

```js
// Variações de escrita — se a música for Bohemian Rhapsody:
socket.emit('game:guess', 'bohemian rhapsody');    // lowercase
socket.emit('game:guess', 'BOHEMIAN RHAPSODY');    // uppercase
socket.emit('game:guess', 'bohemian rapsody');     // typo pequeno → hot
```

- [ ] Lowercase/uppercase aceito normalmente (correct ou wrong dependendo da música)
- [ ] Typo pequeno gera feedback "hot" (bot message com 🔥) se Levenshtein ≤ 3

### 4.2 Artist match

```js
// Se a música for de Queen:
socket.emit('game:guess', 'Queen');
```

- [ ] Bot message: "got the artist right! But what's the song?"

### 4.3 Acentos

```js
socket.emit('game:guess', 'garota de ipanema');    // sem acento
socket.emit('game:guess', 'Garota de Ipanema');    // com maiúscula
```

- [ ] Se for essa música: aceita ambos como correct (NFD normalization)

---

## 5 · Rate Limiting — TASK-027 (5 min)

### 5.1 Rate limit em guesses

Durante uma fase ativa, disparar palpites rápidos:

```js
for (let i = 0; i < 5; i++) {
  socket.emit('game:guess', `rapid guess ${i}`);
}
```

- [ ] Primeiros 1-2 passam (chat messages aparecem)
- [ ] Os seguintes emitem `error:rate_limited` com `scope: "game:guess"` e `retryAfterMs > 0`

### 5.2 Rate limit em chat

No lobby (após game end ou novo create):

```js
for (let i = 0; i < 10; i++) {
  socket.emit('chat:send', `spam message ${i}`);
}
```

- [ ] Primeiros 5 passam
- [ ] A partir do 6º: `error:rate_limited` com `scope: "chat:send"`

### 5.3 Rate limit em criação de salas

```js
socket.emit('room:leave');
for (let i = 0; i < 4; i++) {
  socket.emit('room:create', { category: 'random', maxRounds: 5, timePerPhaseSec: 15, maxPlayers: 12, isPublic: true }, (res) => console.log('Room', i, res));
  socket.emit('room:leave');
}
```

- [ ] Primeiras 3 salas criadas com sucesso
- [ ] 4ª emite `error:rate_limited` com `scope: "room:create"`

### 5.4 REST rate limit

```bash
# Rapidfire 65 requests ao health endpoint
for i in $(seq 1 65); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/health; done
```

- [ ] Primeiros ~60 retornam `200`
- [ ] Últimos retornam `429` (Too Many Requests)

---

## 6 · Room Cleanup + Reconnect — TASK-009 (5 min)

### 6.1 Disconnect grace period

Com um jogo em lobby (2 jogadores):

Tab 2 — fechar a aba (ou executar `s2.disconnect()`)

- [ ] Tab 1 recebe `room:state` imediatamente com player 2 `connected: false`
- [ ] Player 2 **ainda aparece na lista** (grace period de 30s)

Esperar ~35 segundos:

- [ ] Tab 1 recebe novo `room:state` com player 2 removido

### 6.2 Reconnect antes do grace expirar

Criar nova sala com 2 jogadores. Tab 2 desconecta:

```js
s2.disconnect();
```

- [ ] Tab 1: player 2 `connected: false`

Reconectar rapidamente (< 30s). Tab 2:

```js
s2.connect();
s2.emit('room:join', { code: 'XXXXX' });  // mesmo código
```

- [ ] Tab 1 recebe `room:state` com player 2 `connected: true` de volta
- [ ] Player 2 manteve seus dados (score, nickname)

### 6.3 Room auto-destroy

Criar sala com 1 jogador, depois sair:

```js
socket.emit('room:create', { category: 'random', maxRounds: 5, timePerPhaseSec: 15, maxPlayers: 12, isPublic: true }, (res) => console.log('Solo room:', res.code));
socket.emit('room:leave');
```

- [ ] Sala criada e saída imediatamente
- [ ] Após 5 minutos: tentar entrar nessa sala → `error:generic` "Room not found" (ou simplesmente não existe mais)

*Nota: 5 min é longo para esperar manualmente. Se quiser pular, está OK — o timer está implementado e testável via unit tests futuros.*

---

## 7 · Scoring — TASK-010 (3 min)

Iniciar novo jogo. Anotar as pontuações:

```js
socket.emit('room:create', { category: 'random', maxRounds: 5, timePerPhaseSec: 20, maxPlayers: 12, isPublic: true }, (res) => { window._code = res.code; console.log('Room:', res.code); });
```

Tab 2 join + start game. Ambos tentam acertar.

### 7.1 Pontuação por fase

- [ ] Acertar na Phase 1: score ≤ 1000 (1000 para 1º, 900 para 2º, etc.)
- [ ] Acertar na Phase 3: score ≤ 500
- [ ] Acertar na Phase 4: score ≤ 250
- [ ] Score nunca é negativo
- [ ] 1º jogador a acertar na mesma fase tem score > 2º jogador

### 7.2 Ranking final

Ao final do jogo (`GAME_END`):

- [ ] `room:state` snapshot `players` ordenável por `totalScore` (maior primeiro)
- [ ] Scores são cumulativos de todas as rodadas

---

## 8 · Regressões (3 min)

Confirmar que Sprint 2 continua funcionando:

- [ ] `http://localhost:3000/pt-BR/` renderiza homepage (TASK-003)
- [ ] `http://localhost:3001/health` retorna 200 (TASK-001)
- [ ] `/pt-BR/login` renderiza (TASK-007)
- [ ] `/pt-BR/dev/audio` — overlay aparece, tap, load test melody, play Fase 1 → som toca (TASK-005/006)
- [ ] `/pt-BR/profile` (logado) → mostra perfil (TASK-008)

---

## 9 · Browser matrix

Sprint 3 é backend — a matrix de browsers é menos relevante. O principal é confirmar que o Socket.io client conecta:

| Browser | 1 Connect | 2 Room | 3 Game | 5 Rate Limit |
|---------|-----------|--------|--------|--------------|
| Chrome Desktop | | | | |

**Prioridade**: Chrome Desktop é suficiente pra Sprint 3. Cross-browser em TASK-022.

---

## Bugs encontrados e corrigidos durante o smoke

*(Preencher conforme forem encontrados)*

---

## Resultado

⏳ **Sprint 3 PENDING** — aguardando execução do smoke test.
