# UX Principles — What's the Sound?

## Princípio Central

> **"A diversão acontece em 3 segundos."**
> O jogador deve estar ouvindo, rindo ou digitando em até 3 segundos após qualquer ação. Zero fricção, máxima energia.

## Princípios de UX

### 1. Zero Friction to Play
- **O quê:** Nenhuma barreira entre abrir o app e estar jogando.
- **Na prática:** Sem cadastro obrigatório. Entrar numa sala = digitar código + nickname. Daily Sound = apertar Play. Nenhum tutorial obrigatório (UI é auto-explicativa).
- **Exemplo:** O Gartic permite jogar em 2 cliques. WTS deve fazer o mesmo.

### 2. Mobile-First, Always
- **O quê:** Toda decisão de layout começa no mobile e escala para desktop.
- **Na prática:** Thumb zone respeitada (botões e input na metade inferior). Chat como drawer, não sidebar. Gestos de swipe onde fizer sentido. Teclado virtual não pode cobrir o input de palpite.
- **Exemplo:** No mobile, o input de palpite é fixo no bottom da tela (como WhatsApp), nunca escondido.

### 3. Audio is King, Visual is Context
- **O quê:** O áudio é a mecânica central. O visual complementa, nunca compete.
- **Na prática:** Visualizador de áudio é decorativo, não informativo demais. Animações são sutis durante playback. Nada pisca ou distrai enquanto o jogador está tentando ouvir. DEPOIS do acerto/erro, aí sim — confete, brilho, animação.
- **Exemplo:** Durante a reprodução do MIDI, a tela tem apenas o visualizador pulsando suavemente. Sem pop-ups, sem notificações.

### 4. Instant Feedback, Every Action
- **O quê:** Toda ação do jogador tem resposta visual/sonora imediata.
- **Na prática:**
  - Digitar palpite → aparece no chat instantaneamente (optimistic UI)
  - Acertar → flash verde + som de acerto + mensagem do bot
  - Errar → mensagem aparece normal, nenhum feedback negativo pesado
  - "Quase" → flash laranja + mensagem animada do bot
  - Replay → áudio começa em < 100ms
- **Exemplo:** No Gartic, quando alguém acerta, toda a tela reage. WTS deve ter o mesmo nível de feedback.

### 5. Social Tension > Individual Challenge
- **O quê:** A graça não é adivinhar sozinho — é adivinhar ANTES dos outros.
- **Na prática:** Ranking atualiza em tempo real. Quando alguém acerta, todo mundo sabe (mas não a resposta). O chat está sempre visível. Placar de pontos é proeminente. Animação especial para "primeiro a acertar".
- **Exemplo:** Quando o 1º jogador acerta na Fase 1, os outros veem "Alguém já acertou!" e sentem urgência.

### 6. Reward Curiosity, Not Punishment
- **O quê:** Errar não é punido. Tentativas são encorajadas.
- **Na prática:** Palpites errados aparecem normalmente no chat (sem cor vermelha agressiva). Feedback "quente/frio" incentiva a continuar tentando. No Daily Sound, streak conta "jogou" (não "acertou"). Não existe "Game Over" — o jogo simplesmente revela a resposta e segue.
- **Exemplo:** Se o jogador erra todas as fases no Daily Sound, a mensagem é: "Não foi dessa vez! A resposta era..." (tom amigável, não "ERROU").

### 7. Shareable Moments
- **O quê:** Os melhores momentos do jogo devem ser fáceis de compartilhar.
- **Na prática:** Card de resultado do Daily Sound é otimizado para copy-paste (formato texto/emoji). OG Images bonitas para preview no WhatsApp/Twitter. Botão de compartilhar sempre visível no momento certo. Link da sala é copiável com 1 toque.
- **Exemplo:** O Wordle viraliza porque o grid de cores é compartilhável. O grid do WTS (🟩✅ 🟥❌ ⬜—) serve o mesmo propósito.

### 8. Progressive Disclosure
- **O quê:** Mostrar apenas o necessário no momento certo.
- **Na prática:** Lobby mostra configurações básicas (host vê avançadas via toggle). Perfil mostra stats simples (expandível para histórico). Primeira visita mostra apenas "Jogar" e "Daily Sound" (sem sobrecarregar com opções).
- **Exemplo:** O tutorial "acontece" naturalmente na primeira rodada, não como slides que o jogador vai pular.

## Estados de Tela

Toda tela do WTS deve considerar esses 5 estados:

### Empty State
- **Visual:** Ilustração simples (mascote ou ícone grande) + texto explicativo + CTA
- **Tom:** Amigável e convidativo
- **Exemplo (salas):** Mascote com fones de ouvido + "Nenhuma sala disponível. Crie a sua!" + Botão "Criar Sala"

### Loading State
- **Visual:** Skeleton animado (shimmer) no formato do conteúdo esperado
- **Regra:** NUNCA spinner genérico no centro da tela. Sempre skeleton no formato real.
- **Duração máxima:** Se > 3s, mostrar mensagem "Carregando..." com dica sobre o jogo
- **Exemplo (jogo):** Skeleton do visualizador de áudio + skeleton do chat

### Error State
- **Visual:** Ícone de alerta + mensagem clara + botão de ação
- **Tom:** Direto mas não técnico. "Algo deu errado" não "500 Internal Server Error"
- **Ação:** Sempre ter um botão (Tentar novamente, Voltar, Recarregar)
- **Exemplo:** "Ops! Não conseguimos conectar à sala. [Tentar novamente]"

### Success State
- **Visual:** Cor verde, animação de confirmação, confete quando aplicável
- **Duração:** Auto-dismiss em 3s OU avança automaticamente
- **Exemplo (acerto):** Flash verde no chat + confete + pontuação animada subindo

### Active/Playing State
- **Visual:** Limpo, focado na mecânica. Mínimo de distrações.
- **Regra:** Nada novo aparece na tela durante a reprodução de áudio (exceto chat messages)
- **Exemplo:** Enquanto o MIDI toca → visualizador pulsa suavemente, timer conta, chat rola

## Tom de Voz

### O WTS fala como...
Um **apresentador de game show jovem e descontraído**. Pense num VJ da MTV dos anos 2000 — energético, usa gírias leves, celebra os acertos e consola nas derrotas sem ser condescendente.

### Exemplos por contexto

| Contexto           | Tom                    | Exemplo                                          |
|--------------------|------------------------|--------------------------------------------------|
| Boas-vindas        | Animado, convidativo   | "Bora! Coloque os fones e mostre que você manja!" |
| Acerto rápido      | Impressionado          | "CARAMBA! Acertou de primeira! 🤯"               |
| Acerto normal      | Celebrando             | "Isso aí! 🎵"                                     |
| Quase acertou      | Encorajador            | "Tá quase! Tenta de novo!"                       |
| Ninguém acertou    | Consolador             | "Essa era difícil mesmo! A resposta era..."       |
| Streak alto        | Orgulhoso              | "7 dias seguidos! Você tá ON FIRE! 🔥"           |
| Erro de conexão    | Calmo, útil            | "Opa, perdemos a conexão. Reconectando..."        |
| Convite            | Casual                 | "Chama a galera! Quanto mais, melhor."            |

### Regras do Tom
- NUNCA usar linguagem técnica ("WebSocket desconectado", "Error 404")
- NUNCA ser condescendente ("Tente algo mais fácil", "Talvez música não seja seu forte")
- SEMPRE usar contrações e linguagem informal ("tá", "bora", "manja")
- Emojis: usar com moderação, máximo 1-2 por mensagem do bot
- Humor: leve e inclusivo, nunca às custas de alguém

## Regras de Animação

### Princípios
1. **Propósito:** Toda animação tem uma razão funcional (feedback, transição, atenção)
2. **Velocidade:** Rápida o suficiente para não atrasar, lenta o suficiente para perceber
3. **Consistência:** Mesma ação = mesma animação, sempre

### Specs

| Tipo                 | Duração   | Easing              | Quando                          |
|----------------------|-----------|---------------------|---------------------------------|
| Micro-interaction    | 100-200ms | ease-out            | Hover, click, toggle            |
| Feedback             | 200-400ms | spring              | Acerto, erro, "quente"          |
| Transition           | 200-300ms | ease-in-out         | Troca de tela, abrir modal      |
| Celebration          | 1-2s      | custom              | Primeiro acerto, fim de jogo    |
| Ambient              | 1.5-3s   | ease-in-out (loop)  | Visualizador, pulse, glow       |
| Loading              | 1-1.5s   | linear (loop)       | Skeleton shimmer                |

### Regra de Ouro
> Se a animação atrasar o jogador de fazer a próxima ação, ela é muito longa. Corte pela metade.

## Acessibilidade (WCAG 2.1 AA)

- Contraste mínimo: 4.5:1 para texto, 3:1 para elementos grandes
- Focus visible em todos os elementos interativos (outline cyan)
- Navegação por teclado funcional
- Screen reader: aria-labels nos botões, aria-live para chat e pontuação
- Alternativa visual para feedback sonoro (vibrações no mobile, flash visual)
- Reduced motion: respeitar `prefers-reduced-motion` (desabilitar animações decorativas)
- Font size mínimo: 14px para body text
