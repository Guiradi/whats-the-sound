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
