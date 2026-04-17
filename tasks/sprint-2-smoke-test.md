# Sprint 2 — Smoke Test Checklist

> Executar sequencialmente. Cada seção tem **pré-requisitos**, **passos**, e **resultado esperado**.
> Se algo falhar, anotar em qual passo e qual browser/OS. Não pular passos.

**Duração estimada:** ~45-60 min se tudo passar na primeira; +15-30 min se encontrar bugs.

---

## 0 · Setup prévio (5 min)

### 0.1 Gates locais verdes

Antes de qualquer teste no browser:

```bash
pnpm install
pnpm lint
pnpm type-check
pnpm build
pnpm --filter @wts/web run docs:check
```

- [ ] `lint`: 4/4 passed
- [ ] `type-check`: 4/4 passed
- [ ] `build`: 3/3 passed + 19 rotas geradas
- [ ] `docs:check`: "11 files OK"

**Se qualquer um falhar, parar aqui.** Capturar saída e investigar antes de seguir.

### 0.2 Env vars presentes

Confirmar arquivos locais:

- [ ] `apps/web/.env.local` existe com `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` preenchidos
- [ ] `apps/server/.env.local` existe com `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `DATABASE_URL` preenchidos
- [ ] Opcional para testar o portal sem role de admin: `ALLOW_ADMIN_WITHOUT_ROLE=true` no `apps/web/.env.local`

### 0.3 Dev server up

```bash
pnpm dev
```

- [ ] Web sobe em `http://localhost:3000` (Next.js)
- [ ] Server sobe em `http://localhost:3001` (Fastify)
- [ ] Nenhum erro de env validation no console

### 0.4 Smoke do DB

```bash
pnpm --filter @wts/server smoke:db
```

- [ ] 6/6 verdes (users, midi_catalog, xp_events, daily_schedule, storage, auth admin)

---

## 1 · Homepage + i18n (2 min)

### 1.1 Acesso e redirect

- [ ] Abrir `http://localhost:3000/` → redireciona pra `/pt-BR/` ou `/en/` (detecção de Accept-Language)
- [ ] Header mostra **"Sign in"** (secondary button, canto direito)
- [ ] Tagline "Ouça. Adivinhe. Repita." (pt-BR) ou "Listen. Guess. Repeat." (en) visível
- [ ] 3 cards com ícones (Headphones, Trophy, Sparkles)
- [ ] Footer: links "Termos de Uso" e "Privacidade" + switcher PT/EN

### 1.2 Switcher de locale

- [ ] Clicar **EN** no switcher → URL vira `/en/...`, textos viram inglês
- [ ] Cookie `NEXT_LOCALE=en` setado (DevTools → Application → Cookies)
- [ ] Clicar **PT** → volta pra pt-BR
- [ ] Abrir **`/en/terms`** → página de Terms of Use em inglês renderiza
- [ ] Abrir **`/pt-BR/privacy`** → LGPD-compliant, 10 seções

---

## 2 · Auth — TASK-007 (10 min)

### 2.1 Guest mode

- [ ] Limpar localStorage: DevTools → Application → Local Storage → "Clear"
- [ ] Recarregar `/pt-BR/` — header mostra **"Sign in"**
- [ ] Clicar **"Sign in"** → vai pra `/pt-BR/login`
- [ ] Página mostra: heading "Entre para jogar" + 2 botões OAuth + divider "ou" + input de nickname + botão "Jogar como convidado"
- [ ] Digitar `ab` no input → helper vira vermelho: "Nickname inválido. Use 3-20 caracteres..."
- [ ] Clicar "Jogar como convidado" com `ab` → bloqueia, mantém mensagem de erro
- [ ] Limpar, digitar `TestUser123` → helper volta pra neutro
- [ ] Clicar "Jogar como convidado" → redireciona pra `/pt-BR/`
- [ ] DevTools → Application → Local Storage → checar `wts_guest_id` (uuid) e `wts_guest_nickname` (`TestUser123`)
- [ ] Header agora mostra badge "Guest · TestUser123" + botão "Entrar" (ghost)
- [ ] Banner fino no topo: "Crie uma conta para salvar seu progresso. Entrar"

### 2.2 OAuth Google

- [ ] Logout do guest: limpar localStorage, recarregar
- [ ] `/pt-BR/login` → clicar **"Entrar com Google"**
- [ ] Redireciona para consent screen do Google
- [ ] Completar login → volta pra `/pt-BR/` **logado**
- [ ] Header agora mostra avatar + nickname (vindo de `handle_new_user` trigger)
- [ ] Dev Tools → Network → filtrar por `/auth/callback` → deve ter retornado 307 redirect pra `/`
- [ ] SQL no Supabase: `SELECT id, email, nickname FROM public.users ORDER BY created_at DESC LIMIT 1;` → vê sua row nova
- [ ] **Recarregar** a página → continua logado (cookie persistiu)

### 2.3 OAuth Discord

- [ ] Signout: clicar no avatar → vai pra `/profile` → botão "Sair" (próximo passo faz esse fluxo completo, skip aqui)
- [ ] Ou: limpar cookies manualmente via DevTools
- [ ] `/pt-BR/login` → clicar **"Entrar com Discord"**
- [ ] Fluxo OAuth completo, volta logado
- [ ] SQL: mesma query retorna user com mesmo email (Supabase linka OAuth providers por email) OU nova row se email diferente

### 2.4 Error de callback

Simular erro OAuth: abrir diretamente `/auth/callback` (sem `?code=...`):

- [ ] Navegar para `http://localhost:3000/auth/callback` diretamente
- [ ] Redireciona pra `/login?error=missing_code`
- [ ] Banner vermelho aparece no topo da página de login com mensagem de erro

---

## 3 · Profile — TASK-008 (8 min)

### 3.1 Exibição (user logado)

Continue logado com a conta do Google.

- [ ] Clicar no avatar no header → vai pra `/pt-BR/profile`
- [ ] Avatar grande + nickname atual + "Membro desde {mês YYYY}"
- [ ] Grid com 8 stats (Level 1, XP 0, Partidas 0, Vitórias 0, Acertos 0, Daily streak 0, Maior streak 0, Pontos 0)
- [ ] Botão "Sair" no topo direito

### 3.2 Editar nickname — happy path

- [ ] Limpar input nickname, digitar `EuNovoNick`
- [ ] Helper mostra "Verificando..." (text-muted) durante ~500ms
- [ ] Helper vira verde com "Disponível"
- [ ] Botão "Salvar" fica enabled (primary cyan)
- [ ] Botão "Cancelar" aparece do lado
- [ ] Clicar **Salvar** → toast verde "Nickname atualizado." no canto inferior
- [ ] Helper volta para "Esse é seu nickname atual." (muted)
- [ ] Header atualiza para o novo nickname (via `router.refresh`)
- [ ] SQL: `SELECT nickname FROM public.users WHERE id = auth.uid();` (no SQL Editor do Supabase) → retorna o novo nickname

### 3.3 Editar nickname — casos de erro

- [ ] Digitar `ab` (muito curto) → helper vermelho "Use 3-20 caracteres..."
- [ ] Digitar `admin` → helper vermelho "Esse nickname não é permitido." (profanity filter)
- [ ] Digitar `EuNovoNick` (o que você acabou de salvar) → helper cinza "Esse é seu nickname atual."
- [ ] Abrir uma aba anônima / outro browser, logar em outra conta, setar um nickname (ex. `OcupadoName`)
- [ ] Voltar na primeira sessão, tentar `OcupadoName` → helper vermelho "Esse nickname já está em uso." (uniqueness check)
- [ ] Clicar **Cancelar** → value volta pro seu nickname committed

### 3.4 Logout

- [ ] Clicar **Sair** → toast "Sessão encerrada.", redireciona pra `/`
- [ ] Header mostra "Sign in" (deslogado)
- [ ] Recarregar `/pt-BR/profile` diretamente → renderiza **GuestEmptyState** (title "Entre para acessar seu perfil" + CTAs)

---

## 4 · MIDI Audio Engine — TASK-005 + TASK-006 (10 min)

### 4.1 Overlay de Safari autoplay

- [ ] Abrir `/pt-BR/dev/audio`
- [ ] Overlay fullscreen aparece: "Toque para começar" + ícone headphones
- [ ] Clicar no overlay → overlay some, a página aparece
- [ ] DevTools → Console → sem erros de AudioContext

### 4.2 Carregar melodia de teste

- [ ] Clicar **"Carregar melodia de teste (C major)"**
- [ ] Info aparece: "BPM 120 · 8.0s · 2 tracks"
- [ ] Lista mostra **Track #0 Melody** (13 notes) e **Track #1 Bass** (8 notes)
- [ ] 4 botões de fase visíveis

### 4.3 Playback por fase

- [ ] Clicar **Fase 1** → toca 4 primeiros beats só da melodia (~2s)
- [ ] Barra de progresso vai de 0% a 100%
- [ ] AudioVisualizer reage: barras ficam maiores/menores acompanhando o áudio (cyan → magenta gradient)
- [ ] Ao terminar: botão "Parar" fica desabilitado
- [ ] Clicar **Fase 2** → 8 beats de melodia (~4s)
- [ ] Clicar **Fase 4** → música completa com melodia + bass (~4s)
- [ ] Áudio das duas tracks é audível simultaneamente

### 4.4 Controles

- [ ] Clicar **Fase 4** → durante o playback clicar **Parar**
- [ ] Áudio interrompe imediatamente, barra congela
- [ ] Clicar **Repetir** → reproduz a Fase 4 de novo do início

### 4.5 Visualizer — idle vs playing

- [ ] Sem playback: barras são baixas e mutadas (cor cinza-escuro uniforme)
- [ ] Durante playback: barras pulsam com cores cyan→magenta
- [ ] **Trocar de aba** do browser → voltar → animação pausou enquanto estava hidden, retoma quando volta (Page Visibility)

### 4.6 Cross-browser

Repetir 4.1-4.3 em:

- [ ] Chrome Desktop
- [ ] Firefox Desktop (verificar que PolySynth soa igual)
- [ ] **Safari Desktop** se disponível (autoplay gate deve funcionar)
- [ ] **Chrome Android** (mobile — `pnpm dev -- --host 0.0.0.0` ou ngrok; testar via IP local)
- [ ] **Safari iOS** (mobile) — *este é o teste mais importante:* overlay DEVE aparecer e autoplay DEVE ser bloqueado até o tap

Se algum falhar, anotar: OS + browser + o que acontece.

---

## 5 · Error Handling — TASK-025 (5 min)

### 5.1 404

- [ ] Abrir `/pt-BR/rota-inexistente`
- [ ] Custom 404 page renderiza: "404" + "Página não encontrada" + botão "Ir para a home"
- [ ] Clicar **Ir para a home** → vai pra `/pt-BR/`

### 5.2 Error boundary (route-level)

Forçar um erro numa page. Teste mais simples:

- [ ] Editar `apps/web/src/app/[locale]/page.tsx` e adicionar `throw new Error('smoke test');` dentro do `HomeContent()` antes do return
- [ ] Salvar → hot reload dispara → `/pt-BR/` mostra fallback: ícone AlertTriangle vermelho + "Algo deu errado" + botão "Tentar novamente" + "Ir para a home"
- [ ] Clicar **Tentar novamente** → ainda erro (porque o código ainda tem throw)
- [ ] **Remover** o throw, salvar → hot reload → home volta ao normal
- [ ] Console do browser deve ter logado `Route error: Error: smoke test`

### 5.3 Error boundary (component-level)

- [ ] Editar `apps/web/src/components/audio/audio-visualizer.tsx`, adicionar `throw new Error('smoke viz');` logo após `if (!ctx) return;`
- [ ] Abrir `/pt-BR/dev/audio`, tap overlay, carregar melodia de teste, clicar qualquer fase
- [ ] Visualizer exibe banner vermelho inline: "Este componente falhou. Tente recarregar a página." + botão "Tentar de novo"
- [ ] **Resto da página continua funcional** (info do MIDI, botões de fase, progress bar) — a falha ficou isolada
- [ ] **Remover** o throw, salvar

### 5.4 Backend error handler

Com o server rodando (`pnpm dev` já sobe), testar via curl:

```bash
curl -i http://localhost:3001/rota-inexistente
```

- [ ] Response 404
- [ ] Body JSON: `{"error":{"code":"NOT_FOUND","message":"Route GET /rota-inexistente not found"}}`
- [ ] Console do server mostra log warn

Testar health endpoint pra contraste:

```bash
curl -i http://localhost:3001/health
```

- [ ] Response 200 OK

---

## 6 · Dev Docs Portal — TASK-029 (8 min)

### 6.1 Admin gate (sem role)

Com `ALLOW_ADMIN_WITHOUT_ROLE=false` ou ausente no `.env.local`:

- [ ] Deslogar qualquer sessão ativa
- [ ] Abrir `/pt-BR/admin/docs` → **404** (não revela a rota)
- [ ] Logar numa conta que **não é admin** (ex. sua conta Google recém-criada)
- [ ] Abrir `/pt-BR/admin/docs` → ainda **404**

### 6.2 Unlock local (flag dev)

- [ ] Adicionar `ALLOW_ADMIN_WITHOUT_ROLE=true` no `apps/web/.env.local`
- [ ] **Reiniciar** `pnpm dev` (env só lê no boot)
- [ ] Abrir `/pt-BR/admin/docs` → portal renderiza!
- [ ] Home mostra heading "What's the Sound? — Dev Docs", links pra Setup / Arch / Conventions / etc
- [ ] Footer com "Última atualização: TASK-029 — 2026-04-17"

### 6.3 Navegação pela sidebar

- [ ] Sidebar à esquerda mostra: Visão geral, Setup local, Arquitetura (+3 sub-items), Convenções, i18n, Troubleshooting, Progresso, Runbooks (+1)
- [ ] Clicar **Setup local** → renderiza `setup.mdx`, active state cyan no sidebar
- [ ] Clicar **Arquitetura → Database** → renderiza com tabela de 8 migrations
- [ ] Clicar **Progresso** → lista de Sprint 1 (8 tasks) e Sprint 2 (6 tasks)
- [ ] Clicar **Runbooks → Supabase — Primeiro admin** → instruções SQL

### 6.4 Search

- [ ] Digitar `midi` na search box → sidebar mostra até 8 resultados (Audio Engine, Progresso etc)
- [ ] Clicar num resultado → navega + limpa query
- [ ] Digitar `xxxzzz` (nada deve matchar) → "Nenhum resultado."
- [ ] Apagar tudo → resultados somem, sidebar volta a ser só a nav

### 6.5 Locale

- [ ] Com `/pt-BR/admin/docs` aberto, mudar URL pra `/en/admin/docs`
- [ ] Sidebar labels viram "Overview", "Local setup", "Architecture", etc (chrome traduzida)
- [ ] Conteúdo MDX fica como escrito (PT-BR no source; esperado — docs internas são bilíngues)

### 6.6 Criar primeiro admin real (opcional, recomendado)

Pra não depender da flag dev:

- [ ] Remover (ou mudar pra `false`) `ALLOW_ADMIN_WITHOUT_ROLE` no `.env.local`
- [ ] Abrir Supabase Dashboard → SQL Editor → New query
- [ ] Executar:
  ```sql
  UPDATE public.users
  SET role = 'admin'
  WHERE nickname = 'SEU_NICKNAME_AQUI'
  RETURNING id, nickname, role;
  ```
- [ ] Response confirma `role = 'admin'`
- [ ] Reiniciar `pnpm dev`
- [ ] Logar com a conta que virou admin
- [ ] Abrir `/pt-BR/admin/docs` → renderiza (via role check, sem flag)
- [ ] Logar numa conta diferente (player) → mesma URL retorna 404

---

## 7 · Regressões quick (5 min)

Depois de tudo, confirmar que TASK anteriores continuam funcionando:

- [ ] `/pt-BR/terms` e `/pt-BR/privacy` renderizam (TASK-028)
- [ ] Lighthouse no `/pt-BR/` → PWA score ≥ 90 (TASK-004). DevTools → Lighthouse → PWA only
- [ ] Chrome → DevTools → Application → Manifest — manifest válido, ícones carregam
- [ ] Chrome Android: menu → "Adicionar à tela inicial" — ícone WTS aparece
- [ ] `fetch('http://localhost:3001/health')` do console do browser em `/` → `{ status: 'ok' }` (CORS habilitado)

---

## 8 · Browser matrix final

Repetir flows-chave em cada browser listado. Marcar X se falhou e anotar em qual passo.

| Browser | 1 Home | 2 Auth | 3 Profile | 4 Audio | 5 Errors | 6 Docs |
|---------|--------|--------|-----------|---------|----------|--------|
| Chrome Desktop | | | | | | |
| Firefox Desktop | | | | | | |
| Safari Desktop | | | | | | |
| Chrome Android | | | | | | |
| Safari iOS | | | | | | |

**Prioridade**: Chrome Desktop + Safari iOS. Os outros podem ficar pra TASK-022 QA pass.

---

## Reporting

Se encontrar bug:

1. Anotar: seção + passo + browser + OS
2. Screenshot / print do console (F12)
3. Steps to reproduce minimal
4. Criar entry em `tasks/backlog.md` na Sprint 3 seção adicional, marca TASK-BUG-XXX
5. Severidade:
   - **Blocker**: audio não toca, auth quebra, admin gate vaza
   - **Major**: visualizer janky, locale switcher falha, logout não limpa
   - **Minor**: typo, cor levemente errada, helper text ambíguo

---

## Resultado esperado geral

Se tudo passar:

- Sprint 2 ready pra merge em main
- Base pra Sprint 3 (Socket.io + multiplayer core) está sólida
- Auth, áudio, perfil, error boundaries e dev docs portal funcionais ponta-a-ponta
