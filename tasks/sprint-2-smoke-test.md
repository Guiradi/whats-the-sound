# Sprint 2 — Smoke Test Checklist

> Executar sequencialmente. Cada seção tem **pré-requisitos**, **passos**, e **resultado esperado**.
> Se algo falhar, anotar em qual passo e qual browser/OS. Não pular passos.

**Duração estimada:** ~45-60 min se tudo passar na primeira; +15-30 min se encontrar bugs.

**Resultado:** ✅ PASSED (2026-04-17) — Chrome Desktop, todas as seções verdes. Bugs encontrados e corrigidos inline.

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

- [x] `lint`: 4/4 passed
- [x] `type-check`: 4/4 passed
- [x] `build`: 3/3 passed + 19 rotas geradas
- [x] `docs:check`: "11 files OK"

**Se qualquer um falhar, parar aqui.** Capturar saída e investigar antes de seguir.

### 0.2 Env vars presentes

Confirmar arquivos locais:

- [x] `apps/web/.env.local` existe com `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` preenchidos
- [x] `apps/server/.env.local` existe com `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `DATABASE_URL` preenchidos

### 0.3 Dev server up

```bash
pnpm dev
```

- [x] Web sobe em `http://localhost:3000` (Next.js)
- [x] Server sobe em `http://localhost:3001` (Fastify)
- [x] Nenhum erro de env validation no console

### 0.4 Smoke do DB

```bash
pnpm --filter @wts/server smoke:db
```

- [x] 6/6 verdes (users, midi_catalog, xp_events, daily_schedule, storage, auth admin)

---

## 1 · Homepage + i18n (2 min)

### 1.1 Acesso e redirect

- [x] Abrir `http://localhost:3000/` → redireciona pra `/pt-BR/` ou `/en/` (detecção de Accept-Language)
- [x] Header mostra **"Sign in"** (secondary button, canto direito)
- [x] Tagline "Ouça. Adivinhe. Repita." (pt-BR) ou "Listen. Guess. Repeat." (en) visível
- [x] 3 cards com ícones (Headphones, Trophy, Sparkles)
- [x] Footer: links "Termos de Uso" e "Privacidade" + switcher PT/EN

### 1.2 Switcher de locale

- [x] Clicar **EN** no switcher → URL vira `/en/...`, textos viram inglês
- [x] Cookie `NEXT_LOCALE=en` setado (DevTools → Application → Cookies)
- [x] Clicar **PT** → volta pra pt-BR
- [x] Abrir **`/en/terms`** → página de Terms of Use em inglês renderiza
- [x] Abrir **`/pt-BR/privacy`** → LGPD-compliant, 10 seções

---

## 2 · Auth — TASK-007 (10 min)

### 2.1 Guest mode

- [x] Limpar localStorage: DevTools → Application → Local Storage → "Clear"
- [x] Recarregar `/pt-BR/` — header mostra **"Sign in"**
- [x] Clicar **"Sign in"** → vai pra `/pt-BR/login`
- [x] Página mostra: heading "Entre para jogar" + 2 botões OAuth + divider "ou" + input de nickname + botão "Jogar como convidado"
- [x] Digitar `ab` no input → helper vira vermelho: "Nickname inválido. Use 3-20 caracteres..."
- [x] Clicar "Jogar como convidado" com `ab` → bloqueia, mantém mensagem de erro
- [x] Limpar, digitar `TestUser123` → helper volta pra neutro *(bug fix: onChange agora limpa nicknameError)*
- [x] Clicar "Jogar como convidado" → redireciona pra `/pt-BR/`
- [x] DevTools → Application → Local Storage → checar `wts_guest_id` (uuid) e `wts_guest_nickname` (`TestUser123`)
- [x] Header agora mostra badge "Guest · TestUser123" + botão "Entrar" (ghost)
- [x] Banner fino no topo: "Crie uma conta para salvar seu progresso. Entrar"

### 2.2 OAuth Google

- [x] Logout do guest: limpar localStorage, recarregar
- [x] `/pt-BR/login` → clicar **"Entrar com Google"**
- [x] Redireciona para consent screen do Google
- [x] Completar login → volta pra `/pt-BR/` **logado** *(bug fix: trigger sanitiza nickname OAuth + adiciona email)*
- [x] Header agora mostra avatar + nickname (vindo de `handle_new_user` trigger)
- [x] Dev Tools → Network → filtrar por `/auth/callback` → deve ter retornado 307 redirect pra `/`
- [x] SQL no Supabase: `SELECT id, email, nickname FROM public.users ORDER BY created_at DESC LIMIT 1;` → vê sua row nova
- [x] **Recarregar** a página → continua logado (cookie persistiu)

### 2.3 OAuth Discord

- [x] Signout: clicar no avatar → vai pra `/profile` → botão "Sair" (próximo passo faz esse fluxo completo, skip aqui)
- [x] Ou: limpar cookies manualmente via DevTools
- [x] `/pt-BR/login` → clicar **"Entrar com Discord"**
- [x] Fluxo OAuth completo, volta logado
- [x] SQL: mesma query retorna user com mesmo email (Supabase linka OAuth providers por email) OU nova row se email diferente

### 2.4 Error de callback

Simular erro OAuth: abrir diretamente `/auth/callback` (sem `?code=...`):

- [x] Navegar para `http://localhost:3000/auth/callback` diretamente
- [x] Redireciona pra `/login?error=missing_code`
- [x] Banner vermelho aparece no topo da página de login com mensagem de erro

---

## 3 · Profile — TASK-008 (8 min)

### 3.1 Exibição (user logado)

Continue logado com a conta do Google.

- [x] Clicar no avatar no header → vai pra `/pt-BR/profile`
- [x] Avatar grande + nickname atual + "Membro desde {mês YYYY}"
- [x] Grid com 8 stats (Level 1, XP 0, Partidas 0, Vitórias 0, Acertos 0, Daily streak 0, Maior streak 0, Pontos 0)
- [x] Botão "Sair" no topo direito

### 3.2 Editar nickname — happy path

- [x] Limpar input nickname, digitar `EuNovoNick`
- [x] Helper mostra "Verificando..." (text-muted) durante ~500ms
- [x] Helper vira verde com "Disponível"
- [x] Botão "Salvar" fica enabled (primary cyan)
- [x] Botão "Cancelar" aparece do lado
- [x] Clicar **Salvar** → toast verde "Nickname atualizado." no canto inferior
- [x] Helper volta para "Esse é seu nickname atual." (muted)
- [x] Header atualiza para o novo nickname *(bug fix: AuthMenu agora lê de public.users via refreshProfile)*
- [x] SQL: `SELECT nickname FROM public.users ORDER BY updated_at DESC LIMIT 1;` (no SQL Editor do Supabase) → retorna o novo nickname

### 3.3 Editar nickname — casos de erro

- [x] Digitar `ab` (muito curto) → helper vermelho "Use 3-20 caracteres..."
- [x] Digitar `admin` → helper vermelho "Esse nickname não é permitido." (profanity filter)
- [x] Digitar `EuNovoNick` (o que você acabou de salvar) → helper cinza "Esse é seu nickname atual."
- [x] Abrir uma aba anônima / outro browser, logar em outra conta, setar um nickname (ex. `OcupadoName`)
- [x] Voltar na primeira sessão, tentar `OcupadoName` → helper vermelho "Esse nickname já está em uso." (uniqueness check)
- [x] Clicar **Cancelar** → value volta pro seu nickname committed

### 3.4 Logout

- [x] Clicar **Sair** → toast "Sessão encerrada.", redireciona pra `/`
- [x] Header mostra "Sign in" (deslogado)
- [x] Recarregar `/pt-BR/profile` diretamente → renderiza **GuestEmptyState** (title "Entre para acessar seu perfil" + CTAs)

---

## 4 · MIDI Audio Engine — TASK-005 + TASK-006 (10 min)

### 4.1 Overlay de Safari autoplay

- [x] Abrir `/pt-BR/dev/audio`
- [x] Overlay fullscreen aparece: "Toque para começar" + ícone headphones
- [x] Clicar no overlay → overlay some, a página aparece
- [x] DevTools → Console → sem erros de AudioContext

### 4.2 Carregar melodia de teste

- [x] Clicar **"Carregar melodia de teste (C major)"**
- [x] Info aparece: "BPM 120 · 8.0s · 2 tracks"
- [x] Lista mostra **Track #0 Melody** (13 notes) e **Track #1 Bass** (8 notes)
- [x] 4 botões de fase visíveis

### 4.3 Playback por fase

- [x] Clicar **Fase 1** → toca 4 primeiros beats só da melodia (~2s)
- [x] Barra de progresso vai de 0% a 100%
- [x] AudioVisualizer reage: barras ficam maiores/menores acompanhando o áudio (cyan → magenta gradient)
- [x] Ao terminar: botão "Parar" fica desabilitado
- [x] Clicar **Fase 2** → 8 beats de melodia (~4s)
- [x] Clicar **Fase 4** → música completa com melodia + bass (~4s)
- [x] Áudio das duas tracks é audível simultaneamente

### 4.4 Controles

- [x] Clicar **Fase 4** → durante o playback clicar **Parar**
- [x] Áudio interrompe imediatamente, barra congela
- [x] Clicar **Repetir** → reproduz a Fase 4 de novo do início

### 4.5 Visualizer — idle vs playing

- [x] Sem playback: barras são baixas e mutadas (cor cinza-escuro uniforme)
- [x] Durante playback: barras pulsam com cores cyan→magenta
- [x] **Trocar de aba** do browser → voltar → animação pausou enquanto estava hidden, retoma quando volta (Page Visibility)

### 4.6 Cross-browser

Repetir 4.1-4.3 em:

- [x] Chrome Desktop
- [ ] Firefox Desktop (verificar que PolySynth soa igual) — *deferred to TASK-022 QA pass*
- [ ] **Safari Desktop** se disponível — *N/A (Windows)*
- [ ] **Chrome Android** — *deferred to TASK-022 QA pass*
- [ ] **Safari iOS** — *deferred to TASK-022 QA pass*

Se algum falhar, anotar: OS + browser + o que acontece.

---

## 5 · Error Handling — TASK-025 (5 min)

### 5.1 404

- [x] Abrir `/pt-BR/rota-inexistente`
- [x] Custom 404 page renderiza: "404" + "Página não encontrada" + botão "Ir para a home" *(bug fix: adicionado catch-all `[...rest]/page.tsx`)*
- [x] Clicar **Ir para a home** → vai pra `/pt-BR/`

### 5.2 Error boundary (route-level)

Forçar um erro numa page. Teste mais simples:

- [x] Editar `apps/web/src/app/[locale]/page.tsx` e adicionar `throw new Error('smoke test');` dentro do `HomeContent()` antes do return
- [x] Salvar → hot reload dispara → `/pt-BR/` mostra fallback: ícone AlertTriangle vermelho + "Algo deu errado" + botão "Tentar novamente" + "Ir para a home"
- [x] Clicar **Tentar novamente** → ainda erro (porque o código ainda tem throw)
- [x] **Remover** o throw, salvar → hot reload → home volta ao normal
- [x] Console do browser deve ter logado `Route error: Error: smoke test`

### 5.3 Error boundary (component-level)

- [x] Editar `apps/web/src/components/audio/audio-visualizer.tsx`, adicionar `throw new Error('smoke viz');` logo após `if (!ctx) return;`
- [x] Abrir `/pt-BR/dev/audio`, tap overlay, carregar melodia de teste, clicar qualquer fase
- [x] Visualizer exibe banner vermelho inline: "Este componente falhou. Tente recarregar a página." + botão "Tentar de novo"
- [x] **Resto da página continua funcional** (info do MIDI, botões de fase, progress bar) — a falha ficou isolada
- [x] **Remover** o throw, salvar

### 5.4 Backend error handler

Com o server rodando (`pnpm dev` já sobe), testar via curl:

```bash
curl -i http://localhost:3001/rota-inexistente
```

- [x] Response 404
- [x] Body JSON: `{"error":{"code":"NOT_FOUND","message":"Route GET /rota-inexistente not found"}}`
- [x] Console do server mostra log warn

Testar health endpoint pra contraste:

```bash
curl -i http://localhost:3001/health
```

- [x] Response 200 OK

---

## 6 · Dev Docs Portal — TASK-029 (8 min)

### 6.1 Admin gate (sem role)

Com `ALLOW_ADMIN_WITHOUT_ROLE=false` ou ausente no `.env.local`:

- [x] Deslogar qualquer sessão ativa
- [x] Abrir `/pt-BR/admin/docs` → **custom 404** (não revela a rota) *(bug fix: middleware rewrite para `/{locale}/__not-found`)*
- [x] Logar numa conta que **não é admin** (ex. sua conta Google recém-criada)
- [x] Abrir `/pt-BR/admin/docs` → ainda **custom 404**

### 6.2 Unlock local (flag dev)

- [x] Adicionar `ALLOW_ADMIN_WITHOUT_ROLE=true` no `apps/web/.env.local`
- [x] **Reiniciar** `pnpm dev` (env só lê no boot)
- [x] Abrir `/pt-BR/admin/docs` → portal renderiza!
- [x] Home mostra heading "What's the Sound? — Dev Docs", links pra Setup / Arch / Conventions / etc
- [x] Footer com "Última atualização: TASK-029 — 2026-04-17"

### 6.3 Navegação pela sidebar

- [x] Sidebar à esquerda mostra: Visão geral, Setup local, Arquitetura (+3 sub-items), Convenções, i18n, Troubleshooting, Progresso, Runbooks (+1)
- [x] Clicar **Setup local** → renderiza `setup.mdx`, active state cyan no sidebar
- [x] Clicar **Arquitetura → Database** → renderiza com tabela de migrations
- [x] Clicar **Progresso** → lista de Sprint 1 (8 tasks) e Sprint 2 (6 tasks)
- [x] Clicar **Runbooks → Supabase — Primeiro admin** → instruções SQL

### 6.4 Search

- [x] Digitar `midi` na search box → sidebar mostra até 8 resultados (Audio Engine, Progresso etc)
- [x] Clicar num resultado → navega + limpa query
- [x] Digitar `xxxzzz` (nada deve matchar) → "Nenhum resultado."
- [x] Apagar tudo → resultados somem, sidebar volta a ser só a nav

### 6.5 Locale

- [x] Com `/pt-BR/admin/docs` aberto, mudar URL pra `/en/admin/docs`
- [x] Sidebar labels viram "Overview", "Local setup", "Architecture", etc (chrome traduzida)
- [x] Conteúdo MDX fica como escrito (PT-BR no source; esperado — docs internas são bilíngues)

### 6.6 Criar primeiro admin real (opcional, recomendado)

Pra não depender da flag dev:

- [x] Remover (ou mudar pra `false`) `ALLOW_ADMIN_WITHOUT_ROLE` no `.env.local`
- [x] Abrir Supabase Dashboard → SQL Editor → New query
- [x] Executar:
  ```sql
  UPDATE public.users
  SET role = 'admin'
  WHERE nickname = 'SEU_NICKNAME_AQUI'
  RETURNING id, nickname, role;
  ```
- [x] Response confirma `role = 'admin'`
- [x] Reiniciar `pnpm dev`
- [x] Logar com a conta que virou admin
- [x] Abrir `/pt-BR/admin/docs` → renderiza (via role check, sem flag)
- [x] Logar numa conta diferente (player) → mesma URL retorna 404

---

## 7 · Regressões quick (5 min)

Depois de tudo, confirmar que TASK anteriores continuam funcionando:

- [x] `/pt-BR/terms` e `/pt-BR/privacy` renderizam (TASK-028)
- [x] Lighthouse no `/pt-BR/` → PWA score ≥ 90 (TASK-004). DevTools → Lighthouse → PWA only
- [x] Chrome → DevTools → Application → Manifest — manifest válido, ícones carregam
- [ ] Chrome Android: menu → "Adicionar à tela inicial" — ícone WTS aparece — *deferred to TASK-022 QA pass*
- [x] `fetch('http://localhost:3001/health')` do console do browser em `/` → `{ status: 'ok' }` (CORS habilitado)

---

## 8 · Browser matrix final

Repetir flows-chave em cada browser listado. Marcar X se falhou e anotar em qual passo.

| Browser | 1 Home | 2 Auth | 3 Profile | 4 Audio | 5 Errors | 6 Docs |
|---------|--------|--------|-----------|---------|----------|--------|
| Chrome Desktop | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Firefox Desktop | — | — | — | — | — | — |
| Safari Desktop | — | — | — | — | — | — |
| Chrome Android | — | — | — | — | — | — |
| Safari iOS | — | — | — | — | — | — |

**Prioridade**: Chrome Desktop ✅. Os outros ficam pra TASK-022 QA pass.

---

## Bugs encontrados e corrigidos durante o smoke

1. **Guest nickname helper não resetava** — `onChange` no login-form não limpava `nicknameError` → fix: clear on input change
2. **OAuth trigger falha "Database error saving new user"** — `handle_new_user` não sanitizava nickname do provider (espaços, acentos violam CHECK) e não tratava uniqueness collision → fix: strip `[^a-zA-Z0-9_]`, retry com sufixo `_N`, loop com exception handler
3. **`public.users` sem coluna email** — adicionada via migration 20260417120009
4. **Profile page mostrava GuestEmptyState para user logado** — `public.users` row não existia (trigger falhou antes) → fix: fallback self-healing no `fetchProfile`
5. **Header mostrava nome do Google em vez do nickname do DB** — `AuthMenu` lia `user_metadata.full_name` → fix: `useAuth` agora busca `profile` de `public.users` + `refreshProfile()`
6. **Custom 404 não renderizava** — faltava catch-all `[...rest]/page.tsx` e admin middleware retornava body vazio → fix: catch-all + rewrite para `/{locale}/__not-found`
7. **`auth.uid()` retorna NULL no SQL Editor** — smoke test usava query com `auth.uid()` que não funciona no SQL Editor (service_role context) → fix: usar `ORDER BY updated_at DESC LIMIT 1`

---

## Resultado

✅ **Sprint 2 PASSED** — Chrome Desktop, todas as seções verdes.
Base sólida pra Sprint 3 (Socket.io + multiplayer core).
Auth, áudio, perfil, error boundaries e dev docs portal funcionais ponta-a-ponta.
