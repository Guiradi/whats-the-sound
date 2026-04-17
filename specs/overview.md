# What's the Sound? — Product Overview

## O que é

**What's the Sound?** (WTS) é um jogo PWA multiplayer de adivinhação musical onde jogadores escutam trechos progressivos de músicas em formato MIDI e competem para adivinhar o nome da música e/ou artista o mais rápido possível. Inspirado na dinâmica social do Gartic e na nostalgia do quadro "Qual é a Música?" do Silvio Santos, o jogo combina competição em tempo real, revelação progressiva de áudio e um sistema de chat interativo com feedback inteligente.

## Problema que resolve

Jogos de adivinhação musical existentes (Heardle, SongTrivia) dependem de trechos de áudio licenciado, o que cria problemas de copyright, custos de API e shutdown (Heardle foi descontinuado pelo Spotify). Além disso, a maioria desses jogos é single-player ou assíncrono — falta a energia do multiplayer em tempo real que torna o Gartic tão viciante. WTS resolve ambos: usa MIDI (sem problemas de licenciamento) e oferece multiplayer síncrono com a tensão de "quem acerta primeiro leva mais pontos".

## Solução — Pilares Principais

1. **MIDI como fonte sonora** — Áudios MIDI providos manualmente, eliminando dependência de APIs de streaming e problemas de copyright. O timbre sintético/retrô vira identidade do jogo.
2. **Revelação progressiva em 4 fases** — Cada música é revelada em camadas (notas → melodia → harmonia → completa), criando tensão crescente e momentos "eureka".
3. **Multiplayer competitivo em tempo real** — Salas com código, chat interativo, pontuação decrescente por ordem de acerto (estilo Gartic).
4. **Modo Solo Diário ("Daily Sound")** — Uma música por dia, compartilhável em redes sociais, motor de viralização orgânica.
5. **Chat com feedback inteligente** — Sistema "quente/frio" que dá dicas contextuais sem revelar a resposta, mantendo todos engajados até o final.

## Público-Alvo (Personas)

### Persona 1: Lucas, 22 anos — "O Streamer"
- **Perfil:** Streamer de Twitch/YouTube com 500-5k viewers. Joga jogos sociais com chat (Gartic, Skribbl, GeoGuessr).
- **Motivação:** Precisa de jogos interativos onde o chat participe. WTS é perfeito para "o chat tenta adivinhar comigo".
- **Comportamento:** Joga em calls no Discord com amigos, faz lives semanais de jogos casuais. Compartilha clips de momentos engraçados.
- **O que busca:** Diversão rápida, setup zero, interface bonita para stream.

### Persona 2: Mariana, 28 anos — "A Casual Musical"
- **Perfil:** Trabalha em escritório, ouve música o dia todo no Spotify. Gosta de quizzes e jogos casuais no celular.
- **Motivação:** Quer testar seu conhecimento musical de forma divertida. O modo diário se encaixa na rotina (joga no almoço/transporte).
- **Comportamento:** Compartilha resultados no Instagram Stories. Joga Wordle/Connections diariamente. Entra em salas multiplayer quando amigos chamam.
- **O que busca:** Sessões curtas, acessível no celular, sensação de "eu sabia essa!".

### Persona 3: Pedro, 35 anos — "O Nostálgico"
- **Perfil:** Cresceu assistindo "Qual é a Música?", tem conhecimento musical amplo (rock, MPB, pop anos 80/90).
- **Motivação:** Nostalgia + competição. Quer provar que conhece mais músicas que os amigos.
- **Comportamento:** Joga em grupo no final de semana, organiza "noites de quiz" com amigos. Prefere desktop.
- **O que busca:** Variedade de gêneros, dificuldade que desafie, ranking entre amigos.

### Persona 4: Ana, 17 anos — "A Gen-Z Gamer"
- **Perfil:** Joga tudo no celular, vive no Discord, consome conteúdo de streamers.
- **Motivação:** Acompanhar trends. Se o jogo viralizar no TikTok, ela vai jogar.
- **Comportamento:** Instala PWAs pelo navegador, joga durante aulas/intervalo. Compartilha tudo em stories/TikTok.
- **O que busca:** Interface bonita, onboarding rápido, cosmetics legais, competição.

## Princípios Inegociáveis

1. **Zero fricção para jogar** — Não precisa de conta para entrar numa sala. Cadastro só para salvar progresso/ranking.
2. **Mobile-first** — 70%+ do tráfego será mobile. Toda decisão de UI parte do mobile.
3. **100% jogável de graça** — Monetização via cosmetics e premium, nunca pay-to-win.
4. **Tempo real de verdade** — Latência < 200ms para eventos de jogo. O "primeiro a acertar" precisa ser justo.
5. **Compartilhável** — Resultados do Daily Sound geram cards/grids viralizáveis.
6. **MIDI é identidade** — O timbre MIDI não é limitação, é feature. O visual e branding abraçam o aspecto retrô/sintético.

## Fases do Produto (Roadmap Macro)

### Fase 1 — MVP (Semanas 1-6)
- Setup do projeto e infraestrutura
- Catálogo de 100 músicas MIDI organizadas por categoria
- Engine de reprodução MIDI com revelação progressiva (Tone.js)
- Modo Multiplayer: salas, chat, pontuação decrescente, 4 fases de revelação
- Modo Solo Diário: 1 música/dia, resultado compartilhável
- Auth básico (Google + Discord via Supabase)
- PWA instalável com service worker básico
- Deploy funcional (Vercel + Railway)

### Fase 2 — Polimento (Semanas 7-10)
- Ranking global e entre amigos
- Sistema de perfil com estatísticas (acertos, streaks, gêneros favoritos)
- Mascote animado ("Sound Bot") com expressões reativas
- Visualizador de áudio/piano roll
- Notificações push para Daily Sound
- Categorias temáticas rotativas no modo diário
- Melhorias de performance e acessibilidade

### Fase 3 — Monetização & Growth (Semanas 11-14)
- WTS Premium (remove ads, temas de sala, avatares exclusivos)
- Cosmetics: avatares, efeitos de celebração, títulos/badges
- Ads intersticiais não-intrusivos entre rodadas
- Sistema de convites e referral
- Integração com Twitch/Discord para streamers
- Expansão do catálogo MIDI (200+ músicas)

### Fase 4 — Expansão (Semanas 15+)
- Battle pass sazonal
- Salas customizadas com playlists próprias (premium)
- API para bots de Twitch/Discord
- Modo "Torneio" com brackets
- Suporte a MIDI upload pela comunidade (curadoria moderada)
- Localização (EN, ES, PT-BR)

## Contexto de Negócio

### Mercado
- Heardle (descontinuado em 2023) provou demanda massiva — milhões de jogadores diários
- Gartic tem 10M+ users mensais, validando o modelo multiplayer casual social
- Nicho de "music guessing" está sem líder claro desde o shutdown do Heardle
- Público brasileiro é enorme para jogos casuais sociais (Gartic é brasileiro!)

### Diferencial Competitivo
- **MIDI** elimina problemas de licenciamento que mataram o Heardle
- **Multiplayer síncrono** inexistente nos concorrentes atuais (SongTrivia, Mukiz)
- **Revelação em camadas** (não apenas "mais segundos") cria experiência única
- **Estética retrô/synthwave** é um nicho visual pouco explorado em jogos casuais

### Monetização (Projeção)
- **Curto prazo:** Ads intersticiais (AdMob/Google Ads) — receita por impressão
- **Médio prazo:** WTS Premium (R$9,90/mês ou R$49,90/ano) — meta: 3-5% de conversão
- **Longo prazo:** Cosmetics + Battle Pass sazonal — ticket médio R$15-25/temporada

## Métricas de Sucesso

### MVP (Fase 1)
- [ ] 1000+ jogadores únicos na primeira semana
- [ ] Média de 3+ rodadas por sessão multiplayer
- [ ] 50%+ dos jogadores do Daily Sound retornam no dia seguinte
- [ ] Tempo de carregamento < 3s no 4G
- [ ] Zero crashes durante gameplay

### Crescimento (Fases 2-3)
- [ ] 10k+ DAU (Daily Active Users)
- [ ] 15%+ dos jogadores diários compartilham resultado
- [ ] 3%+ conversão para Premium
- [ ] NPS > 40
- [ ] Presença em pelo menos 5 streams com 1k+ viewers
