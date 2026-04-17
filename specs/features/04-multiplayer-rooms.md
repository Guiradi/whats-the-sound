# Feature: Multiplayer Rooms & Real-Time Game Loop

## Fase: 1 — MVP
## Prioridade: P0
## Estimativa: 12 horas
## Depende de: 01-project-setup, 02-midi-engine, 03-auth

## Overview
O modo principal do jogo. Jogadores criam ou entram em salas com código, configuram a partida e competem em rodadas de adivinhação musical com revelação progressiva. O sistema de pontuação segue o modelo Gartic: o primeiro a acertar em cada fase ganha a pontuação máxima, e o valor decai para os acertos subsequentes. Toda comunicação é via WebSocket (Socket.io).

## Requisitos Funcionais

### Lobby (Sala de Espera)

#### Criar Sala
- Gera código alfanumérico de 5 caracteres (ex: WTS-A3K7R)
- Host pode configurar:
  - **Categoria:** "Todas", "Rock", "Pop", "Games", "Anime", "MPB", "Sertanejo", "Aleatório"
  - **Rodadas:** 5, 10, ou 15
  - **Tempo por fase:** 15s, 20s, ou 30s (tempo que cada fase de revelação fica ativa)
  - **Máximo de jogadores:** 2-20 (padrão: 12)
  - **Sala pública/privada:** Pública aparece na lista; privada só com código
- Host pode iniciar o jogo quando houver ≥ 2 jogadores

#### Entrar na Sala
- Via código (digitando ou link direto: whatsthesound.io/room/A3K7R)
- Via lista de salas públicas (mostra: nome do host, categoria, jogadores, vagas)
- Jogador informa nickname (se guest) ou usa o do perfil (se logado)
- Se sala está cheia: mensagem "Sala cheia" e sugestão de criar outra
- Se sala já está em jogo: entra como espectador (vê mas não pontua até próxima rodada)

#### Lobby UI
- Lista de jogadores conectados com avatares
- Chat livre antes do jogo começar
- Botão "Iniciar" visível apenas para o host
- Contador de jogadores: "5/12 jogadores"
- Botão "Copiar Link" para compartilhar a sala

### Game Loop (Máquina de Estados)

```
LOBBY → ROUND_START → PHASE_1 → PHASE_2 → PHASE_3 → PHASE_4 → ROUND_END → [ROUND_START...] → GAME_END
```

#### Estado: ROUND_START
- Servidor seleciona próximo MIDI da playlist (sem repetição)
- Exibe "Rodada X de Y" com animação de contagem regressiva (3, 2, 1...)
- Duração: 3 segundos
- Todos os clients sincronizam o relógio

#### Estado: PHASE_1 (Poucas Notas)
- Servidor envia evento `phase:start` com dados de áudio da fase 1
- Client toca o áudio automaticamente
- Timer de X segundos (configurado pelo host) começa
- Jogadores digitam palpites no chat
- Sistema de pontuação ativo (ver seção Pontuação)
- Botão "Replay" permite ouvir novamente
- Se alguém acerta: o chat mostra "[Jogador] acertou! 🎵" (sem revelar resposta)
- Ao fim do timer: avança automaticamente para PHASE_2

#### Estado: PHASE_2, PHASE_3, PHASE_4
- Mesmo fluxo do PHASE_1, mas com mais camadas de áudio
- Jogadores que já acertaram ficam "locked" (não digitam mais, veem o chat)
- Se TODOS acertarem antes do fim do timer: avança para ROUND_END imediatamente

#### Estado: ROUND_END
- Revela a resposta: nome da música e artista
- Mostra quem acertou e em qual fase
- Ranking parcial da rodada
- Animação de confete para o primeiro a acertar
- Duração: 5 segundos
- Avança para ROUND_START (próxima rodada) ou GAME_END

#### Estado: GAME_END
- Ranking final com todos os jogadores
- Pódio animado (1º, 2º, 3º)
- Botão "Jogar Novamente" (volta ao LOBBY com mesma configuração)
- Botão "Compartilhar Resultado"
- Stats da partida: total de acertos, fase média de acerto, música mais rápida

### Sistema de Pontuação (Estilo Gartic — Decrescente por Ordem de Acerto)

A pontuação de cada fase tem um **valor máximo** que decresce conforme mais jogadores acertam:

```
Fase 1 (máx 1000 pts):
  1º acerto → 1000 pts
  2º acerto → 900 pts
  3º acerto → 800 pts
  4º acerto → 700 pts
  ...decai 100 por acerto, piso mínimo: 300 pts

Fase 2 (máx 750 pts):
  1º acerto → 750 pts
  2º acerto → 675 pts
  3º acerto → 600 pts
  ...decai 75 por acerto, piso mínimo: 225 pts

Fase 3 (máx 500 pts):
  1º acerto → 500 pts
  2º acerto → 450 pts
  3º acerto → 400 pts
  ...decai 50 por acerto, piso mínimo: 150 pts

Fase 4 (máx 250 pts):
  1º acerto → 250 pts
  2º acerto → 225 pts
  3º acerto → 200 pts
  ...decai 25 por acerto, piso mínimo: 100 pts
```

**Regras:**
- Pontuação é calculada server-side (anti-cheat)
- Timestamp do acerto é registrado no servidor (não no client)
- Se dois jogadores acertam no "mesmo instante" (< 50ms de diferença), ambos ganham a mesma pontuação
- Jogadores que NÃO acertam em nenhuma fase ganham 0 pontos na rodada
- Ranking é atualizado em tempo real para todos os clients após cada acerto

### Chat & Verificação de Respostas

#### Input de Palpite
- Input de texto no rodapé da tela (como chat do Gartic)
- Enter envia o palpite
- Palpites aparecem no chat com o nome do jogador
- Rate limit: máximo 1 palpite por segundo por jogador

#### Verificação (Server-Side)
- Normalização: lowercase, remover acentos, remover artigos ("the", "o", "a", "os", "as")
- Distância de Levenshtein entre palpite e respostas aceitas
- Thresholds:
  - **Exato ou Levenshtein ≤ 1:** ACERTOU ✓
  - **Levenshtein 2-3:** "Muito quente! 🔥" (mensagem do bot no chat)
  - **Levenshtein 4-5:** "Quente! Está perto!" (mensagem do bot)
  - **Acertou artista mas não a música:** "Artista certo! Mas qual música? 🎤"
  - **Levenshtein > 5:** Palpite aparece normal no chat, sem feedback especial
- A resposta correta aceita múltiplas variações:
  - Ex: "Bohemian Rhapsody", "bohemian rhapsody", "bohemian rapsody", "boemian rapsodi"
  - Ex artista: "Queen", "queen"
- Quando alguém acerta, o palpite NÃO aparece no chat — apenas a mensagem do bot "[Player] acertou!"

#### Bot (Sound Bot) Messages
- Formatação visual diferenciada (cor diferente, ícone de robô)
- Mensagens:
  - `"🎵 Rodada 3 de 10 — Categoria: Rock"`
  - `"▶️ Fase 1 — Escutem com atenção!"`
  - `"🔥 @João está muito perto!"`
  - `"🎤 @Maria acertou o artista! Qual é a música?"`
  - `"✅ @Guilherme acertou! [1000 pts]"`
  - `"⏭️ Avançando para Fase 2..."`
  - `"🏆 Rodada encerrada! A resposta era: Bohemian Rhapsody — Queen"`

## Requisitos Não-Funcionais
- Latência de eventos WebSocket < 200ms (P95)
- Reconexão automática em caso de desconexão (Socket.io built-in)
- Estado do jogo sincronizado: se um jogador reconecta, recebe o estado atual completo
- Suportar 20 jogadores simultâneos por sala sem degradação
- Suportar 100 salas simultâneas no MVP

## Componentes

### `RoomLobby`
- Lista de jogadores, config da sala, chat livre, botão iniciar

### `GameBoard`
- Componente principal da tela de jogo: visualizador de áudio, timer, fase atual, info da rodada

### `PlayerList`
- Sidebar com avatares, nicknames, pontuações, indicador de "acertou"

### `GameChat`
- Chat com input de palpites, mensagens de jogadores e do bot
- Auto-scroll, highlight de mensagens do bot

### `ScoreBoard`
- Ranking parcial (durante o jogo) e final (após GAME_END)
- Animação de pódio no final

### `RoundTransition`
- Overlay de transição entre rodadas: contagem regressiva, revelação de resposta

### `GameTimer`
- Barra de progresso circular ou horizontal que esvazia conforme o tempo passa
- Muda de cor conforme urgência (verde → amarelo → vermelho)

### `RoomConfig` (host only)
- Form para configurar categoria, rodadas, tempo, max players, público/privado

## Telas / Fluxos

### Tela: Criar/Entrar (/rooms)
- **Estado padrão:** Input de código + botão "Entrar" / Botão "Criar Sala" / Lista de salas públicas
- **Estado loading:** Skeleton da lista
- **Estado erro:** "Sala não encontrada" ou "Sala cheia"

### Tela: Lobby (/room/[code])
- **Aguardando:** Lista de jogadores, chat, config (host), botão iniciar
- **Iniciando:** Countdown 3-2-1

### Tela: Jogo (/room/[code] — mesmo URL, componente muda)
- **Desktop:** 3 colunas (players | game board | chat)
- **Mobile:** Game board fullscreen + chat em drawer inferior + players em header compacto

### Tela: Resultado (/room/[code] — pós-jogo)
- Pódio, ranking final, stats, botões "Jogar Novamente" e "Compartilhar"

## Edge Cases
- **Host desconecta:** Transferir host para o próximo jogador na lista. Se ninguém restar, fechar sala.
- **Jogador desconecta durante rodada:** Marcar como "desconectado" (ícone cinza). Se reconectar em 30s, volta ao jogo. Se não, perde a rodada.
- **Sala vazia:** Auto-destruir após 5 minutos sem jogadores.
- **Jogador tenta entrar durante rodada:** Entra como espectador, participa na próxima rodada.
- **Empate no ranking final:** Desempate por "fase média de acerto" (quem acerta em fases mais iniciais ganha).
- **Spam no chat:** Rate limit + mute temporário automático após 5 mensagens em 3 segundos.
- **Palavrões no chat:** Filtro básico com lista de palavras proibidas (substituir por ***).
- **Jogador tenta adivinhar após já ter acertado:** Input desabilitado com mensagem "Você já acertou! 🎉"

## Decisões de Design
- **Pontuação calculada server-side:** Impede manipulação via DevTools. O client envia palpites, o server calcula tudo.
- **Timestamp do server para ordem de acerto:** Evita problemas de latência diferente entre jogadores. O que importa é quando o server RECEBEU o palpite.
- **URL única por sala (/room/[code]):** Permite deep linking — compartilhar o link já coloca o jogador na sala.
- **Mesmo URL para lobby e jogo:** O componente renderizado muda baseado no estado da sala (Socket.io room state), evitando navigation durante gameplay.
- **Sistema de decay linear com piso:** Simples de entender ("quanto antes, mais pontos") mas com piso para que acertar na fase 4 ainda valha algo.
