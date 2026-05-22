# v1.0.0 — Checklists de Testes e Deploy

---

## 1. Testes Manuais Pré-Deploy

> Executar localmente (`pnpm dev`) antes de qualquer deploy. Duração: ~45 min.

### 1.1 Gates automáticos

```bash
pnpm lint          # 0 erros, 0 warnings
pnpm type-check    # 4/4 verdes
pnpm build         # 3/3 verdes
pnpm --filter @wts/web run docs:check  # 11/11 OK
```

- [ ] Todos os 4 gates passam sem erros

### 1.2 Auth (5 min)

- [ ] `/pt-BR/login` — página carrega, botões Google e Discord visíveis
- [ ] Login Google — redireciona para consent → callback → home logado
- [ ] Login Discord — mesmo fluxo
- [ ] Guest mode — digitar nickname → "Jogar como convidado" → badge "Convidado" no header
- [ ] Logout — `/pt-BR/profile` → "Sair" → redireciona para home, sessão limpa
- [ ] Sessão persiste após reload (OAuth via cookie, guest via localStorage)

### 1.3 Perfil (3 min)

- [ ] `/pt-BR/profile` logado — avatar, nickname, stats, XP card
- [ ] Editar nickname — digitar → debounce → "Disponível" → Save → toast
- [ ] Nickname duplicado — mostra "já está em uso"
- [ ] Guest visitando `/profile` — mostra GuestEmptyState

### 1.4 Multiplayer (10 min)

- [ ] `/pt-BR/rooms` — página carrega, input de código + botão "Criar Sala"
- [ ] Criar sala — dialog abre, configurar, criar → redireciona para `/room/[code]`
- [ ] Entrar por código — digitar código de 5 chars → entra na sala
- [ ] Lobby — lista de jogadores, código da sala, botão "Iniciar" para host
- [ ] Jogo completo (2 abas) — iniciar → 5 rodadas → fases → palpites → pontuação → resultado
- [ ] Chat — mensagens aparecem, feedback de palpite (quente/frio), bot messages em cyan
- [ ] Timer — barra de progresso, mudança de cor (cyan → yellow → red)
- [ ] Resultado — pódio animado, ranking final, stats, botão compartilhar
- [ ] Play Again — host inicia novo jogo
- [ ] Reconexão — fechar aba e reabrir → reconecta na sala

### 1.5 Daily Sound (5 min)

- [ ] `/pt-BR/daily` — carrega com categoria do dia, botão "Começar"
- [ ] Fluxo completo — ouvir → palpitar → acertar/errar por fase → resultado
- [ ] Resultado — card com grid de fases, XP ganho, botão compartilhar
- [ ] Share — texto emoji gerado, clipboard funciona
- [ ] Não permite jogar novamente no mesmo dia
- [ ] `/pt-BR/daily/history` — calendário renderiza (logado)

### 1.6 XP System (3 min)

- [ ] Acertar rodada multiplayer → "+X XP" no resultado
- [ ] Acertar daily → XP ganho no resultado
- [ ] Guest → banner "Você teria ganho +X XP" no daily result
- [ ] Perfil — XP card com nível, barra de progresso, eventos recentes
- [ ] Level up — modal animado ao cruzar threshold

### 1.7 Admin Panel (3 min)

- [ ] Non-admin: `/admin/catalog` → 404
- [ ] Admin (via `ALLOW_ADMIN_WITHOUT_ROLE=true` local): tabela carrega
- [ ] Filtros (categoria, dificuldade, busca) funcionam
- [ ] Ativar/desativar música funciona
- [ ] `/admin/catalog/new` — wizard de 5 passos carrega
- [ ] `/admin/docs` — portal carrega, sidebar navega, search funciona

### 1.8 PWA (3 min)

- [ ] Lighthouse PWA score >= 90 (rodar em `pnpm build && pnpm start`)
- [ ] Manifest válido (DevTools → Application → Manifest)
- [ ] Service worker registrado (DevTools → Application → Service Workers)
- [ ] Offline — desligar rede → navegar → /offline page aparece
- [ ] Ícones PWA corretos (72-512px)

### 1.9 i18n (2 min)

- [ ] `/pt-BR/` — textos em português
- [ ] Clicar "EN" no switcher → `/en/` — textos em inglês
- [ ] Cookie NEXT_LOCALE persiste entre reloads
- [ ] Todas as páginas têm tradução (sem keys vazias)

### 1.10 Responsividade (3 min)

- [ ] Home — mobile (375px) e desktop (1440px)
- [ ] Game board — mobile (single column + drawer) e desktop (3 columns)
- [ ] Daily — mobile e desktop
- [ ] Admin catalog — tabela scroll horizontal em mobile

### 1.11 SEO & Meta (2 min)

- [ ] `<title>` e `<meta description>` em todas as páginas
- [ ] OG images — `/api/og/daily/1` renderiza (1200x630)
- [ ] OG images — `/api/og/room/ABCDE` renderiza
- [ ] `/sitemap.xml` — lista rotas
- [ ] `/robots.txt` — permite crawling

---

## 2. Checklist de Deploy

> Executar na ordem. Cada item tem pré-requisito no anterior.

### 2.1 Supabase (já configurado)

- [ ] Projeto existe na região `sa-east-1`
- [ ] 8+ migrations aplicadas (`supabase migration list` — todas alinhadas)
- [ ] Providers OAuth (Google + Discord) configurados no dashboard
- [ ] Storage bucket `midis` existe (público)
- [ ] RLS ativo em todas as tabelas

### 2.2 Backend — Railway

- [ ] Criar projeto no Railway (ou conectar repo GitHub)
- [ ] Configurar variáveis de ambiente:
  - `NODE_ENV=production`
  - `PORT=3001`
  - `HOST=0.0.0.0`
  - `LOG_LEVEL=info`
  - `SUPABASE_URL=https://xxx.supabase.co`
  - `SUPABASE_SECRET_KEY=sb_secret_...`
  - `DATABASE_URL=postgresql://...`
  - `DAILY_SEED=<string aleatória 8+ chars>`
  - `CORS_ORIGINS=https://SEU-DOMINIO.vercel.app` (atualizar depois com domínio final)
- [ ] Deploy — verificar que build passa e app sobe
- [ ] Testar: `curl https://SEU-APP.up.railway.app/health` → `{"status":"ok"}`
- [ ] Testar: `curl https://SEU-APP.up.railway.app/rooms` → `[]`
- [ ] Anotar URL do Railway para configurar no frontend

### 2.3 Frontend — Vercel

- [ ] Importar repo GitHub no Vercel
- [ ] Configurar:
  - Framework: Next.js
  - Root directory: `apps/web`
  - Build command: `cd ../.. && pnpm build --filter @wts/web`
  - Install command: `cd ../.. && pnpm install --frozen-lockfile`
  - Output directory: `.next`
- [ ] Configurar variáveis de ambiente:
  - `NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`
  - `NEXT_PUBLIC_SERVER_URL=https://SEU-APP.up.railway.app` (URL do Railway)
  - `NEXT_PUBLIC_APP_URL=https://SEU-DOMINIO.vercel.app`
- [ ] Deploy — verificar que build passa
- [ ] Testar: abrir URL do Vercel → home renderiza

### 2.4 Domínio customizado (opcional)

- [ ] Adicionar domínio no Vercel (Settings → Domains)
- [ ] Configurar DNS (CNAME para `cname.vercel-dns.com` ou A record)
- [ ] SSL automático via Vercel (aguardar propagação)
- [ ] Atualizar `NEXT_PUBLIC_APP_URL` no Vercel com o domínio final
- [ ] Atualizar `CORS_ORIGINS` no Railway com o domínio final

### 2.5 OAuth — Atualizar redirect URLs

- [ ] **Google Cloud Console:**
  - Authorized redirect URIs: `https://xxx.supabase.co/auth/v1/callback`
  - Authorized JavaScript origins: `https://SEU-DOMINIO`
- [ ] **Discord Developer Portal:**
  - Redirects: `https://xxx.supabase.co/auth/v1/callback`
- [ ] **Supabase Dashboard:**
  - Authentication → URL Configuration → Site URL: `https://SEU-DOMINIO`
  - Redirect URLs: `https://SEU-DOMINIO/**`

### 2.6 Admin + Seed

- [ ] Login OAuth no site em produção (criar sua conta)
- [ ] No Supabase SQL Editor:
  ```sql
  UPDATE public.users SET role = 'admin' WHERE email = 'SEU-EMAIL';
  ```
- [ ] Popular catálogo de MIDIs: o seed automatizado (`pnpm seed:midis`) é roadmap pós-MVP, então uploads são feitos pelo admin panel:
  - `/admin/catalog/new` — formulário multi-step (upload → metadata → respostas → review)
  - Alvo MVP: 30-50 músicas validadas com licença (composição original, domínio público ou licença individual). Curadoria documentada em `specs/features/06-midi-catalog.md`.
- [ ] Verificar: `/admin/catalog` mostra as músicas

### 2.7 Páginas legais

- [ ] Atualizar email `contato@whatsthesound.io` em `/terms` e `/privacy` para email real
  - Arquivo: `apps/web/messages/pt-BR.json` e `en.json`, seções `legal.terms` e `legal.privacy`

---

## 3. Testes em Produção

> Executar após deploy completo. Duração: ~20 min.

### 3.1 Funcionalidade básica

- [ ] Home carrega em `https://SEU-DOMINIO/pt-BR/`
- [ ] Home carrega em `https://SEU-DOMINIO/en/`
- [ ] `/` redireciona para `/pt-BR/` (ou locale do browser)
- [ ] Footer — links Terms e Privacy funcionam
- [ ] Locale switcher funciona (PT ↔ EN)

### 3.2 Auth em produção

- [ ] Login Google — fluxo completo funciona com callback de produção
- [ ] Login Discord — fluxo completo funciona
- [ ] Guest mode — funciona sem login
- [ ] Perfil — dados corretos após login
- [ ] Logout — limpa sessão

### 3.3 WebSocket em produção

- [ ] Criar sala multiplayer → sala criada com código
- [ ] Segundo jogador entra via código → ambos veem um ao outro
- [ ] Jogar partida completa → pontuação calculada, resultado exibido
- [ ] Chat funciona em tempo real

### 3.4 Daily Sound em produção

- [ ] `/daily` carrega — mesma música para todos
- [ ] Jogar completo → resultado com XP
- [ ] Compartilhar → texto emoji correto

### 3.5 PWA em produção

- [ ] Lighthouse: Performance >= 80
- [ ] Lighthouse: PWA >= 90
- [ ] Lighthouse: SEO >= 90
- [ ] Lighthouse: Accessibility >= 80
- [ ] Instalar PWA (mobile Chrome → "Add to Home Screen")
- [ ] Abrir PWA instalada → funciona standalone

### 3.6 Mobile

- [ ] Chrome Android — home, daily, rooms, game
- [ ] Safari iOS — home, daily, rooms (Tone.js autoplay gate funciona)

### 3.7 OG Images

- [ ] Compartilhar link do daily em WhatsApp/Twitter → OG image aparece
- [ ] Compartilhar link de sala → OG image aparece

### 3.8 Admin em produção

- [ ] `/admin/catalog` — acessível como admin, 404 para outros
- [ ] `/admin/docs` — portal acessível como admin
- [ ] Upload de MIDI funciona em produção

### 3.9 Performance

- [ ] Tempo de carregamento da home < 3s (3G simulado)
- [ ] WebSocket latência < 200ms
- [ ] Audio playback inicia em < 500ms após click

---

## Resultado Final

Após todos os checks passarem:

- [ ] **v1.0.0 está em produção**
- [ ] Domínio configurado e acessível
- [ ] OAuth funciona com URLs de produção
- [ ] PWA instalável
- [ ] Multiplayer e Daily Sound funcionais
- [ ] Admin panel protegido e operacional
