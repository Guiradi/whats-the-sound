# Feature: Developer Documentation Portal (/admin/docs)

## Fase: 1 — MVP (infra de equipe)
## Prioridade: P1
## Estimativa: ~5h (route + middleware + conteúdo inicial Sprint 1-2)
## Depende de: 03-auth (role admin)

## Overview

Portal de documentação interna acessível em `/admin/docs`, gated pelo role `admin` do Supabase. Vive **dentro** do `apps/web` (como MDX pages), não em app separado. É o **living document** que cresce a cada task concluída: stack, setup local, arquitetura, convenções, troubleshooting, e um índice de "o que já foi feito" amarrado às tasks do backlog.

**Por que essa feature existe:** à medida que mais developers entram no projeto, o onboarding não pode depender de ler 10 specs e 2 READMEs. Precisamos de um ponto único, sempre atualizado, cobrindo "como rodar o projeto" e "como as peças se encaixam" — atualizado **no mesmo PR** da feature implementada, nunca depois.

**Não é** um site de docs público, nem documentação de API para terceiros. É interno.

## Requisitos Funcionais

### Acesso e Proteção

- Rota: `/admin/docs` (e sub-rotas por seção, ex: `/admin/docs/setup`, `/admin/docs/arch/database`).
- Proteção: middleware `requireAdmin` que valida `users.role = 'admin'` via Supabase session cookie.
  - Não autenticado → redirect `/login?return=/admin/docs`.
  - Autenticado mas não admin → `404` (nem revela que a rota existe).
  - Admin → acesso livre.
- Middleware é compartilhado com `/admin/catalog` (TASK-021) — não duplicar.
- Em dev local: se `ALLOW_ADMIN_WITHOUT_ROLE=true` no `.env`, pula a checagem (facilita desenvolvimento antes de seedar um user admin). Nunca usar em prod.
- Conceder role admin a um user: via SQL manual (`UPDATE users SET role='admin' WHERE nickname='...'`). Documentado na própria docs como primeiro artigo.

### Estrutura do Conteúdo

Hierarquia inicial (cada item é uma page MDX):

```
/admin/docs
  /                          → Home: visão geral + links
  /setup                     → Como rodar localmente (node, pnpm, env vars, Supabase local)
  /arch
    /overview                → Diagrama de componentes (copia de specs/technical/architecture.md)
    /monorepo                → Workspaces, turbo pipelines, shared package
    /database                → Schema, RLS, triggers (resumo + link para database.md)
    /real-time               → Socket.io, room state, reconnect payload
    /audio                   → Tone.js, soundfonts, phases
  /conventions               → Naming, Biome rules, commits, PR workflow
  /conventions/i18n          → next-intl, estrutura de keys, como adicionar string nova, ICU plurals
  /troubleshooting           → Problemas comuns e soluções (ex: Safari autoplay, pnpm script approval)
  /progress                  → "O que já foi feito" — índice por TASK concluída com link para completed.md
  /runbooks
    /supabase-admin          → Como criar primeiro admin, rodar migrations
    /deploy                  → Passos de deploy (quando TASK-023 estiver pronta)
```

### Navegação e UI

- Sidebar fixa (desktop) / drawer (mobile) com a hierarquia acima
- Search simples por título (fuse.js client-side) sobre um índice gerado no build
- Breadcrumb no topo
- TOC por página (auto-gerada a partir de headings H2/H3)
- "Última atualização: TASK-XXX — 2026-MM-DD" no rodapé de cada page (hardcoded; atualizado manualmente no PR)
- Usa o design system dark existente (docs/design-system.md), sem tema claro

### MDX Processing

- Usar `@next/mdx` com `remark-gfm` (tabelas, task lists) e `rehype-slug` + `rehype-autolink-headings` (anchors em H2/H3)
- Code blocks com `shiki` (highlighting; cacheado em build)
- Arquivos `.mdx` em `apps/web/src/content/dev-docs/**` — resolvidos dinamicamente pela rota `[...slug]`
- Components MDX customizados disponíveis (usar com parcimônia): `<Callout>`, `<TaskRef id="TASK-001" />` (link para completed.md), `<Diagram src="..." />`

### Convenção de Atualização (adicionada ao CLAUDE.md)

**Toda TASK concluída** deve atualizar pelo menos uma page MDX:

- Feature tasks (TASK-005 MIDI, TASK-009 Socket.io, etc) → atualizam a seção `arch/` correspondente
- Infra tasks (TASK-001 Monorepo, TASK-024 CI, TASK-026 Env+Logger) → atualizam `setup` e/ou `monorepo`
- Toda TASK → adiciona entry em `progress` com o resumo do que entregou

Durante a criação da TASK-029, o conteúdo inicial cobre **retroativamente** TASK-001, 024, 026, 028, 002, 003, 004, 005, 006, 007, 008 (ou quantas tiverem ficado prontas até lá).

## Requisitos Não-Funcionais

- MDX pages fazem static generation (SSG) — zero latência runtime, cache da Vercel
- Build do portal **não pode** aumentar tempo de build do web em mais de 30% (atualmente ~20s; cap em 26s com docs)
- Search client-side com índice pré-gerado (build time), não server
- Funciona sem JS (SSR renderiza HTML completo; search só habilita com JS)

## Componentes

- `middleware/require-admin.ts` — compartilhado com TASK-021
- `app/(internal)/admin/docs/layout.tsx` — sidebar + shell
- `app/(internal)/admin/docs/[[...slug]]/page.tsx` — route catch-all que resolve MDX
- `components/docs/DocsSidebar.tsx`, `DocsSearch.tsx`, `DocsTOC.tsx`, `DocsBreadcrumb.tsx`
- `components/docs/mdx/Callout.tsx`, `TaskRef.tsx`
- `lib/docs/index.ts` — utilitários para listar pages, gerar índice de busca, parsear frontmatter

## Telas / Fluxos

### Tela: `/admin/docs` (home)
- **Não-admin:** 404 (não revela que rota existe)
- **Admin:** cards com atalhos para "Setup", "Arch Overview", "Progress", "Runbooks"; sidebar sempre visível

### Tela: `/admin/docs/[...]` (page)
- Renderiza MDX; sidebar marca item ativo; TOC lateral (desktop)

## Edge Cases

- **MDX malformado:** build falha. Biome não checa MDX — adicionar `pnpm docs:check` que parseia tudo (roda no CI via TASK-024).
- **Link quebrado para spec:** `<TaskRef>` com id inexistente → renderizar com erro visual em dev, fallback texto em prod.
- **Primeiro admin não existe:** `/admin/docs` 404 para todos. Documentar na home de docs (acessada com `ALLOW_ADMIN_WITHOUT_ROLE=true`) como criar o primeiro admin.

## Decisões de Design

- **Dentro de apps/web, não separado:** zero deploy extra, mesmo auth/PWA/design system, versionado junto com o código que documenta. Trade-off aceito: build do web fica um pouco mais pesado.
- **Gated por role admin, não por IP ou basic auth:** reaproveita infra de auth que vai existir de qualquer forma. Dev pode pular localmente via env flag.
- **Living document por convenção, não por automação:** não tentamos gerar docs a partir de specs/código. A convenção é simples (cada PR atualiza MDX), e o custo de automação não vale o benefício no MVP.
- **Não é público:** evita expectativa de "docs de produto". Decisões arquiteturais e troubleshooting são para o time, não para usuários finais.
- **Página `/progress` como índice de tasks concluídas:** é o "changelog humano" do projeto — complementa o `tasks/completed.md` com contexto narrativo.
