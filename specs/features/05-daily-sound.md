# Feature: Daily Sound (Modo Solo Diário)

## Fase: 1 — MVP
## Prioridade: P0
## Estimativa: 6 horas
## Depende de: 02-midi-engine, 03-auth, 10-i18n

> **Nota i18n (feature 10):** o card de compartilhamento do resultado (template `🔊 What's the Sound? #47 ...`) é uma key `daily.share_template` com placeholders ICU (`{dayNumber}`, `{phase}`, `{grid}`, `{streak}`) — não string crua. Ambas as versões (pt-BR + en) vivem em `messages/*.json`. O conteúdo **compartilhado** usa o locale ativo do jogador no momento.

## Overview
Uma música MIDI por dia, igual para todos os jogadores, no estilo Wordle. O jogador tem 4 tentativas (uma por fase de revelação) para adivinhar. Ao final, recebe um card de resultado compartilhável que mostra sua performance em formato visual (grid de emojis). Motor principal de retenção diária e viralização orgânica.

## Requisitos Funcionais

### Seleção da Música Diária

**Timezone (decisão fixa):** sempre `UTC-3` hard-coded, **sem** aplicar horário de verão (HV brasileiro foi extinto em 2019 e a confusão histórica recomenda ficar em offset fixo). Troca do dia ocorre às **03:00 UTC = 00:00 BRT**.

**Cron:** Railway (backend Fastify) roda job cron diário configurado em `node-cron` com expressão `0 3 * * *` e TZ `UTC`. Supabase Edge Functions como fallback manual (não rodam automaticamente). Ao disparar:
1. Calcular `date = new Date().toISOString().slice(0, 10)` (dia corrente UTC às 03:00)
2. Chamar `selectDailyMidi(date)` (ver abaixo)
3. UPSERT em `daily_schedule(date, midi_id, category)`

**Seleção rotation-safe:** armazenar seleção pré-computada em tabela `daily_schedule` ao invés de usar `hash(date) % catalog_size` puro. Motivo: o catálogo cresce, e um hash puro faria o mesmo `date` mapear para um MIDI diferente em execuções futuras.

```typescript
async function selectDailyMidi(dateISO: string): Promise<MidiEntry> {
  // 1. Se já existe em daily_schedule, retornar (idempotente)
  const existing = await db.daily_schedule.findOne({ date: dateISO });
  if (existing) return existing;

  // 2. Última 100 seleções não repetem
  const recent = await db.daily_schedule
    .find({ date: { $gte: subDays(dateISO, 100) } })
    .select('midi_id');
  const excludeIds = new Set(recent.map(r => r.midi_id));

  // 3. Categoria do dia da semana (em BRT — dia da semana de `dateISO` em UTC equivale ao dia BRT porque viramos às 03:00 UTC)
  const category = WEEKDAY_CATEGORY[dayOfWeekBRT(dateISO)];

  // 4. Pool candidato
  const pool = await db.midi_catalog.find({
    is_active: true,
    category: category === 'random' ? { $in: ALL_CATEGORIES } : category,
    id: { $nin: [...excludeIds] },
  });

  // 5. Hash determinístico escolhe dentro do pool filtrado
  const idx = hmacSha256(DAILY_SEED, dateISO).readUInt32BE(0) % pool.length;
  return pool[idx];
}
```

**Categoria por dia da semana** (calculada sempre em BRT):
- Segunda: Pop Internacional
- Terça: Rock
- Quarta: Games / Trilhas Sonoras
- Quinta: MPB / Brasileiras
- Sexta: Aleatório (qualquer categoria)
- Sábado: Anime / J-Pop
- Domingo: Clássicos (músicas anteriores a 2000)

**Cliente:** calcula "dia corrente para o Daily" com `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date())`. Resultado é enviado no request ao server que confirma contra `daily_schedule`. Se divergir (raro — só se cliente tem clock muito errado), server é source of truth.

**Buffer anti-repetição:** garantia de não repetir em 100 dias (busca feita acima com `$nin`). Quando catálogo ainda não tem 100+ músicas ativas, o limite cai para `catalogSize - 1` e user pode ver repetição (ver Edge Case abaixo).

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
- **Jogador joga às 23:59 BRT e termina às 00:01 BRT:** O resultado conta para o dia em que COMEÇOU (23:59 BRT), registrado no campo `started_at_date` da submission. A música em reprodução não muda no meio da sessão.
- **Jogador troca de timezone/viaja:** O server só conhece BRT. Se um usuário em Lisboa acessa `/daily` às 23:00 local (= 23:00 WEST = 20:00 BRT), vê a música do dia BRT corrente. Não há "daily local". Documentar isso no FAQ.
- **Cron não rodou (outage do Railway):** no primeiro request do dia sem entrada em `daily_schedule`, o próprio endpoint `GET /api/daily` chama `selectDailyMidi()` que é idempotente. Nunca retorna erro por "daily ainda não selecionado".
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
