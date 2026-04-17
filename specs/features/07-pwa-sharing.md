# Feature: PWA & Social Sharing

## Fase: 1 — MVP
## Prioridade: P1
## Estimativa: 4 horas
## Depende de: 01-project-setup, 05-daily-sound

## Overview
Configuração completa de PWA (instalável, offline shell, push notifications) e sistema de compartilhamento social para viralização dos resultados do Daily Sound e partidas multiplayer.

## Requisitos Funcionais

### PWA (Progressive Web App)
- **Manifest completo** com ícones em todos os tamanhos (72, 96, 128, 144, 152, 192, 384, 512)
- **Service Worker (Serwist):**
  - Cache de shell (HTML/CSS/JS) para carregamento offline
  - Cache de soundfonts para reprodução MIDI offline
  - Estratégia: Network-first para API calls, Cache-first para assets estáticos
  - Precache das rotas principais: /, /daily, /rooms
- **Instalação:** Banner "Adicionar à tela inicial" após 2ª visita
- **Splash screen:** Logo WTS + fundo dark (#0a0a1a)
- **Orientação:** Portrait (mobile), any (desktop)
- **Status bar:** Tema dark com cor #0a0a1a

### Push Notifications (Fase 2, mas setup na Fase 1)
- Registro do service worker para push
- Permissão pedida de forma contextual (não no primeiro acesso):
  - Após completar o 3º Daily Sound: "Quer receber lembretes diários?"
  - Após criar conta: "Ative notificações para saber quando amigos criarem salas"
- Notificações planejadas:
  - Daily Sound reminder (20h se não jogou)
  - "Seu streak está em risco!" (22h se não jogou)
  - Amigo criou sala (real-time, futuro)

### Social Sharing

#### Resultado do Daily Sound
- Botão "Compartilhar" gera texto formatado (ver spec 05-daily-sound)
- **Web Share API** (mobile): abre menu nativo de compartilhamento
- **Clipboard fallback** (desktop): copia texto e mostra toast "Copiado!"
- **Open Graph meta tags** para `/daily`:
  ```html
  <meta property="og:title" content="What's the Sound? — Daily Sound #47" />
  <meta property="og:description" content="Eu acertei na Fase 2! Você consegue fazer melhor?" />
  <meta property="og:image" content="https://whatsthesound.io/og/daily/47.png" />
  <meta property="og:url" content="https://whatsthesound.io/daily" />
  ```
- **OG Image (estratégia revisada pós-auditoria):**
  - `/daily/[n]`: **pré-gerada** pelo mesmo cron das 03:00 UTC que seleciona o MIDI. Gera a imagem uma vez via `@vercel/og` em ambiente Node, salva em Supabase Storage (`og/daily/{n}.png`), e o `og:image` aponta para essa URL estática. Cache 24h+ sem risco de cold-start.
  - `/room/[code]`: usa **template estático** com overlay de texto leve via Next.js OG runtime (code + categoria). Cold-start aqui é aceitável porque é raro (compartilhamento ad-hoc) e não afeta loops críticos.
  - `/daily/history/[date]` (compartilhamento retroativo): reaproveita a imagem pré-gerada daquele dia.
  - **Meta antiga "< 500ms" só se aplica a imagens já cacheadas.** Cold start de Vercel OG pode chegar a 1-2s — por isso o caminho crítico (daily do dia) é pré-gerado.

#### Resultado do Multiplayer
- Botão "Compartilhar Resultado" no GAME_END
- Texto formatado:
  ```
  🔊 What's the Sound? — Multiplayer
  🏆 1º lugar com 8500 pts!
  🎵 Acertei 8/10 músicas
  
  Jogue comigo: whatsthesound.io
  ```

#### Convite para Sala
- Botão "Copiar Link" no lobby: copia `whatsthesound.io/room/[code]`
- Botão "Compartilhar Sala" via Web Share API

### SEO & Meta Tags
- Title dinâmico por página
- Meta description otimizada
- Canonical URLs
- Schema.org markup (WebApplication + Game)
- sitemap.xml e robots.txt

## Requisitos Não-Funcionais
- Lighthouse PWA score ≥ 90
- Lighthouse SEO score ≥ 90
- OG Image gerada em < 500ms
- Service worker registration em < 1s
- Tamanho do precache < 5MB

## Componentes

### `InstallPrompt`
- Banner discreto no topo: "Instale o WTS para jogar offline!" + botão "Instalar"
- Dismiss salvo no localStorage (não mostra de novo por 7 dias)

### `ShareButton`
- Props: `text: string`, `url?: string`, `variant: 'daily' | 'multiplayer' | 'room'`
- Tenta Web Share API → fallback para clipboard

### `NotificationPermission`
- Modal contextual pedindo permissão para push
- Opções: "Ativar" / "Agora não"

## Telas / Fluxos
- Não tem tela standalone — componentes integrados em outras telas

## Edge Cases
- **Browser não suporta Service Worker:** Jogo funciona normalmente, apenas sem offline/instalação
- **Web Share API não disponível:** Fallback para clipboard silenciosamente
- **Usuário nega notificações:** Respeitar, não pedir de novo por 30 dias
- **OG Image falha:** Usar imagem estática default do WTS

## Decisões de Design
- **Push notifications pedidas contextualmente:** Pedir no primeiro acesso tem taxa de rejeição altíssima. Esperar até o jogador estar engajado (3º Daily Sound) aumenta a taxa de aceitação drasticamente.
- **OG Image dinâmica:** Essencial para viralização — quando alguém compartilha no Twitter/WhatsApp, a preview precisa ser bonita e informativa.
- **Web Share API como prioridade:** No mobile, o menu nativo de compartilhamento é muito superior a botões individuais (Twitter, WhatsApp, etc).
