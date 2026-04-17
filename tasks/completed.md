# Completed Tasks — What's the Sound?

> Tasks concluídas migram do backlog.md para cá.
> Formato: `[✓] TASK-XXX: Título — data de conclusão`

---

### [✓] TASK-001: Setup do Monorepo com Turborepo — 2026-04-17
    Concluída em Sprint 1.
    → Entregue:
      • Monorepo pnpm + Turborepo 2.9 (apps/web, apps/server, packages/shared linkados via workspace:*)
      • apps/web: Next.js 15.5 App Router + TypeScript strict + Tailwind v4 (via @tailwindcss/postcss) + path aliases (@/, @/components, @/lib, @/hooks, @/types) + layout raiz com metadata PWA (theme-color, apple-web-app) + "/" renderizando placeholder
      • apps/server: Fastify 5 + @fastify/cors + /health endpoint + logger Pino com pino-pretty em dev + graceful shutdown (SIGINT/SIGTERM) + estrutura src/routes, src/services, src/socket, src/middleware, src/types
      • packages/shared: enums (MidiCategory, MidiDifficulty, GameStatus, GuessResult, UserRole), constants (PHASE_SCORES, rate limits, nickname rules, daily cron), types (RoomStateSnapshot, ServerToClientEvents, ClientToServerEvents, MidiEntry, etc) — consumido como source via transpilePackages
      • Root: package.json com scripts turbo (dev/build/lint/type-check/format), biome.json com rules + noExplicitAny error, tsconfig.base.json strict com noUncheckedIndexedAccess, pnpm.onlyBuiltDependencies configurado
      • .env.example em ambos os apps
    → Validação:
      • pnpm type-check: 4/4 pacotes sem erros
      • pnpm lint: 4/4 pacotes sem warnings
      • pnpm build: Next.js + Fastify compilam (Next gera "/" como static)

---

### [✓] TASK-024: GitHub Actions CI — 2026-04-17
    Concluída em Sprint 1.
    → Entregue:
      • `.github/workflows/ci.yml` dispara em `pull_request` e `push` em `main`
      • Node 20 + pnpm 10 via `pnpm/action-setup@v4` + `actions/setup-node@v4` (cache: pnpm)
      • Jobs: `install` (fast-fail do lockfile) + `lint` + `type-check` + `build` rodam em paralelo após install
      • Cache do Turborepo por job (`.turbo/` com fallback key por job e global)
      • `concurrency` com `cancel-in-progress: true` para evitar workflows duplicados por push em sequência
    → Validação local:
      • `pnpm install --frozen-lockfile` passa (mesmo comando que o CI usa)
      • `pnpm lint` / `type-check` / `build` já verificados na TASK-001
    → Pendente de ação do usuário (não bloqueia):
      • Push para o remote e abrir PR de teste para ver o primeiro run verde
      • Configurar branch protection em `main` (GitHub Settings → Branches → Require status checks: lint, type-check, build)
      • Ao fechar TASK-029, adicionar entry no `/admin/docs/arch/monorepo` e em `/admin/docs/progress`

---

### [✓] TASK-028: Páginas Legais (Terms + Privacy) — 2026-04-17
    Concluída em Sprint 1. Pré-requisito de TASK-002b (Google OAuth exige URLs públicas).
    → Entregue:
      • `/terms` (Server Component) — 9 seções: serviço, elegibilidade (≥13 LGPD), conta/identidade, conteúdo gerado, MIDIs/copyright (com fluxo de takedown), uso aceitável, modificações, lei aplicável (Brasil/SP), contato
      • `/privacy` (Server Component) — 10 seções LGPD-compliant: dados coletados (OAuth + gameplay + técnicos + guest), uso, compartilhamento (Supabase/Vercel/Railway/Google/Discord como processadores), direitos LGPD completos, retenção (30 dias pós-pedido), cookies (só sessão), segurança, alterações, contato
      • Componente compartilhado `<LegalPage>` + `<Section>` em `apps/web/src/components/legal/legal-page.tsx`
      • Footer no placeholder `/` com links para `/terms` e `/privacy`
      • Both prerendered as static (zero JS, full SSR)
      • Email contato@whatsthesound.io referenciado em ambas (placeholder — atualizar antes do go-live)
    → Validação:
      • pnpm lint / type-check / build: 4/4, 4/4, 3/3 verdes
      • Build mostra `/terms` e `/privacy` como `○ (Static)` — prerender confirmado
      • Tema dark herdado do layout raiz; visual consistente com design system (cyan accent nos headings)
      • URLs públicas (sem middleware de auth aplicado)
    → Pendente (não bloqueia):
      • Atualizar email "contato@whatsthesound.io" para o canal real antes do deploy
      • Registrar URLs (https://...whatsthesound.io/terms e /privacy) no console do Google OAuth durante TASK-002b
      • Atualizar `/admin/docs/conventions` quando TASK-029 estiver pronta com link para os textos

---

### [✓] TASK-026: Env Validation + Logger Estruturado — 2026-04-17
    Concluída em Sprint 1.
    → Entregue:
      • Helper `defineEnv(schema, { context })` em `@wts/shared/env` com `EnvValidationError` que formata todos os issues do Zod em mensagem legível (path + msg, agrupados)
      • `apps/server/src/env.ts` — schema Zod tipado: NODE_ENV, PORT (coerce + range), HOST, LOG_LEVEL (enum), CORS_ORIGINS (string→string[] via transform); SUPABASE/DATABASE_URL/DAILY_SEED como `.optional()` na Sprint 1, viram required em TASK-002 e TASK-015
      • `apps/web/src/env.ts` — schema Zod só com `NEXT_PUBLIC_*` (URLs validadas, Supabase opcional na Sprint 1)
      • `next.config.ts` importa `./src/env` no topo — Zod roda em build-time e crasha se inválido
      • Server `index.ts` consome `env.PORT/HOST/LOG_LEVEL/CORS_ORIGINS` (não mais `process.env` direto); `main().catch` distingue `EnvValidationError` (mensagem limpa) de erro genérico
      • Logger Pino + pino-pretty já configurado desde TASK-001: pretty em dev, JSON em prod (controlado por NODE_ENV); request logger nativo do Fastify ativo (gera trace id por request)
      • Zero `console.*` em `apps/server/src` (verificado via grep)
      • `pnpm install` adicionou `@types/node` em packages/shared (necessário para `process` em isolado)
    → Validação:
      • pnpm lint / type-check / build: 4/4, 4/4, 3/3 verdes
      • Smoke test `PORT=invalid tsx src/index.ts` → exit imediato com `EnvValidationError: Environment validation failed for @wts/server: - PORT: Expected number, received nan`
      • Server inicia normalmente com env padrão (sem .env, defaults aplicados)
    → Pendente (não bloqueia):
      • Documentar fluxo `defineEnv` + lista de env vars em `/admin/docs/setup` quando TASK-029 estiver pronta
      • Decidir entre adicionar `pino-http` para enriquecer logs de request com mais campos (atualmente o nativo do Fastify cobre o suficiente)

---

### [✓] TASK-003: Design System + Tailwind Theme + Shadcn — 2026-04-17
    Concluída em Sprint 1.
    → Entregue:
      • `globals.css` com `@theme` Tailwind v4 contendo paleta synthwave completa do design-system.md: bg (primary/surface/surface-hover/border), accent (cyan/magenta/yellow/green/red/orange), text (primary/secondary/muted/on-accent), shadows glow por cor, radius (sm/md/lg/xl), animations
      • Keyframes: `fade-in`, `slide-up`, `scale-pop` (spring), `pulse-glow`, `shake` — registrados no `@theme` via `--animate-*`
      • Scrollbar custom (8px, thin, dark) via `::-webkit-scrollbar` + `scrollbar-color` para Firefox; focus-visible global com outline cyan; selection com bg cyan
      • Fonts via `next/font/google` (display: swap): Space Grotesk (display/branding), Inter (body, default), JetBrains Mono (code) — variáveis CSS aplicadas no `<html>` e referenciadas em `--font-display/body/mono`
      • Componentes Shadcn-style em `apps/web/src/components/ui/`:
        - `Button` (cva: primary/secondary/ghost/danger × sm/md/lg/icon) — primary com glow cyan no hover
        - `Input` (com `hasError`)
        - `Card` (Header/Title/Description/Content/Footer) com prop `highlight` (border + glow cyan)
        - `Dialog` (Radix com overlay backdrop-blur, scale-pop animation)
        - `Avatar` (Radix com Image/Fallback)
        - `Badge` (cva: default/cyan/magenta/yellow/green/red)
        - `Toaster` (sonner com tema dark + border-left por variant)
      • `lib/utils.ts` com `cn()` (clsx + tailwind-merge)
      • Home `/` reformulada com Badge + 2 botões (primary com glow / secondary) + 3 cards (1 com `highlight`) + ícones lucide colorindo accents
    → Dependências adicionadas a apps/web:
      • @radix-ui/react-{slot, dialog, avatar}, class-variance-authority, clsx, tailwind-merge, lucide-react, sonner
    → Validação:
      • pnpm lint / type-check / build: 4/4, 4/4, 3/3 verdes
      • Build inclui todas as rotas como `○ (Static)`: `/`, `/terms`, `/privacy`, `/_not-found`
      • Botão primary tem `hover:shadow-[var(--shadow-glow-cyan)]` (verificado no source)
      • Fonts via next/font com `display: swap` (sem CLS, FOIT mitigado)
      • Cores correspondem ao design-system.md (validado contra a tabela de paleta)
    → Pendente (não bloqueia):
      • Atualizar `/admin/docs/conventions` quando TASK-029 estiver pronta com seção "como usar componentes UI" + exemplos
      • Adicionar mais variantes/componentes (Tooltip, DropdownMenu, Tabs, Select) sob demanda nas tasks que precisarem

---

### [✓] TASK-032: i18n Infrastructure (pt-BR + en) — 2026-04-17
    Concluída em Sprint 1. Adicionada após a criação das specs 08/09 por decisão do usuário — i18n precisa entrar antes da TASK-004/Sprint 2 para não acumular strings hardcoded. Spec: `specs/features/10-i18n.md`.
    → Entregue:
      • next-intl 3.26 instalado em `apps/web`
      • `src/i18n/config.ts` (locales array `['pt-BR', 'en']`, defaultLocale pt-BR, displayNames, shortLabels)
      • `src/i18n/routing.ts` — `defineRouting` com `localePrefix: 'always'`, `localeDetection: true`
      • `src/i18n/request.ts` — `getRequestConfig` carrega messages do locale ativo com fallback para defaultLocale
      • `src/i18n/navigation.ts` — re-exporta Link/redirect/usePathname/useRouter do `createNavigation(routing)`
      • `src/middleware.ts` usando `createMiddleware` — detecção Accept-Language → cookie → defaultLocale; matcher exclui api/_next/_vercel/files com extensão
      • `next.config.ts` encapsulado em `withNextIntl` via `createNextIntlPlugin('./src/i18n/request.ts')`
      • `messages/pt-BR.json` e `messages/en.json` — conteúdo completo: metadata (site/pages), common (actions/footer/localeSwitcher), home (hero + 3 cards), legal (brandLabel, lastUpdated ICU, terms com 9 sections, privacy com 10 sections)
      • Refactor da árvore `app/`: deletado `app/layout.tsx`, `app/page.tsx`, `app/terms/`, `app/privacy/` — tudo movido para `app/[locale]/` sob o mesmo layout contendo `<html lang={locale}>`, fonts next/font, Toaster, NextIntlClientProvider
      • `generateStaticParams` exporta as duas locales para SSG
      • `generateMetadata` por página via `getTranslations({ locale, namespace })`
      • Componente `LocaleSwitcher` (client) em `components/shared/locale-switcher.tsx` — botões compactos PT/EN, seta cookie `NEXT_LOCALE` max-age=1y, usa `router.replace(pathname, { locale })` dentro de `useTransition`
      • Switcher embutido no footer do home e no rodapé das páginas legais
      • `LegalPage` refatorado para receber `sections: LegalSection[]` — renderiza body/intro/list e suporta inline `**bold**` via split/map (sem `dangerouslySetInnerHTML`)
      • Spec `specs/features/10-i18n.md` criada cobrindo: stack, locales, detecção, switcher, estrutura de keys, ICU, como adicionar string nova, regras para specs de features (exemplos como key, não string crua)
      • `CLAUDE.md` atualizado: regra "UI text em português (hardcoded no MVP, i18n na Fase 4)" revogada — agora i18n é MVP. Adicionadas 08/09/10 na árvore de specs e na tabela de docs.
      • `specs/overview.md` atualizado: feature 10 listada no MVP; Fase 4 passa a cobrir expansão para es-ES/es-MX.
      • `specs/features/04-multiplayer-rooms.md` e `05-daily-sound.md` ganharam nota no topo: exemplos de UI text representam valor resolvido, implementação usa keys ICU em ambas messages/*.json.
      • `specs/features/09-dev-docs.md` inclui `/admin/docs/conventions/i18n` na hierarquia do portal.
      • `tasks/execution-plan.md` atualizado: TASK-032 inserida na ordem da Sprint 1, total 110h / 32 tasks.
    → Validação:
      • pnpm lint / type-check: 4/4 verdes
      • pnpm build: 3/3 verdes; Next gera `/[locale]` com fork estático para `pt-BR` e `en`; rotas `/terms` e `/privacy` idem; middleware 51.6 kB
      • Build output confirma 3 rotas × 2 locales = 6 páginas estáticas (+ 404) + middleware edge
      • `next-intl` handling de `useTranslations()` funciona em server components não-async (padrão RSC) e em client components (LocaleSwitcher)
      • Inline markdown bold renderiza via JSX `<strong>` sem `dangerouslySetInnerHTML`
    → Pendente (não bloqueia):
      • Smoke test manual no browser: abrir `pnpm dev` e confirmar redirect `/` → `/pt-BR/`; simular Accept-Language: en → `/en/`; clicar switcher e ver troca de URL + cookie
      • Script CI `pnpm docs:check` validando paridade de chaves pt-BR vs en — implementar junto com TASK-024/029
      • Migrar strings pt-BR que aparecerem em TASK-005+ automaticamente (regra agora é convenção documentada)

---

### [✓] TASK-002: Setup Supabase + Schema inicial — 2026-04-17
    Concluída em Sprint 1. Spec: `specs/technical/database.md` + `specs/features/03-auth.md` + `specs/features/08-xp-system.md`.
    → Entregue:
      • Projeto Supabase criado na região `sa-east-1` (São Paulo), identificador `ehjkytmcjowlythjstto`
      • Supabase CLI 2.92 adicionada como devDep na raiz (via postinstall baixa o binário do GitHub); scripts `pnpm db:push`, `db:diff`, `db:reset`
      • `supabase/config.toml` + 8 migrations em `supabase/migrations/`:
        - `20260417120000_init.sql` — enums (midi_category, midi_difficulty, game_status, user_role, xp_source) + `update_updated_at()`
        - `20260417120001_users.sql` — users table + xp/level + triggers `handle_new_user`/`sync_user_level`/`users_updated_at` + RLS (select all, update own, insert via trigger)
        - `20260417120002_midi_catalog.sql` — catalog + RLS (public read de ativos, admin write)
        - `20260417120003_game_tables.sql` — game_sessions (guest mode clarificado no comentário da policy), game_players (com `idx_game_players_session_joined` pra host migration), round_scores
        - `20260417120004_daily_tables.sql` — daily_results (com partial index `idx_daily_user_completed`), daily_schedule
        - `20260417120005_xp_events.sql` — audit log com UNIQUE(source, source_ref) e RLS read-own (writes só via service role)
        - `20260417120006_cross_table_triggers.sql` — `update_user_stats_after_game`, `update_daily_streak`, `update_midi_stats`
        - `20260417120007_storage.sql` — bucket `midis` + policies (public read, admin write/update/delete)
      • Todas as 8 migrations aplicadas no remoto (confirmado via `supabase migration list`)
      • `.env.local` em ambos apps com as keys da nova API Supabase (`sb_publishable_*` / `sb_secret_*`) em vez do legado JWT; `DATABASE_URL` com a connection string direta (db.xxx.supabase.co:5432)
      • Env schemas renomeados: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (web) e `SUPABASE_SECRET_KEY` (server) com validação `.startsWith(...)` para detectar key errada já no boot
      • Clients Supabase criados:
        - `apps/web/src/lib/supabase/browser.ts` — `createBrowserClient` para Client Components
        - `apps/web/src/lib/supabase/server.ts` — `createServerClient` + `cookies()` para Server Components/actions
        - `apps/web/src/lib/supabase/middleware.ts` — `updateSupabaseSession(request)` refresca token via cookies
        - `apps/server/src/lib/supabase.ts` — admin client (secret key, `persistSession: false`, singleton cache)
      • `apps/web/src/middleware.ts` encadeia refresh Supabase → next-intl preservando cookies em caso de redirect
      • Scripts de server atualizados para usar `--env-file=.env.local` (dev, start, smoke:db) — zero magia de dotenv, explícito
      • `apps/server/scripts/smoke-db.ts` valida ponta-a-ponta: tabelas users/midi_catalog/xp_events/daily_schedule acessíveis + storage bucket `midis` presente + `auth.admin.listUsers` responde
      • Providers OAuth configurados no dashboard: Google (via Google Cloud Console → OAuth Client ID com callback `https://ehjkytmcjowlythjstto.supabase.co/auth/v1/callback`) e Discord (via discord.com/developers/applications com o mesmo callback)
    → Validação:
      • `supabase migration list` — 8/8 alinhadas (Local == Remote)
      • `pnpm --filter @wts/server exec ... smoke-db.ts` retorna 6/6 verdes (4 tabelas + storage + auth admin)
      • `pnpm lint / type-check / build` — 4/4, 4/4, 3/3 verdes; Middleware agora com 118 kB (next-intl + Supabase SSR)
      • RLS ativo em todas as tabelas (`enable row level security` em cada create)
      • Storage bucket `midis` existe e é público (`public: true` confirmado no smoke)
      • Google e Discord OAuth configurados e prontos para consumo em TASK-007
    → Pendente (não bloqueia):
      • Instalar 1º admin: `UPDATE public.users SET role='admin' WHERE nickname='seu-nickname'` (após seu primeiro login OAuth)
      • Configurar redirect URLs de produção no Google Cloud + Discord quando tivermos domínio (TASK-023)
      • Documentar fluxo de migration + setup em `/admin/docs/runbooks/supabase-admin` (TASK-029)

---

### [✓] TASK-029: Dev Docs Portal + Admin Middleware — 2026-04-17
    Concluída em Sprint 2 (última). Spec: `specs/features/09-dev-docs.md`.
    → Deps adicionadas no `apps/web`: `next-mdx-remote@^6`, `gray-matter@^4`, `remark-gfm@^4`, `rehype-slug@^6`, `rehype-autolink-headings@^7`, `shiki@^4`, `fuse.js@^7` (shiki instalado mas não cabeado ainda — follow-up)
    → Entregue (admin middleware):
      • `apps/web/src/middleware/require-admin.ts` — lê sessão via `createServerClient` (@supabase/ssr), consulta `users.role`, retorna `NextResponse` 404 (não 403, não revela a rota) pra non-admins ou sessão ausente. Dev escape hatch `ALLOW_ADMIN_WITHOUT_ROLE=true` — respeitado SÓ quando `env.NODE_ENV !== 'production'`
      • `apps/web/src/middleware.ts` — chain order: Supabase refresh → `requireAdmin` (quando pathname bate em `/^\/(?:pt-BR|en)\/admin(\/|$)/`) → next-intl. Falha do admin gate short-circuita antes do intl
      • `apps/web/src/env.ts` — adicionado `NODE_ENV` enum + `ALLOW_ADMIN_WITHOUT_ROLE` enum→boolean (Zod transform)
      • `apps/web/.env.example` — documenta a flag + warning sobre prod
    → Entregue (MDX infra):
      • `apps/web/src/lib/docs/fs.ts` — `listAllDocs()` (walks `src/content/dev-docs/**/*.mdx`) + `readDoc(slug[])` + `parseFrontmatter` via gray-matter. Normaliza `lastUpdated` (aceita Date ou string YAML → string YYYY-MM-DD)
      • `apps/web/src/components/docs/mdx-components.tsx` — mapping de elementos MDX → componentes com Tailwind (h1-h3, p, ul/ol/li, code, pre, a, blockquote, table/th/td, hr, strong, em). Links externos ganham `target="_blank" rel="noopener noreferrer"` automaticamente
      • Route: `apps/web/src/app/[locale]/admin/docs/[[...slug]]/page.tsx` — catch-all `force-dynamic` que resolve slug via `readDoc`, renderiza MDX via `next-mdx-remote/rsc` `<MDXRemote>` com `remarkGfm` ativado, header + footer "Última atualização: TASK-XXX — YYYY-MM-DD" quando frontmatter inclui
      • Layout `apps/web/src/app/[locale]/admin/docs/layout.tsx` — sidebar + search + main content, link de volta pra /, heading "Dev Docs"
    → Entregue (componentes):
      • `DocsSidebar` (client) — hierarquia hardcoded (Home, Setup, Arch {overview/monorepo/database/audio}, Conventions, i18n, Troubleshooting, Progress, Runbooks {supabase-admin}), active state via `usePathname`, estilos dark com accent-cyan no ativo
      • `DocsSearch` (client) — fuse.js client-side com `{ keys: [title, description, slugString], threshold: 0.4 }`, recebe entries do layout (server walk do fs), mostra top 8 resultados com preview de descrição
    → Entregue (conteúdo MDX):
      • `content/dev-docs/` — 11 arquivos cobrindo retroativamente Sprints 1+2:
        - `index.mdx` (home / overview)
        - `setup.mdx` (pré-reqs, clone, install, env, db, dev, gates)
        - `arch/overview.mdx` (stack, apps, fluxo de request, decisões)
        - `arch/monorepo.mdx` (pnpm workspaces, turbo, Biome)
        - `arch/database.mdx` (migrations, RLS, triggers, clients)
        - `arch/audio.mdx` (Tone.js, parser, phase-player, Safari autoplay)
        - `conventions.mdx` (naming, commits, workflow, PR)
        - `conventions/i18n.mdx` (next-intl, keys, namespaces atuais)
        - `troubleshooting.mdx` (env, pnpm approval, Safari, admin gate, build dynamic, i18n, audio silent, type errors)
        - `progress.mdx` (índice narrativo por TASK × Sprint 1/2)
        - `runbooks/supabase-admin.mdx` (SQL pra criar primeiro admin)
      • Todo frontmatter inclui `title`, `description`, `lastTask`, `lastUpdated`
    → Entregue (CI):
      • `apps/web/scripts/check-docs.ts` — valida frontmatter + content não-vazio de cada .mdx
      • `apps/web/package.json` — script `docs:check` rodando via `node --experimental-strip-types`
      • `.github/workflows/ci.yml` — novo job `docs-check` em paralelo com lint/type-check/build
    → Entregue (i18n):
      • Namespace `docs.*` em pt-BR + en: heading, searchPlaceholder, searchEmpty, tocHeading, lastUpdated (ICU com {taskId, date}), homeLink, sidebar.* (11 labels), notFound
    → Decisões / desvios:
      • **Admin routes ficam sob `/[locale]/admin/...`** conforme decisão do planejamento (honor locale). Sidebar chrome é traduzida; conteúdo MDX fica em EN/PT misto (source of truth, não traduzimos docs internas)
      • **Rotas admin são `force-dynamic`** (não prerender) — o middleware precisa rodar em cada request pra checar role
      • **Shiki syntax highlighting NÃO foi cabeado** como rehype plugin ainda. `<code>` e `<pre>` mostram monospace cru. Follow-up: plugar `rehype-pretty-code` quando tivermos exemplos de código que precisem highlight mais rico
      • **TOC auto-gerada e breadcrumb NÃO implementados** — a sidebar + header com "WTS / Dev Docs" são suficientes pro MVP com 11 pages
      • **Custom MDX components (`<Callout>`, `<TaskRef>`) NÃO implementados** — HTML nativo + tables markdown são o suficiente. Adicionar quando surgir uma necessidade concreta
      • **Sidebar hierarquia é hardcoded** em `DocsSidebar` em vez de gerada do fs walk — mais previsível e ordenável; fs walk alimenta apenas o search index
    → Validação:
      • pnpm lint: 4/4 verdes (64 arquivos no @wts/web)
      • pnpm type-check: 4/4 verdes
      • pnpm build: 3/3 verdes; rota `/[locale]/admin/docs/[[...slug]]` aparece como `ƒ` (Dynamic)
      • pnpm docs:check: **11/11 docs OK**
    → Pendente de smoke manual:
      • Anon: `/pt-BR/admin/docs` → 404 (sem session cookie)
      • Logado não-admin: também 404 (profile.role != admin)
      • Admin (via SQL UPDATE ou `ALLOW_ADMIN_WITHOUT_ROLE=true` local): home renderiza, sidebar navega, search filtra
      • Sidebar link → navegação, active state marcado no item correto
      • Search → digitar "midi" ou "auth" retorna entries relevantes, click navega + limpa query
      • Flip locale (`/en/admin/docs`) → sidebar labels traduzem, conteúdo MDX fica como escrito (bilíngue na prática)
    → Fora de escopo / follow-ups:
      • Shiki highlighting (rehype-pretty-code) — quando houver MDX com code intensivo
      • TOC auto-gen, breadcrumb, MDX `<Callout>` / `<TaskRef>` — conforme surgir necessidade
      • Remover rota `/[locale]/dev/audio` antes do pré-prod → TASK-022 QA
      • **Instalar primeiro admin via SQL** (ver [runbook](/admin/docs/runbooks/supabase-admin)) — user action, não bloqueia merge

---

### [✓] TASK-025: Error Handling + Boundaries — 2026-04-17
    Concluída em Sprint 2. Spec: `specs/technical/architecture.md`.
    → Entregue (frontend):
      • `apps/web/src/app/[locale]/error.tsx` — route-level error boundary (Client Component obrigatório em Next 15). Recebe `{ error: Error & { digest? }, reset: () => void }`; renderiza fallback full-screen com ícone AlertTriangle + título + description + digest ref (se houver) + 2 botões: "Tentar novamente" (chama reset) e "Voltar pra home". Loga `console.error` no mount
      • `apps/web/src/app/[locale]/not-found.tsx` — custom 404 com ícone FileQuestion + "404" + título + CTA pra home
      • `apps/web/src/components/shared/error-boundary.tsx` — class component manual `<ErrorBoundary>` reutilizável. API: `{ children, fallback?: ReactNode | (error, reset) => ReactNode, onError?(error, info) }`. `DefaultFallback` mostra banner vermelho inline com mensagem + botão reset, usando namespace `errors.localBoundary`
      • Integrado no `app/[locale]/dev/audio/page.tsx` em volta do `<AudioVisualizer>` — se canvas/analyser falhar, não derruba a tela inteira
    → Entregue (backend Fastify):
      • `apps/server/src/middleware/error-handler.ts` — `registerErrorHandlers(server)` wire de 2 handlers:
        - `setErrorHandler`: distingue 5xx (loga `err.error` full com stack) vs 4xx (loga `err.warn` só code); mapeia `FastifyError.code` OU statusCode → code canônico (`BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `UNPROCESSABLE_ENTITY`, `RATE_LIMITED`, `INTERNAL_ERROR`); 5xx manda mensagem genérica "Internal server error" pro client (não vaza stack)
        - `setNotFoundHandler`: retorna `{ error: { code: 'NOT_FOUND', message } }` com 404
      • Shape wire estável: `{ error: { code, message } }` — prod-ready
      • Wired em `apps/server/src/index.ts` após registro do CORS
    → Entregue (i18n):
      • namespace `errors.boundary` (title, description, tryAgain, goHome, ref), `errors.notFound` (title, description, goHome), `errors.localBoundary` (fallback, reset) — ambos idiomas
    → Toast:
      • Sonner `Toaster` já montado no layout desde TASK-003; reused nos fluxos existentes (LoginForm, NicknameInput, LogoutButton, DevAudio). Não precisa de abstração adicional
    → Decisões / desvios:
      • **Socket.io disconnect/reconnect UI** não implementado. Spec menciona "handler de disconnect + connect_error + fallback Reconectando...". Como não existe socket ainda (TASK-009 na Sprint 3), isso seria infra sem consumidor. Documentado como follow-up em TASK-009.
      • `error.tsx` vive em `[locale]/error.tsx`, não em `app/error.tsx` (root). Razão: precisa de `useTranslations` via NextIntlClientProvider (que está no `[locale]/layout.tsx`). Erros fora do locale (ex: `/auth/callback`) caem no Next default error page.
      • `not-found.tsx` está em `[locale]/` pelo mesmo motivo (i18n). Rotas fora do locale (que são poucas) usam default 404 do Next.
      • Server errorHandler retorna objeto (Fastify faz serialization automática) em vez de `reply.send()` — idiomático, evita double-send.
    → Validação:
      • pnpm lint: 4/4 verdes (server agora com 5 arquivos)
      • pnpm type-check: 4/4 verdes
      • pnpm build: 3/3 verdes
    → Pendente de smoke manual:
      • Frontend: forçar throw num componente qualquer → /pt-BR exibe fallback "Algo deu errado" com botão de retry (não white screen)
      • 404: acessar /pt-BR/naoexiste → custom 404 page com CTA home
      • Backend: rota inexistente `curl http://localhost:3001/naoexiste` → `{ error: { code: 'NOT_FOUND', message: '...' } }` com 404
      • Backend: forçar throw em handler → 500 com mensagem genérica + stack completo nos logs do server
    → Fora de escopo:
      • Socket.io disconnect/reconnect handling → TASK-009
      • Sentry / error reporting externo → polish futuro
      • Entry em `/admin/docs/troubleshooting` → TASK-029

---

### [✓] TASK-006: Componente AudioVisualizer — 2026-04-17
    Concluída em Sprint 2. Spec: `specs/features/02-midi-engine.md`.
    → Entregue:
      • `apps/web/src/components/audio/audio-visualizer.tsx` — Client Component stateless; props: `{ analyser: Tone.Analyser | null, isPlaying: boolean, className?, barCount=48 }`. Canvas-based FFT renderer:
        - rAF loop throttled para **30fps** (`TARGET_FPS`)
        - HiDPI-aware resize (`devicePixelRatio`)
        - Gradiente horizontal **cyan → magenta** lido de `--color-accent-cyan` / `--color-accent-magenta` via `getComputedStyle` (fallback hex `#00f0ff` / `#ff00aa`)
        - **Idle state**: cor `--color-bg-border` (muted), barras a 12% do height (fixo, não animadas)
        - **Playing state**: lê `analyser.getValue()` (Float32Array de dB), normaliza de `[-85, 0]` dB → `[0, 1]`, barras centered vertically
        - Height responsivo: **120px mobile**, **160px md+**
        - **Page Visibility**: `visibilitychange` listener pausa rAF quando tab hidden; retoma automaticamente quando visible
      • Integrado no `app/[locale]/dev/audio/page.tsx` — renderiza acima do bloco de progress, consumindo `player.analyser` e `player.isPlaying` do `useMidiPlayer`
    → Decisões:
      • **Phase transition wave animation NÃO implementada** (spec menciona "animação de wave passando pelas barras" em troca de fase). Adicionaria um prop `phaseVersion?: number` que triggeria uma animação, mas como polish. Fica pra TASK-022 QA pass.
      • Sem role/aria no `<canvas>` — é puramente decorativo, silente para screen readers (canvas sem texto/fallback). Biome rejeita `aria-hidden` em canvas (considera interactive por default) e `role="presentation"` em interactive element. Trade correto: omitir ambos.
      • `barCount=48` default — bom equilíbrio entre densidade visual e legibilidade em 120-160px de altura. Prop overridable caso uma tela queira diferente.
    → Validação:
      • pnpm lint: 4/4 verdes
      • pnpm type-check: 4/4 verdes
      • pnpm build: 3/3 verdes; `/[locale]/dev/audio` size estável
    → Pendente de smoke manual:
      • Carregar dev/audio, tap overlay, load test melody, clicar Play Fase 1 → visualizer reage em tempo real
      • Trocar de tab → animação pausa (verificar via DevTools Performance)
      • Mobile (Chrome Android + Safari iOS): barras suaves, sem jank
    → Fora de escopo:
      • Phase transition wave animation (polish — TASK-022)
      • Entry em `/admin/docs/arch/audio` → TASK-029

---

### [✓] TASK-005: MIDI Audio Engine com Tone.js — 2026-04-17
    Concluída em Sprint 2 (critical path). Spec: `specs/features/02-midi-engine.md`.
    → Deps adicionadas no `apps/web`: `tone@^15.1.22`, `@tonejs/midi@^2.0.28`
    → Entregue:
      • `apps/web/src/lib/midi/types.ts` — types internos client-side: `MidiNote`, `MidiTrack`, `MidiData`. `PhaseConfig` consumido de `@wts/shared` (já existia desde TASK-001)
      • `apps/web/src/lib/midi/parser.ts` — `parseMidiFromUrl(url)` (fetch + parse) e `parseMidiFromBuffer(buffer)` (sync); normaliza output de `@tonejs/midi` pro shape interno (tracks com notes[], isDrum detectado via `track.instrument.percussion`)
      • `apps/web/src/lib/midi/audio-context.tsx` — `AudioContextProvider` + `useAudioContext` hook. Expõe `{ isReady, isStarting, error, start }`. Detecta se o Tone.context já está 'running' no mount (reconexão). `start()` é idempotente.
      • `apps/web/src/lib/midi/soundfont-loader.ts` — `createInstrumentRegistry(output)` com interface `InstrumentRegistry.get(track): Tone.PolySynth`. MVP cacheia 2 synths: um melódico (todos instrumentos não-drum) e um de drum. Cascade fallback documentada na spec (real soundfont → piano → PolySynth) termina aqui até TASK-018 trazer samples reais
      • `apps/web/src/lib/midi/phase-player.ts` — classe `PhasePlayer` encapsula: Gain master → Analyser + connect a `Tone.Destination`; `play(midi, phase)` filtra tracks por `phase.tracks` e notas por `[startBeat, endBeat) * 60/bpm`, agenda com `Tone.getTransport().schedule` retornando eventIds, dispara timeout de fim baseado na última nota + 400ms de tail; `stop()` cancela schedule + para transport + zera position; `onEnded(cb)` subscribe API; `getAnalyser()` expõe Analyser. `dispose()` limpa tudo.
      • `apps/web/src/hooks/use-midi-player.ts` — API pública: `loadMidi(url)`, `loadMidiFromBuffer(buffer)`, `play(phase)`, `stop()`, `replay()`, estados `isPlaying`, `isLoading`, `currentPhase`, `progress (0-1 via rAF loop)`, `analyser`, `midi`, `error`. Cria PhasePlayer uma vez quando `audioContext.isReady` flipa pra true; dispose no unmount; subscribe a `onEnded` pra flipar state; analyser exposto como state (reactive, não ref) pra consumer de viz detectar mudança null→ready
      • `apps/web/src/components/audio/start-audio-overlay.tsx` — fullscreen `fixed inset-0 z-50` com botão centralizado "Toque para começar". Chama `useAudioContext().start()` no click; renderiza `null` quando `isReady`. Acessível via botão grande com foco visível (cyan ring)
      • `apps/web/src/lib/midi/test-melody.ts` — `generateTestMelodyBuffer()` usa `@tonejs/midi`'s `Midi` pra construir in-memory: 2 tracks (Melody GM 0 + Bass GM 32), 8 beats a 120 BPM, C major scale na melodia + walking bass. Retorna ArrayBuffer novo (aloca + copia, não `bytes.buffer` direto pra evitar `SharedArrayBuffer` ambiguity)
      • `apps/web/src/app/[locale]/dev/audio/page.tsx` — page de smoke test (`'use client'`). Wrap em `AudioContextProvider` + `StartAudioOverlay`. UI: input de URL + botão "Carregar URL" OU botão "Carregar melodia de teste"; após carregar mostra info do MIDI + lista de tracks + 4 botões de fase (1: track 0 beats 0-4, 2: track 0 beats 0-8, 3: all tracks beats 0-8, 4: full song) + stop/replay + barra de progresso
      • `apps/web/messages/pt-BR.json` + `en.json` — adicionado namespace `audio.overlay` (title/subtitle/starting/error) + namespace `dev.audio` (title/description/urlLabel/loadUrl/loadTestMelody/tracksHeading/phaseHeading/phase/phaseDescription/stop/replay/progress/playing/idle/loading/error)
    → Decisões / desvios da spec (documentado pra plug-in futuro):
      • **Soundfont loading é PolySynth-only por ora.** A spec descreve cascade: (1) soundfont correto → (2) piano precached → (3) Tone.PolySynth. MVP fica no nível 3 porque não temos assets de soundfont hospedados ainda. Quando TASK-018 seedar MIDIs reais, a `InstrumentRegistry` interface aceita drop-in de `Tone.Sampler` mantendo o consumer (`PhasePlayer`) inalterado. 20MB cache budget + versionamento de hash do spec ainda não foram implementados porque não há assets que precisem de SW caching.
      • **Family-specific synth tuning foi revertida** após Tone.js 15 rejeitar `PolySynth.set({ oscillator: { type } })` via strict types (`RecursivePartial` não está exportado e o `OmniOscillatorSynthOptions` exige shape completo). Todos melódicos tocam com Tone.Synth default (triangle + envelope padrão). Trade aceito pra MVP — real sampler vai vir com real timbre.
      • **Page Visibility pausar** não implementado. Spec menciona "Pausar reprodução quando tab perde foco" — fica pra polish (TASK-022 QA pass) porque impacta UX mas não correctness. rAF loop já é naturalmente throttled pelo browser quando tab hidden, então progress não desperdiça CPU — só o áudio continua tocando.
      • **REST endpoints (`/api/midis`, `/api/midis/daily`, `/api/midis/:id/phase/:phase`)** não implementados nesta task. Spec lista esses como parte do "MIDI Catalog Service" mas eles são integração com dados reais → TASK-015 (daily backend) e TASK-018 (catalog seed). O engine desta task é intencionalmente desacoplado da fonte: aceita URL OU ArrayBuffer, parseia, toca.
      • **`play(phase)` recebe `PhaseConfig` inteiro em vez de só o número 1-4** (como a spec literal sugere). Anti-cheat: o client nunca tem os 4 configs em memória de uma vez; o caller (socket handler de TASK-010 ou daily controller de TASK-016) entrega um config por vez. Deviação semântica zero.
      • **Autoplay overlay já ativado** (M6 da spec): rAF pause NOT done, Safari iOS `Tone.start()` gate presente via `StartAudioOverlay`. Overlay renderiza até `Tone.context.state === 'running'`.
    → Validação:
      • pnpm lint: 4/4 verdes (53 arquivos checked no @wts/web)
      • pnpm type-check: 4/4 verdes
      • pnpm build: 3/3 verdes; nova rota `/[locale]/dev/audio` (73.3 kB, 209 kB First Load — carrega Tone.js client-side só neste route)
      • Route count: 19 pages (+2 vs TASK-008: dev/audio × 2 locales)
    → Pendente de smoke manual (não bloqueia — a sprint só vira crítica no QA da TASK-022):
      • `pnpm dev` → `/pt-BR/dev/audio` → ver overlay "Toque para começar" → clicar → overlay some
      • Clicar "Carregar melodia de teste" → info do MIDI aparece (120 BPM, 2 tracks, ~8s)
      • Clicar Fase 1 → toca scale C-D-E-F (primeiros 4 beats só melodia)
      • Clicar Fase 4 → toca scale completo + bass (8 beats, 2 tracks)
      • Botão stop interrompe imediatamente; replay repete fase atual
      • Barra de progresso chega a 100% no fim
      • Cross-browser: Chrome Desktop, Firefox Desktop, Safari Desktop, Chrome Android, Safari iOS ≥15. PolySynth é universalmente suportado — risco é no Tone.start() no iOS (mitigado pelo overlay)
    → Fora de escopo / próximas tasks:
      • AudioVisualizer que consome `analyser` → TASK-006 (próxima)
      • Real soundfont loading (Salamander piano ou FatBoy) → TASK-018 (seed catalog) ou follow-up dedicado
      • Service worker cache de soundfonts com 20MB budget + versionamento → quando assets reais existirem
      • REST endpoints de MIDI catalog → TASK-015 / TASK-018 / TASK-021
      • Page Visibility pause → TASK-022 QA pass
      • Entry em `/admin/docs/arch/audio` → TASK-029

---

### [✓] TASK-008: Página de Perfil — 2026-04-17
    Concluída em Sprint 2. Spec: `specs/features/03-auth.md`.
    → Entregue:
      • `apps/web/src/app/[locale]/profile/page.tsx` — Server Component com `export const dynamic = 'force-dynamic'` (depende da session cookie); `generateMetadata` via namespace `metadata.profile*`; fetch de `public.users` pelas colunas necessárias (nickname, avatar_url, created_at, total_games/wins/correct, daily_streak, max_daily_streak, points_total, level, xp); renderiza `<GuestEmptyState />` se não houver user ou perfil, senão `<ProfileCard /> + <StatGrid /> + <LogoutButton />`
      • `apps/web/src/app/[locale]/profile/actions.ts` — Server Actions (`'use server'`):
        - `checkNicknameAvailability(input)` — valida regex + profanity, compara com nickname atual (retorna `unchanged` se igual), consulta `users` por nickname pra detectar colisão; retorna `{status: 'available'|'taken'|'invalid'|'profanity'|'unchanged'}`
        - `updateNickname(input)` — valida, chama Supabase `update` com RLS protegendo (só atualiza própria row via `auth.uid() = id`), mapeia erro Postgres `23505` (unique violation) pra `taken`; `revalidatePath('/[locale]/profile', 'page')` no sucesso; retorna `{ok, nickname}` ou `{ok: false, reason}`
      • `apps/web/src/lib/auth/profanity.ts` — Set com ~24 entradas: nomes reservados (admin, moderator, system, bot, root, null, undefined, anonymous, etc) + profanity básica EN+PT-BR; `isBlockedNickname(s)` lowercase match
      • `apps/web/src/components/profile/profile-card.tsx` — Server Component: UserAvatar large + memberSince (formatado via `useFormatter().dateTime` em pt-BR/en) + NicknameInput embedded
      • `apps/web/src/components/profile/nickname-input.tsx` — Client Component com máquina de estados `Status`: `idle|unchanged|invalid|profanity|checking|available|taken|saving`. Valida local primeiro (regex + profanity), se passa chama `checkNicknameAvailability` com debounce de 500ms e tracking de requestId pra discard de responses stale. Botão Save habilitado só em `available`; Cancel aparece só quando `isDirty`; toast sucesso/erro via sonner; `router.refresh()` pós-save; helper text traduzido com cor por tom (red em erro, green em available, muted em neutros)
      • `apps/web/src/components/profile/stat-grid.tsx` — Server Component responsive grid `grid-cols-2 sm:grid-cols-4`; 8 stat cards com ícones lucide (Sparkles, Award, Gamepad2, Trophy, CheckCircle2, Flame×2, Coins) com accents por cor (cyan/magenta/yellow/green/orange); números formatados via `Intl.NumberFormat(locale)` (tabular-nums)
      • `apps/web/src/components/profile/logout-button.tsx` — Client Component: useAuth().signOut + toast + `router.push('/') + router.refresh()` dentro de useTransition
      • `apps/web/src/components/profile/guest-empty-state.tsx` — Server Component com título, descrição e 2 CTAs (Entrar → /login, Voltar → /)
      • `apps/web/messages/pt-BR.json` + `en.json` — adicionado `metadata.profileTitle/profileDescription` + namespace `profile.*` completo: heading, memberSince (ICU `{date}`), nickname (label/edit/save/cancel/saving/helper/invalid/taken/profanity/checking/available/unchanged/saved/saveError), stats (heading + 8 stat labels), signOut/signOutSuccess, guestEmpty (title/description/signIn/backToHome)
    → Decisões / desvios da spec:
      • A spec original dizia `PATCH /api/profile` no Fastify. Implementei como **Next.js Server Action** em vez disso — razões: (1) mutação simples de uma coluna na própria row do user, RLS já garante autorização; (2) reaproveita o Supabase server client que já lê cookies da sessão; (3) evitou setup de middleware de Bearer token no Fastify que é escopo de TASK-009 (Socket.io + endpoints de jogo). O server Fastify continua reservado pra ações que precisam de service role ou de bidirecional real-time.
      • `revalidatePath('/[locale]/profile', 'page')` no updateNickname dispara refetch do profile server-side; combinado com `router.refresh()` no client garante que o novo nickname aparece em PlayerList/GameChat quando essas telas existirem.
    → Validação:
      • pnpm lint: 4/4 verdes (44 arquivos no @wts/web)
      • pnpm type-check: 4/4 verdes
      • pnpm build: 3/3 verdes; `/[locale]/profile` marcado `●` no output mas sem HTML pré-renderizado em `.next/server/app/[locale]/profile/` (apenas `page.js` → dynamic per-request). `force-dynamic` adicionado como documentação explícita da dependência de session.
      • Route count no build: 17 pages totais (home×2 + login×2 + terms×2 + privacy×2 + profile×2 + auth/callback + offline + _not-found)
      • Validações do spec cobertas:
        - Nickname únicco enforced em 3 camadas: regex client-side, profanity client+server, unique constraint do DB
        - 3-20 chars + `[a-zA-Z0-9_]` enforced em regex (isValidNickname) + DB check constraint
        - Profanity em server action (não depende de client pra enforcement)
        - Guest renderiza empty state em vez de perfil
    → Pendente de smoke manual (não bloqueia, depende de browser):
      • Login OAuth → `/pt-BR/profile` exibe avatar do Google/Discord + nickname auto-gerado pelo trigger `handle_new_user`
      • Editar nickname: digitar → debounce 500ms → "Disponível" → Save → toast "Nickname atualizado" → recarregar confirma persistência
      • Nickname duplicado: tentar um que já exista → mostra "já está em uso"
      • Nickname bloqueado: tentar "admin" ou "moderator" → "não é permitido"
      • Logout → redireciona pra home, cookie limpo, next visit a /profile vê GuestEmptyState
      • Guest visita /profile → GuestEmptyState com CTA pra /login
    → Fora de escopo / próximas tasks:
      • Avatar upload customizado (só OAuth avatar por ora) — pode virar feature futura
      • Sync Supabase avatar com providers cuja imagem mudou (raro, usuário edita em Google etc)
      • Entry em `/admin/docs/setup` + `/admin/docs/progress` → TASK-029

---

### [✓] TASK-007: Auth com Supabase (Google + Discord) — 2026-04-17
    Concluída em Sprint 2 (primeira da sprint). Spec: `specs/features/03-auth.md`.
    → Entregue:
      • `apps/web/src/lib/auth/guest.ts` — `getGuestSession` / `setGuestSession` / `clearGuestSession` / `isValidNickname` com regex `^[a-zA-Z0-9_]{3,20}$`; guestId gerado via `crypto.randomUUID()`; keys `wts_guest_id` + `wts_guest_nickname` no localStorage
      • `apps/web/src/hooks/use-auth.tsx` — `AuthProvider` (client) + `useAuth()` hook. API: `{ user, guest, isGuest, isLoading, signInWithGoogle(next?), signInWithDiscord(next?), signOut(), guestLogin(nickname) }`. Recebe `initialUser` do Server Component pra evitar flicker; subscribe em `supabase.auth.onAuthStateChange` pra updates live; ao logar, limpa guest state local + localStorage
      • `apps/web/src/components/auth/user-avatar.tsx` — wraps Radix Avatar, fallback de iniciais (split por whitespace/underscore, primeiras 2 letras), cor de fundo determinística por hash do nickname (5 paletas: cyan/magenta/yellow/green/orange), sizes sm/md/lg
      • `apps/web/src/components/auth/login-form.tsx` — conteúdo reutilizável: botões Google + Discord (SVG brand marks inline) com estado loading, divider "or", input de nickname com validação client-side (empty + regex), submit chama `guestLogin` e navega via `router.push(next ?? '/')`, toast de erro em falha de OAuth
      • `apps/web/src/components/auth/login-modal.tsx` — wrap do LoginForm em `Dialog` (Radix) pronto pra uso contextual ("sign in to save progress"); fecha modal no guest submit ou OAuth start
      • `apps/web/src/components/auth/auth-menu.tsx` — renderiza 3 estados: logado (avatar+nickname como `<Link href="/profile">`), guest (badge "Guest · nickname" + "Sign in" ghost button), anônimo ("Sign in" secondary button). Loading mostra skeleton 40px. Evita precisar de DropdownMenu — logout fica pra TASK-008 na página de perfil
      • `apps/web/src/components/auth/guest-banner.tsx` — banner fino `useAuth` + render condicional quando `isGuest`; CTA linkando pra /login
      • `apps/web/src/app/auth/callback/route.ts` — GET handler: valida `code`, chama `exchangeCodeForSession`, redireciona pra `next` sanitizado (rejeita `//` e não-/ pra evitar open-redirect), fallbacks pra `/login?error=...` em erro ou code ausente. Fora do `[locale]` group porque callback URL do Supabase não tem prefixo de locale
      • `apps/web/src/app/[locale]/login/page.tsx` — Server Component com `generateMetadata` (title/description do namespace `metadata.login*`), lê `searchParams` (next, error), renderiza card com título + subtitle + banner de erro inline se `?error=...` + LoginForm. Footer só com LocaleSwitcher
      • `apps/web/src/app/[locale]/layout.tsx` — fetch de `initialUser` via `createSupabaseServerClient().auth.getUser()` (com guard se Supabase env ausente); wrap de children em `<AuthProvider initialUser={...}>` dentro do NextIntlClientProvider
      • `apps/web/src/app/[locale]/page.tsx` — adicionado `<GuestBanner />` acima de tudo + `<header>` com `<AuthMenu />` justify-end
      • `apps/web/src/middleware.ts` — matcher atualizado pra excluir `/auth/*` (callback route é locale-agnostic; intl não deve redirecionar). Ordem do chain mantida: supabase refresh → intl
      • `apps/web/messages/pt-BR.json` + `en.json` — namespace `metadata.loginTitle/loginDescription` + namespace `auth.*` completo: login (title, subtitle, providers.google/discord, divider, guest.label/placeholder/submit/helper/invalid/empty, error, backToHome), menu (profile, signIn, signOut, guestLabel, viewProfile com ICU `{nickname}`), banner (guestCta, signIn)
    → Decisões:
      • UI de perfil/logout fica no escopo da TASK-008 (avatar no AuthMenu hoje só linka pra /profile); evitou adicionar DropdownMenu como dep nova
      • LoginModal existe mas ainda sem call sites — pronto pra ser montado em TASK-013/016 quando guests tentam salvar progresso
      • `next` param é sanitizado no callback: apenas paths começando com `/` e não `//` são aceitos; resto vira `/`
    → Validação:
      • pnpm lint: 4/4 verdes (0 warnings, 36 arquivos checked no @wts/web)
      • pnpm type-check: 4/4 verdes
      • pnpm build: 3/3 verdes; next gera `/[locale]/login` como SSG em pt-BR + en (6.19 kB / 223 kB first load), `/auth/callback` como Dynamic (ƒ, 126 B), middleware 118 kB estável
      • Supabase session refresh continua rodando em todas as rotas exceto `/auth/*` (intencional — callback handler cria o próprio server client)
    → Pendente de smoke manual (não bloqueia, depende de browser):
      • Login Google end-to-end: `/pt-BR/login` → botão Google → consent screen → `/auth/callback?code=...` → `/pt-BR` logado; `SELECT * FROM public.users WHERE email='...'` deve retornar 1 row (trigger `handle_new_user`)
      • Login Discord end-to-end (mesmo fluxo)
      • Guest mode: digita nickname → "Jogar como convidado" → localStorage tem `wts_guest_id` + `wts_guest_nickname` → badge "Guest · X" aparece no header → banner "Crie uma conta..." aparece no topo
      • Reload: sessão OAuth persiste (cookie httpOnly Supabase); guest state também (localStorage)
      • Logout: clear de session cookies + localStorage (signOut implementado, UI chega em TASK-008)
    → Fora de escopo / próximas tasks:
      • `/profile` page + logout button → TASK-008
      • Profanity filter no nickname → TASK-008 (server-side via Zod + lista básica)
      • Debounce + check de unicidade do nickname → TASK-008
      • Documentar fluxo OAuth + criar primeiro admin (SQL UPDATE) no Dev Docs Portal → TASK-029

---

### [✓] TASK-009: Socket.io Server + Room Management — 2026-04-17
    Concluída em Sprint 3. Spec: `specs/features/04-multiplayer-rooms.md`.
    → Entregue:
      • `socket.io@^4` adicionado ao server, `socket.io-client@^4` adicionado ao web
      • `apps/server/src/socket/index.ts` — Socket.io init, attach to Fastify HTTP server, CORS config, ping/pong settings
      • `apps/server/src/socket/auth-middleware.ts` — validates Supabase JWT on handshake; guests accepted without token (identified as `guest:<socketId>`)
      • `apps/server/src/services/room-manager.ts` — in-memory room state store (`Map<string, ServerRoomState>`): createRoom, joinRoom, leaveRoom, getRoom, listPublicRooms, reconnectPlayer, disconnectPlayer, addChatMessage, destroyRoom, toSnapshot
      • `apps/server/src/socket/room-events.ts` — room:create (Zod-validated config + rate limiting), room:join (with reconnection), room:leave, disconnect (30s grace period)
      • `apps/server/src/types/room.ts` — ServerPlayer, ServerRoundState, ServerRoomState, CorrectAnswer types
      • `toSnapshot()` ensures midi answers never leak to client
      • Host migration on leave (earliest-joined connected player)
      • Auto-cleanup: 5-min timer for empty rooms, 30s disconnect grace period
      • Room codes: 5-char from ROOM_CODE_ALPHABET with collision retry
    → Validação:
      • pnpm lint / type-check / build: all green

---

### [✓] TASK-010: Game Loop Engine — 2026-04-17
    Concluída em Sprint 3 (critical path). Spec: `specs/features/04-multiplayer-rooms.md`.
    → Entregue:
      • `apps/server/src/services/game-loop.ts` — FSM: LOBBY → ROUND_START → PHASE_1-4 → ROUND_END → GAME_END. Factory pattern `createGameLoop(io, midiProvider)`. Timer orchestration with defensive null-checks. Phase audio data broadcast via `phase:start`. Round reveal via `round:reveal`. 1-second state sync ticks.
      • `apps/server/src/services/scoring.ts` — `calculateScore(phase, position)` using PHASE_SCORES constants. `resolveGuessPosition` with SIMULTANEOUS_ANSWER_WINDOW_MS (50ms).
      • `apps/server/src/socket/game-events.ts` — game:start (host-only), game:guess (with rate limiting), chat:send (with rate limiting, routed through guess verifier during phases)
      • `apps/server/src/services/midi-provider.ts` — MidiProvider interface + StubMidiProvider with 15 hardcoded entries for testing until TASK-018
      • Early phase advance when all connected players guess correctly
      • Anti-cheat: answers never sent to client; round:reveal only at ROUND_END; all scoring server-side
    → Validação:
      • pnpm lint / type-check / build: all green

---

### [✓] TASK-011: Guess Verification System — 2026-04-17
    Concluída em Sprint 3. Spec: `specs/features/04-multiplayer-rooms.md`.
    → Entregue:
      • `apps/server/src/services/guess-verifier.ts` — normalizeText (toLower, NFD strip diacritics via Unicode Mn category, strip non-alphanumeric, collapse whitespace, strip leading articles), levenshteinDistance (standard DP), scaleThreshold for long candidates, verifyGuess pipeline
      • Checks accepted titles first (min distance), then accepted artists for artist_match
      • Thresholds from shared constants: ≤1 correct, 2-3 hot, 4-5 warm (multiplayer mode)
      • Integrated into game loop: correct → score + broadcast, hot/warm/artist_match → bot feedback, wrong → chat message
    → Validação:
      • pnpm lint / type-check / build: all green

---

### [✓] TASK-027: Rate Limiting — 2026-04-17
    Concluída em Sprint 3. Spec: `specs/features/04-multiplayer-rooms.md`.
    → Entregue:
      • `apps/server/src/middleware/rate-limiter.ts` — SocketRateLimiter class: sliding window per scope (guess 1/sec, message 5/10s, room-create 3/10min). Periodic 60s cleanup of stale entries. Cleanup on socket disconnect.
      • `@fastify/rate-limit` registered in server entry: 60 req/min per IP for REST API
      • Integrated in room-events (room:create) and game-events (game:guess, chat:send)
      • Emits `error:rate_limited` with scope and retryAfterMs on rejection
    → Validação:
      • pnpm lint / type-check / build: all green

---

### [✓] TASK-004: PWA Setup com Serwist — 2026-04-17
    Concluída em Sprint 1 (última da sprint). Spec: `specs/features/07-pwa-sharing.md`.
    → Entregue:
      • Serwist 9 + @serwist/next instalados; sharp como devDep para gerar ícones
      • `public/icon-source.svg` — visualizador de barras sintéticas (cyan/magenta/yellow/green) sobre fundo dark com borda arredondada; source-of-truth para regenerar PNGs
      • `scripts/generate-icons.ts` usando sharp gera `public/icons/icon-{72,96,128,144,152,180,192,384,512}.png` + `public/favicon.png` (32px); runnable via `pnpm --filter @wts/web run generate-icons` (node nativo com --experimental-strip-types, sem precisar tsx)
      • `public/manifest.webmanifest` — name/short_name, description, start_url, scope, display standalone, orientation any, theme_color + background_color #0a0a1a, 8 sizes declarados, categories [games, music, entertainment]
      • `src/app/sw.ts` — Serwist service worker com `defaultCache` runtime strategies, `skipWaiting`, `clientsClaim`, `navigationPreload`, e fallback `/offline` em navigation requests
      • `src/app/offline/{layout,page}.tsx` — página bilíngue (EN + pt-BR) hardcoded (sem i18n — sem rede, sem messages); layout próprio com `<html lang="en">` já que fica fora do `[locale]` group
      • `next.config.ts` encadeia `withNextIntl` com `withSerwist` (desabilitado em development para evitar cache stale durante dev)
      • `app/[locale]/layout.tsx` `generateMetadata` exporta `manifest: '/manifest.webmanifest'`, `icons.icon` (favicon 32), `icons.apple` (180x180), `appleWebApp` com status bar translucent
      • Middleware matcher exclui `offline` para que o Serwist fallback funcione sem passar por i18n/Supabase refresh
      • `.gitignore` já cobria sw.js + swe-worker-*.js (gerados)
    → Validação:
      • pnpm lint / type-check: 4/4 / 4/4 verdes
      • pnpm build: 3/3 verdes; output confirma `(serwist) Bundling the service worker script with the URL '/sw.js' and the scope '/'`
      • Rotas buildadas: `/pt-BR`, `/en`, `/pt-BR/{terms,privacy}`, `/en/{terms,privacy}` (SSG × 2 locales = 6) + `/offline` (estático) + `/_not-found`
      • `public/sw.js` gerado (~44 kB); ícones PNG todos presentes
      • Middleware 118 kB mantido
    → Pendente (não bloqueia):
      • Rodar Lighthouse em `pnpm build && pnpm start` — meta PWA ≥ 90 (precisa Chrome DevTools headless; deixo para você ou TASK-022)
      • Verificar instalação real: abrir `/pt-BR` no Chrome Android → menu ⋮ → "Adicionar à tela inicial" → ícone aparece com o source gerado
      • Testar offline: DevTools → Network → Offline → navegar para rota nova → cai no /offline; rota já visitada deve carregar do cache
      • OG Images + icons adaptáveis (maskable) ficam pra TASK-019 / Fase 2
      • Atualizar `/admin/docs/arch/...` com a estratégia de cache Serwist quando TASK-029 estiver pronta

---

### [✓] TASK-012: Tela de Salas + Lobby — 2026-04-17
    Concluída em Sprint 4. Spec: `specs/features/04-multiplayer-rooms.md`.
    → Entregue:
      • `apps/web/src/hooks/use-room.ts` — hook Socket.io: join, leave, state sync (versioned), reconnect, chat, phase:start/round:reveal events. Auth via Supabase token (logado) ou guest (sem token)
      • `apps/web/src/app/[locale]/(game)/layout.tsx` — route group layout com AudioContextProvider
      • `apps/web/src/app/[locale]/(game)/rooms/page.tsx` — client page: join by code, create room dialog, public room list
      • `apps/web/src/app/[locale]/(game)/room/[code]/page.tsx` — client page: state-driven rendering (LOBBY → GameBoard → GameResults)
      • `apps/web/src/components/room/room-list.tsx` — polls GET /rooms every 5s, skeleton loading, empty state
      • `apps/web/src/components/room/room-lobby.tsx` — room code display, copy link, config summary badges, player list, start/leave buttons
      • `apps/web/src/components/room/room-config.tsx` — form: category select, rounds/time button groups, max players slider, public checkbox
      • `apps/web/src/components/room/player-list-lobby.tsx` — player list with avatar, crown (host), guest badge, connected indicator
      • `apps/web/src/components/room/create-room-dialog.tsx` — Radix Dialog wrapping RoomConfigForm + create action
      • `apps/server/src/routes/rooms.ts` — `GET /rooms` REST endpoint returning `roomManager.listPublicRooms()`
      • i18n: `room.*` namespace added to pt-BR + en (title, join, create, config, categories, list, lobby)
    → Validação:
      • pnpm lint / type-check / build: all green

---

### [✓] TASK-013: Tela de Jogo — Game Board — 2026-04-17
    Concluída em Sprint 4 (critical path). Spec: `specs/features/04-multiplayer-rooms.md`.
    → Entregue:
      • `apps/web/src/hooks/use-game-state.ts` — pure derivation hook: status, phase, timeRemaining (100ms interval), timerProgress, timerColor (cyan/yellow/red), sortedPlayers, myCorrect, correctPlayerIds
      • `apps/web/src/components/game/game-board.tsx` — main container: 3-column desktop (players | board | chat), mobile single-column with drawer triggers; wires useMidiPlayer to phase:start events, loads MIDI on first phase of each round
      • `apps/web/src/components/game/player-list.tsx` — ranked sidebar: avatar, nickname, score (accent-yellow), correct checkmark, offline indicator
      • `apps/web/src/components/game/game-chat.tsx` — auto-scroll chat, player vs bot styling (cyan for bot), aria-live="polite"
      • `apps/web/src/components/game/chat-input.tsx` — text input + send button, disabled when already correct, placeholder switches between guess/chat mode
      • `apps/web/src/components/game/game-timer.tsx` — progress bar cyan→yellow→red with pulse animation when urgent (<20%)
      • `apps/web/src/components/game/phase-indicator.tsx` — 4 dots: completed (muted), active (cyan glow), upcoming (outlined)
      • `apps/web/src/components/game/round-transition.tsx` — fullscreen overlay: "Round X of Y" + animated 3-2-1 countdown + "Go!"
      • `apps/web/src/components/game/round-reveal.tsx` — fullscreen overlay: title, artist, correct players in green badges, confetti via canvas-confetti
      • `apps/web/src/components/game/mobile-drawer.tsx` — Radix Dialog styled as bottom sheet for players/chat on mobile
      • `apps/web/src/hooks/use-room.ts` — extended with phase:start and round:reveal event handling
      • Deps: `canvas-confetti`, `@radix-ui/react-visually-hidden`
      • i18n: `game.*` namespace added to pt-BR + en
    → Decisões:
      • Audio integration: phase:start includes midiFileUrl; client loads MIDI once per round, plays per phase
      • Chat during phases: client always sends chat:send; server routes through guess verifier automatically
      • Mobile: below lg breakpoint → single column, players/chat in bottom sheet drawers
    → Fixes aplicados:
      • webpack `extensionAlias` em next.config.ts para resolver .js→.ts no barrel do @wts/shared
      • Removido re-export de env do barrel shared (Node.js deps quebravam client bundle)
    → Validação:
      • pnpm lint / type-check / build: all green
      • Build: `/[locale]/room/[code]` 13.5 kB (330 kB first load com Tone.js)

---

### [✓] TASK-014: Tela de Resultado + Compartilhamento — 2026-04-17
    Concluída em Sprint 4. Spec: `specs/features/04-multiplayer-rooms.md`.
    → Entregue:
      • `apps/web/src/components/game/podium.tsx` — animated top-3: display order 2nd|1st|3rd, gold/silver/bronze styling, slide-up animation with stagger delay
      • `apps/web/src/components/game/final-ranking.tsx` — full sorted player list: rank, avatar, nickname, score, correctCount
      • `apps/web/src/components/game/match-stats.tsx` — 3-card grid: rounds, players, total correct (with lucide icons + accent colors)
      • `apps/web/src/components/game/share-result-button.tsx` — Web Share API on mobile, clipboard fallback on desktop, toast "Copied!"
      • `apps/web/src/components/game/game-results.tsx` — container: podium + match stats + final ranking + share + play again button
      • "Play Again" for host emits game:start (server accepts from GAME_END); non-host sees "Waiting for host..."
    → Pre-work (shared types):
      • `PhaseConfig` typing on phase:start audioData, `midiFileUrl` added to phase:start payload
      • `correctCount: number` added to RoomPlayer, tracked server-side in game-loop
      • `phaseAudioData: PhaseConfig | null` in RoundSnapshot (was `unknown`)
    → Validação:
      • pnpm lint / type-check / build: all green
      • Build: 13.5 kB room page (includes results components)

---
