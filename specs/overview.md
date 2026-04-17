# What's the Sound? — Product Overview

## O que é

**What's the Sound?** (WTS) é um jogo PWA multiplayer de adivinhação musical onde jogadores escutam trechos progressivos de músicas em formato MIDI e competem para adivinhar o nome da música e/ou artista o mais rápido possível. Inspirado na dinâmica social do Gartic e na nostalgia do quadro "Qual é a Música?" do Silvio Santos, o jogo combina competição em tempo real, revelação progressiva de áudio e um sistema de chat interativo com feedback inteligente.

## Problema que resolve

Jogos de adivinhação musical existentes (Heardle, SongTrivia) dependem de trechos de áudio licenciado, o que cria problemas de copyright, custos de API e shutdown (Heardle foi descontinuado pelo Spotify). Além disso, a maioria desses jogos é single-player ou assíncrono — falta a energia do multiplayer em tempo real que torna o Gartic tão viciante. WTS resolve o problema do multiplayer síncrono e **reduz** (não elimina totalmente) o risco de copyright ao usar MIDI ao invés de áudio gravado.

> **⚠️ Nota legal sobre MIDI e copyright.** MIDI de música protegida continua sendo obra derivada e está sujeita a copyright da composição (mesmo sem direitos conexos da gravação). Cada arquivo do catálogo precisa ser: **(a)** composição original feita para o projeto, **(b)** obra em domínio público ou licenciada sob Creative Commons, ou **(c)** individualmente licenciada do detentor dos direitos. O risco é menor que áudio de streaming mas **não é zero** — antes de cada upload, verificar licença. Ver `specs/features/06-midi-catalog.md` para o fluxo de curadoria e sourcing.

## Solução — Pilares Principais

1. **MIDI como fonte sonora** — Áudios MIDI providos manualmente, eliminando dependência de APIs de streaming e reduzindo (ver nota legal acima) exposição de copyright de gravação. O timbre sintético/retrô vira identidade do jogo.
2. **Revelação progressiva em 4 fases** — Cada música é revelada em camadas (notas → melodia → harmonia → completa), criando tensão crescente e momentos "eureka".
3. **Multiplayer competitivo em tempo real** — Salas com código, chat interativo, pontuação decrescente por ordem de acerto (estilo Gartic).
4. **Modo Solo Diário ("Daily Sound")** — Uma música por dia, compartilhável em redes sociais, motor de viralização orgânica.
5. **Chat com feedback inteligente** — Sistema "quente/frio" que dá dicas contextuais sem revelar a resposta, mantendo todos engajados até o final.
6. **XP + Level como recompensa de fidelidade (MVP)** — Jogar como guest é 100% permitido, mas **logar** desbloqueia progressão: acertar rodadas, terminar partidas, jogar o Daily e manter streak acumula XP. Nível (derivado do XP) aparece como badge junto ao nickname (`[Lv.12]`). Sem cosmetics desbloqueáveis no MVP — é progressão visual pura. Ver `specs/features/08-xp-system.md`.

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

1. **Zero fricção para jogar** — Não precisa de conta para entrar numa sala NEM para jogar Daily Sound. Cadastro só para acumular progresso (XP/level/streak/histórico) e aparecer no ranking.
2. **Mobile-first** — 70%+ do tráfego será mobile. Toda decisão de UI parte do mobile.
3. **100% jogável de graça** — Monetização via cosmetics e premium, nunca pay-to-win.
4. **Tempo real de verdade** — Latência < 200ms para eventos de jogo. O "primeiro a acertar" precisa ser justo.
5. **Compartilhável** — Resultados do Daily Sound geram cards/grids viralizáveis.
6. **MIDI é identidade** — O timbre MIDI não é limitação, é feature. O visual e branding abraçam o aspecto retrô/sintético.

## Fases do Produto (Roadmap Macro)

### Fase 1 — MVP (Semanas 1-6)
- Setup do projeto e infraestrutura
- Catálogo inicial de **30-50 músicas MIDI** (meta revisada pós-auditoria; 100 era irrealista para MVP por causa da curadoria/licenciamento manual)
- Engine de reprodução MIDI com revelação progressiva (Tone.js)
- Modo Multiplayer: salas, chat, pontuação decrescente, 4 fases de revelação
- Mensagens de bot ("Sound Bot") no chat — só texto na MVP (animações ficam para Fase 2)
- Modo Solo Diário: 1 música/dia, resultado compartilhável
- Auth básico (Google + Discord via Supabase)
- **XP & Level system** (feature 08): XP por jogar/acertar/streak, level visual como badge `[Lv.X]`, exclusivo para logados (guests ficam com `[Guest]`)
- **Dev Docs Portal** (feature 09): `/admin/docs` gated por role admin, living document dos devs (stack, setup, arquitetura, progresso)
- **Internacionalização pt-BR + en** (feature 10): next-intl com prefixo por locale; detecção via Accept-Language; switcher no footer
- PWA instalável com service worker básico
- Deploy funcional (Vercel + Railway)

### Fase 2 — Polimento (Semanas 7-10)
- Ranking global e entre amigos
- Sistema de perfil com estatísticas (acertos, streaks, gêneros favoritos)
- Animações e expressões reativas do Sound Bot (mensagens de bot já existem desde MVP)
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
- Expansão de idiomas: es-ES, es-MX e outras línguas (pt-BR + en já entram no MVP via feature 10)

## Contexto de Negócio

### Mercado
- Heardle (descontinuado em 2023) provou demanda massiva — milhões de jogadores diários
- Gartic tem 10M+ users mensais, validando o modelo multiplayer casual social
- Nicho de "music guessing" está sem líder claro desde o shutdown do Heardle
- Público brasileiro é enorme para jogos casuais sociais (Gartic é brasileiro!)

### Diferencial Competitivo
- **MIDI** reduz (não elimina — ver nota legal acima) exposição de copyright que matou o Heardle
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
