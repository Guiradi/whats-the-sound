# Sprint 4 — Smoke Test Checklist

> Executar sequencialmente. Cada seção tem **pré-requisitos**, **passos**, e **resultado esperado**.
> Se algo falhar, anotar em qual passo e qual browser/OS. Não pular passos.

**Duração estimada:** ~30-40 min se tudo passar na primeira; +15-20 min se encontrar bugs.

**Resultado:** _(preencher após teste)_

---

## 0 · Setup prévio (3 min)

### 0.1 Gates locais verdes

```bash
pnpm install
pnpm lint
pnpm type-check
pnpm build
```

- [ ] `lint`: 4/4 passed
- [ ] `type-check`: 4/4 passed
- [ ] `build`: 3/3 passed

### 0.2 Dev server up

```bash
pnpm dev
```

- [ ] Web sobe em `http://localhost:3000` (Next.js)
- [ ] Server sobe em `http://localhost:3001` (Fastify)
- [ ] Nenhum erro de env validation no console

### 0.3 REST endpoint novo

```bash
curl -s http://localhost:3001/rooms | jq .
```

- [ ] Retorna `200 OK` com array JSON (vazio ou com salas)
- [ ] Sem erros no console do server

---

## 1 · Página /rooms (5 min)

### 1.1 Acesso e layout

- [ ] Abrir `http://localhost:3000/pt-BR/rooms`
- [ ] Heading "Salas" visível
- [ ] Link "Voltar para a home" → redireciona pra `/pt-BR/`
- [ ] Input de código (placeholder "CÓDIGO") + botão "Entrar"
- [ ] Botão "Criar Sala" visível

### 1.2 Join por código inválido

- [ ] Digitar `AB` (2 chars) → clicar "Entrar"
- [ ] Mensagem "Código deve ter 5 caracteres." aparece em vermelho
- [ ] Digitar `ABCDE` → clicar "Entrar" → navega pra `/pt-BR/room/ABCDE`
- [ ] Sala não existe → mostra "Conectando..." ou erro do socket

### 1.3 Lista de salas públicas

- [ ] Heading "Salas públicas" visível
- [ ] Se não há salas: "Nenhuma sala pública disponível. Crie uma!"
- [ ] _(após criar sala na seção 2):_ sala aparece na lista com código, categoria, contagem de jogadores, botão "Entrar"

---

## 2 · Criar sala + Lobby (8 min)

### 2.1 Dialog de criação

- [ ] Na página `/rooms`, clicar "Criar Sala" → dialog abre
- [ ] Dialog mostra: select de categoria, botões de rodadas (5/10/15), botões de tempo (15s/20s/30s), slider de max jogadores, checkbox "Sala pública"
- [ ] Selecionar: categoria "Rock", 5 rodadas, 20s, 8 jogadores, público
- [ ] Clicar "Criar Sala" → dialog fecha, redireciona pra `/pt-BR/room/XXXXX`

### 2.2 Lobby — host view

- [ ] Código de 5 chars exibido grande no topo (font mono, cyan)
- [ ] Botão "Copiar link" funciona → toast "Link copiado!"
- [ ] Config summary: badges mostrando "Rock", "5 rodadas", "20s por fase", "Máx. 8"
- [ ] Lista de jogadores mostra 1 jogador (você) com ícone de crown (host)
- [ ] Botão "Iniciar Jogo" aparece **desabilitado** com texto "Aguardando mais jogadores..."
- [ ] Botão "Sair da sala" visível

### 2.3 Segundo jogador entra

Abrir **segunda aba** no browser (anônima ou diferente):

- [ ] Ir pra `/pt-BR/rooms`
- [ ] _(se sala é pública)_ Sala aparece na lista → clicar "Entrar"
- [ ] **OU**: digitar o código de 5 chars no input → clicar "Entrar"
- [ ] Segunda aba mostra lobby com 2 jogadores
- [ ] Primeira aba atualiza: agora mostra 2 jogadores na lista
- [ ] Segundo jogador **NÃO** vê botão "Iniciar" — vê "Aguardando o host iniciar..."
- [ ] Botão "Iniciar Jogo" na aba do host agora está **habilitado**

### 2.4 Chat no lobby

- [ ] _(em qualquer aba)_ Digitar mensagem no chat input → Enter → mensagem aparece nas duas abas
- [ ] Mensagem mostra autor correto (nickname ou "You")

### 2.5 Sair e host migration

- [ ] _(na segunda aba)_ Clicar "Sair da sala" → volta pra `/rooms`
- [ ] Primeira aba: lista volta a mostrar 1 jogador
- [ ] _(opcional — se houver 3 jogadores)_ Host sai → crown migra pro jogador mais antigo

---

## 3 · Game Board — fluxo de jogo (10 min)

**Pré-requisito**: 2 abas no lobby da mesma sala, host com ≥2 jogadores.

### 3.1 Início do jogo

- [ ] Host clica "Iniciar Jogo"
- [ ] Ambas as abas mostram overlay de countdown "3, 2, 1, Vai!"
- [ ] Após countdown: game board aparece com layout de 3 colunas (desktop)

### 3.2 Layout desktop (≥1024px)

- [ ] **Coluna esquerda**: lista de jogadores com rank, avatar, nickname, score (0 no início)
- [ ] **Centro**: header com "Rodada 1 de 5" + indicator de fase (4 dots, primeiro ativo) + barra de timer (cyan)
- [ ] **Centro abaixo**: AudioVisualizer (barras cyan→magenta)
- [ ] **Coluna direita**: Chat com heading "Chat" + input no bottom

### 3.3 Timer e fases

- [ ] Timer conta regressiva de 20s (ou o valor configurado)
- [ ] Timer muda de cor: cyan (>50%) → amarelo (20-50%) → vermelho (<20%, pulsando)
- [ ] Ao chegar a 0: avança pra fase 2 automaticamente
- [ ] Dots no phase indicator atualizam (2º dot fica cyan)
- [ ] Após fase 4: overlay "round:reveal" mostra título + artista da música

### 3.4 Palpites (guesses)

- [ ] Digitar palpite no chat input → Enter → mensagem aparece no chat
- [ ] Palpite errado: aparece como mensagem normal do jogador
- [ ] Palpite "quente" (close): bot message em cyan "X is getting hot! 🔥"
- [ ] Palpite correto: bot message "X guessed correctly! (+XXX pts)"
- [ ] Após acertar: score do jogador atualiza na lista, checkmark verde aparece
- [ ] Input mostra "Você já acertou!" e fica desabilitado para quem acertou
- [ ] Mensagem verde no centro: "Você acertou! Aguardando próxima fase..."

### 3.5 Round reveal

- [ ] Após 4 fases (ou todos acertarem): overlay aparece com título e artista
- [ ] Se alguém acertou: nomes em badges verdes + confetti colorido
- [ ] Se ninguém acertou: "Ninguém acertou dessa vez."
- [ ] Overlay desaparece após ~5 segundos → próxima rodada começa

### 3.6 Transição de rodadas

- [ ] Entre rodadas: overlay "Rodada X de 5" com countdown 3-2-1
- [ ] Bot messages no chat: "Round X of 5"
- [ ] Scores acumulam entre rodadas

### 3.7 Áudio (se disponível)

> **Nota:** com StubMidiProvider, as URLs de MIDI são fake (`storage.example.com`). O áudio NÃO vai tocar.
> O visualizer ficará no estado idle (barras baixas). Isso é esperado até TASK-018 (seed de MIDIs reais).

- [ ] Visualizer presente no centro (barras baixas, estado idle) — **OK se não tocar áudio**
- [ ] Overlay "Toque para começar" aparece na primeira vez (se AudioContext ainda não foi iniciado)

---

## 4 · Layout mobile (5 min)

**Pré-requisito**: mesma partida em andamento (ou criar nova).

### 4.1 Responsividade

- [ ] Redimensionar janela pra <1024px (ou DevTools → Toggle device toolbar → iPhone 14)
- [ ] Layout muda: coluna única, sem sidebars
- [ ] Header compacto: rodada + fase + timer
- [ ] Centro: AudioVisualizer fullwidth
- [ ] Bottom fixo: chat input

### 4.2 Drawers mobile

- [ ] Ícone de "Users" no header → abre drawer com lista de jogadores (slide-up)
- [ ] Fechar drawer → volta ao game board
- [ ] Ícone de "MessageCircle" no header → abre drawer com chat
- [ ] Chat funcional dentro do drawer (enviar mensagem → aparece)
- [ ] Fechar drawer

---

## 5 · Tela de resultado — GAME_END (5 min)

**Pré-requisito**: jogar 5 rodadas até o fim (ou esperar as fases passarem).

### 5.1 Pódio e ranking

- [ ] Após última rodada: tela de resultado aparece
- [ ] Heading "Resultado"
- [ ] **Pódio**: top 3 com layout 2º | 1º | 3º (1º mais alto, dourado)
- [ ] Avatares + nicknames + scores no pódio
- [ ] **Ranking completo** abaixo: todos os jogadores com posição, avatar, nickname, score, acertos
- [ ] Scores ordenados do maior pro menor

### 5.2 Stats da partida

- [ ] Grid de 3 cards: Rodadas (5), Jogadores (2), Total de acertos (N)
- [ ] Valores corretos e coerentes

### 5.3 Compartilhar

- [ ] Botão "Compartilhar resultado" visível
- [ ] Clicar → copia texto pro clipboard (desktop) ou abre share sheet (mobile)
- [ ] Toast "Copiado!" aparece
- [ ] Colar em algum lugar → texto no formato:
  ```
  What's the Sound? - Game Result

  1st: NickHost (XXXX pts)
  2nd: NickP2 (XXXX pts)

  whatsthesound.io
  ```

### 5.4 Jogar novamente

- [ ] **Host** vê botão "Jogar novamente" → clicar
- [ ] **Não-host** vê texto "Aguardando o host..."
- [ ] Ao host clicar: jogo reinicia, scores resetam, novo countdown 3-2-1

---

## 6 · Anti-cheat sanity check (2 min)

### 6.1 Título nunca vaza antes do reveal

- [ ] Durante uma fase ativa, abrir DevTools → Network → WS → Messages
- [ ] Filtrar por `room:state` — **nenhum** campo contém título ou artista da música atual
- [ ] O título/artista só aparece em `round:reveal` após o fim da rodada

### 6.2 Score é server-side

- [ ] Verificar que não há campo de score editável no client (DevTools → Elements)
- [ ] Score atualiza apenas após bot message "guessed correctly! (+N pts)"

---

## 7 · Regressões quick (3 min)

- [ ] `/pt-BR/` → home renderiza normalmente (não quebrou com (game) route group)
- [ ] `/pt-BR/login` → auth page funciona
- [ ] `/pt-BR/profile` → perfil renderiza (se logado) ou GuestEmptyState (se guest)
- [ ] `/pt-BR/dev/audio` → audio engine page funciona
- [ ] `curl http://localhost:3001/health` → `{ "status": "ok" }`
- [ ] Sprint 3 smoke test (opcional): `pnpm --filter @wts/server smoke:sprint3`

---

## 8 · i18n (2 min)

- [ ] Repetir seção 2.2 (lobby) em `/en/rooms` → labels em inglês: "Create Room", "Join", "Public rooms"
- [ ] No game board: "Round 1 of 5", "Phase 1 of 4", "Type your guess..."
- [ ] Resultado: "Results", "Share result", "Play again"

---

## Bugs encontrados e corrigidos durante o smoke

_(preencher conforme encontrar)_

1. ...
2. ...

---

## Resultado

_(preencher após teste)_

- [ ] **Sprint 4 PASSED** — browser/OS, todas as seções verdes.
- [ ] **Sprint 4 FAILED** — listar seções com falha.
