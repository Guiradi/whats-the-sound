# Feature: Daily Sound (Modo Solo Diário)

## Fase: 1 — MVP
## Prioridade: P0
## Estimativa: 6 horas
## Depende de: 02-midi-engine, 03-auth

## Overview
Uma música MIDI por dia, igual para todos os jogadores, no estilo Wordle. O jogador tem 4 tentativas (uma por fase de revelação) para adivinhar. Ao final, recebe um card de resultado compartilhável que mostra sua performance em formato visual (grid de emojis). Motor principal de retenção diária e viralização orgânica.

## Requisitos Funcionais

### Seleção da Música Diária
- Servidor define a música do dia via cron job à meia-noite (UTC-3, horário de Brasília)
- A música é selecionada de forma determinística: `hash(date + secret_seed) % total_midis`
- Garante que a mesma música não repete em 100 dias (buffer do catálogo inteiro)
- Cada dia pode ter uma categoria temática rotativa (configurável):
  - Segunda: Pop Internacional
  - Terça: Rock
  - Quarta: Games / Trilhas Sonoras
  - Quinta: MPB / Brasileiras
  - Sexta: Aleatório (qualquer categoria)
  - Sábado: Anime / J-Pop
  - Domingo: Clássicos (músicas anteriores a 2000)

### Gameplay Solo

#### Fluxo de Jogo
1. Jogador acessa `/daily`
2. Fase 1: ouve as primeiras notas → digita palpite → certo ou errado
3. Se errou: avança para Fase 2 com mais informação sonora → tenta de novo
4. Repete até Fase 4 ou até acertar
5. Se não acertou em nenhuma fase: "Não foi dessa vez! A resposta era..."
6. Exibe card de resultado com performance

#### Regras
- **1 tentativa por fase** (total: 4 tentativas)
- Pode ouvir replay quantas vezes quiser dentro de cada fase
- Pode pular uma fase sem tentar (gasta a tentativa)
- Timer por fase: NÃO tem (diferente do multiplayer — jogo relaxado)
- Jogador logado: resultado salva no histórico e conta para o streak
- Guest: pode jogar mas resultado não persiste

### Feedback por Tentativa
- **Acertou (exato ou Levenshtein ≤ 1):** "🎉 Acertou na Fase X!"
- **Quase (Levenshtein 2-3):** "🔥 Quase! Tente de novo..." (não gasta tentativa extra, permite corrigir)
- **Artista certo, música errada:** "🎤 Artista certo! Qual é a música?"
- **Errado:** "❌ Não é essa. Vamos para a Fase X+1..."

### Sistema de Streak
- Cada dia que o jogador joga (independente de acertar), conta +1 no streak
- Streak reseta se pular um dia
- Streak é exibido no perfil e no card de resultado
- Record de streak salvo permanentemente
- Notificação push (se PWA instalado): "Não perca seu streak de 7 dias! 🔥" às 20h se não jogou

### Card de Resultado Compartilhável
Formato (texto copiável para redes sociais):

```
🔊 What's the Sound? #47
🎵 Acertei na Fase 2!

🟩 Fase 1: ❌
🟩 Fase 2: ✅
⬜ Fase 3: —
⬜ Fase 4: —

🔥 Streak: 12 dias
whatsthesound.io/daily
```

Variações:
- Acertou Fase 1: `🟩✅ ⬜— ⬜— ⬜—` (melhor resultado possível)
- Não acertou: `🟥❌ 🟥❌ 🟥❌ 🟥❌` + "A resposta era: [Música — Artista]"
- Emojis das fases: 🟩 = tentou e acertou, 🟥 = tentou e errou, ⬜ = não tentou (já acertou antes)

### Histórico do Daily Sound
- Calendário visual (estilo GitHub contributions) mostrando dias jogados
- Cores: verde (acertou), vermelho (errou), cinza (não jogou)
- Clique em um dia passado mostra: qual era a música, em qual fase acertou (ou não)
- Não permite jogar dias passados (é estritamente diário)

## Requisitos Não-Funcionais
- Página deve carregar em < 2s (PWA cached)
- Resultado do dia cacheado no client — se voltar à página, mostra resultado (não permite jogar de novo)
- Anti-cheat: palpites são verificados server-side, resposta nunca está no client
- Timezone: sempre UTC-3 (Brasil), música troca à meia-noite BRT

## Componentes

### `DailyChallenge`
- Componente principal: visualizador de áudio, fase atual, input de palpite, feedback

### `DailyResult`
- Card de resultado: grid de fases, streak, botão "Compartilhar", botão "Copiar resultado"

### `DailyCalendar`
- Calendário de contribuições: dias jogados (verde/vermelho/cinza)
- Modal ao clicar em dia passado: música, artista, performance

### `StreakBadge`
- Badge com número do streak atual e ícone de fogo
- Animação de pulso quando streak ≥ 7

### `ShareButton`
- Gera texto formatado e copia para clipboard
- Opção de compartilhar via Web Share API (mobile: abre menu nativo de compartilhamento)

## Telas / Fluxos

### Tela: Daily Sound (/daily)
- **Estado "não jogou hoje":** Botão "Começar" → ouve Fase 1 → input de palpite
- **Estado "jogando":** Visualizador de áudio + fase atual + input + histórico de tentativas da sessão
- **Estado "completou":** Card de resultado + botão compartilhar + próximo daily em countdown ("Próximo em 14h 32m")
- **Estado loading:** Skeleton do visualizador
- **Estado erro:** "Erro ao carregar o Daily Sound. Tente recarregar."

### Tela: Histórico (/daily/history)
- **Logado:** Calendário de contribuições + stats (total jogado, % acerto, streak atual/max)
- **Guest:** "Crie uma conta para ver seu histórico" + login

## Edge Cases
- **Jogador joga às 23:59 e termina às 00:01:** O resultado conta para o dia em que COMEÇOU (23:59)
- **Jogador troca de timezone/viaja:** Sempre UTC-3, sem exceções
- **Jogador tenta acessar /daily duas vezes no mesmo dia:** Mostra resultado anterior
- **Cache corrompido:** Se client acha que já jogou mas server não tem registro, permitir jogar (server é source of truth)
- **Catálogo < 100 músicas:** Se acabar o buffer, permitir repetição com aviso "(Você já pode ter ouvido essa!)"
- **Jogador compartilha resultado com spoiler:** O card de resultado NUNCA contém o nome da música — só o grid de performance

## Decisões de Design
- **Sem timer no modo solo:** Diferente do multiplayer, o Daily Sound é relaxado. O jogador pode pensar o tempo que quiser. Isso incentiva jogar no transporte/intervalo sem pressão.
- **1 tentativa por fase (não por total):** Se o jogador erra na Fase 1, ganha MAIS informação na Fase 2. Isso é mais justo e mais divertido que "4 tentativas na Fase 1 e acabou".
- **Exceção "quase":** Se a resposta está a Levenshtein 2-3, não gasta tentativa extra — permite corrigir typo. Isso é importante no mobile onde erros de digitação são comuns.
- **Streak conta jogou (não acertou):** Incentiva jogar todo dia mesmo que não saiba. Reduz frustração e aumenta retenção.
- **UTC-3 fixo:** O público primário é brasileiro. Simplifica a lógica e evita confusão com "qual é a música de hoje?".
