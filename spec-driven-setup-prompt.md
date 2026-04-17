# Prompt: Spec-Driven Development Setup

> Cole este prompt no início de uma conversa com o Claude (Code ou Cowork) para que ele estruture seu projeto seguindo o modelo spec-driven.

---

## O Prompt

```
Preciso que você me ajude a estruturar um projeto de software seguindo o modelo "Spec-Driven Development" — um modelo onde toda a documentação, especificações, regras e tarefas são organizadas em arquivos .md separados ANTES de escrever qualquer código. O agente de IA (Claude Code) usa esses arquivos como contexto para executar cada task com precisão cirúrgica.

Ultrathink this. Esse é o modelo mais eficiente que existe para trabalhar com agentes de código como Claude Code, porque cada arquivo funciona como uma "memória persistente" que guia o agente session após session.

---

## 1. ESTRUTURA DE DIRETÓRIOS

Crie esta estrutura de diretórios na raiz do projeto:

```
projeto/
├── CLAUDE.md                    ← Arquivo raiz que o Claude Code lê automaticamente
├── .claude/
│   └── rules/                   ← Regras contextuais (ativadas por path)
│       ├── frontend.md          ← Regras quando editar src/app/** ou src/components/**
│       ├── database.md          ← Regras quando editar supabase/** ou banco
│       ├── i18n.md              ← Regras quando editar src/messages/** ou UI
│       └── testing.md           ← Regras quando editar *.test.*
├── specs/
│   ├── overview.md              ← Visão do produto, problema, solução, personas, fases
│   ├── features/                ← Uma spec por feature (numeradas por ordem)
│   │   ├── 01-auth.md
│   │   ├── 02-user-profile.md
│   │   ├── 03-dashboard.md
│   │   └── ...
│   └── technical/               ← Specs técnicas
│       ├── architecture.md      ← Stack, diagrama, decisões arquiteturais
│       ├── database.md          ← Schema completo, enums, RLS, migrations
│       └── api.md               ← Endpoints, contratos, autenticação
├── docs/
│   ├── design-system.md         ← Cores, tipografia, espaçamentos, componentes visuais
│   ├── ux-principles.md         ← Princípios de UX, padrões de interação, tom de voz
│   ├── business-context.md      ← Modelo de negócio, monetização, métricas
│   └── architecture.md          ← Visão técnica expandida (diagramas, fluxos)
├── tasks/
│   ├── backlog.md               ← TODAS as tasks com spec detalhada de cada uma
│   ├── execution-plan.md        ← Sprints organizadas com ordem e dependências
│   ├── completed.md             ← Tasks concluídas (arquivo histórico)
│   └── sprint-XX.md             ← Snapshot de cada sprint (opcional)
└── src/                         ← Código fonte (só começa DEPOIS das specs)
```

---

## 2. O QUE CADA ARQUIVO DEVE CONTER

### CLAUDE.md (o mais importante)

Este é o arquivo que o Claude Code lê automaticamente no início de cada sessão. Ele deve conter:

1. **Descrição do projeto** — 1-2 frases
2. **Stack** — lista completa de tecnologias com versões
3. **Commands** — todos os comandos do projeto (dev, build, lint, test, migrate, etc.)
4. **Code Style** — regras de código obrigatórias:
   - Linter/formatter usado
   - Convenções de naming (kebab-case, PascalCase, etc.)
   - Regras de import (absolute paths, barrel exports, etc.)
   - Server vs Client components (se aplicável)
   - Regras de i18n (se aplicável)
   - Regra de "todo código em inglês, UI text via i18n"
5. **File Structure** — árvore de diretórios do src/ com explicação de cada pasta
6. **Architecture Decisions** — decisões macro (PWA, SSR, RLS, etc.)
7. **Key Conventions** — padrões que o agente DEVE seguir
8. **Workflow: Sprint Execution** — instruções de como executar tasks:
   - Ler execution-plan.md antes de começar
   - Ler a spec da task no backlog.md
   - Seguir ordem de dependências
   - Atualizar status da task ao concluir
   - Rodar validações (lint, type-check, i18n) antes de marcar como done
9. **Specs & Docs** — mapa de onde encontrar cada tipo de documentação
10. **Testing** — estratégia de testes

### .claude/rules/*.md (regras contextuais)

Cada arquivo tem um frontmatter YAML que define QUANDO a regra é ativada:

```yaml
---
paths:
  - "src/app/**"
  - "src/components/**"
---
```

Isso significa: essa regra só é carregada quando o Claude estiver editando arquivos nesses paths. Use para regras específicas de domínio que não precisam estar no CLAUDE.md global.

Exemplos de regras:
- **frontend.md** — convenções de componentes, Tailwind, acessibilidade, animações
- **database.md** — RLS obrigatório, naming de migrations, foreign keys, indexes
- **i18n.md** — checklist obrigatório de internacionalização, padrões de erro
- **testing.md** — patterns de teste, mocks, coverage mínimo

### specs/overview.md

O "pitch deck" do projeto em markdown:
- O que é o produto
- Qual problema resolve
- Solução (pilares principais)
- Público-alvo (personas com idade, motivação, comportamento)
- Princípios inegociáveis
- Fases do produto (roadmap macro com semanas/meses)
- Contexto de negócio (mercado, diferencial, monetização)
- Métricas de sucesso

### specs/features/XX-nome.md

Uma spec por feature. Cada uma segue este template:

```markdown
# Feature: [Nome]

## Fase: X — [Nome da Fase]
## Prioridade: P0/P1/P2
## Estimativa: X dias
## Depende de: [lista de features que precisam estar prontas]

## Overview
[1-2 parágrafos explicando o propósito da feature]

## Requisitos Funcionais
[Lista detalhada de tudo que a feature faz, organizada por sub-feature]

## Requisitos Não-Funcionais
[Performance, acessibilidade, compatibilidade]

## Schema (se aplicável)
[DDL das tabelas, com RLS policies, indexes, triggers]

## Componentes
[Lista de componentes a criar, com props e comportamento]

## Telas / Fluxos
[Descrição de cada tela, estados (empty, loading, error, success)]

## Edge Cases
[Lista de cenários incomuns que DEVEM ser tratados]

## Decisões de Design
[Decisões específicas da feature que guiam a implementação]

## Traduções necessárias
[Lista de chaves de tradução que precisam ser criadas]
```

### specs/technical/architecture.md

- Diagrama ASCII da arquitetura (client → server → DB)
- Decisões arquiteturais (por quê cada tecnologia foi escolhida)
- Padrões de comunicação (Server Actions vs API Routes)
- Estratégia de cache
- Estratégia de autenticação/autorização
- Estratégia de deploy

### specs/technical/database.md

- Diagrama de relacionamentos (ASCII ou Mermaid)
- Schema completo de cada tabela (DDL)
- Enums
- Políticas de RLS (Row Level Security, se usar Supabase/Postgres)
- Indexes importantes
- Triggers e functions
- Migration strategy

### docs/design-system.md

- Paleta de cores (variáveis CSS + classes Tailwind)
- Tipografia (font families, sizes, weights)
- Espaçamento (ritmo base, padding/margin padrão)
- Raios de borda (cards, buttons, inputs)
- Sombras (padrão do projeto)
- Componentes base (button, input, card, avatar, modal, toast)
- Tabela de uso: "Elemento X → use Cor Y com Classe Z"

### docs/ux-principles.md

- Princípio central (1 frase)
- Lista de princípios (5-8) com explicação e exemplos práticos
- Regras de animação (tipo spring, duração, quando usar)
- Estados de tela (empty, loading, error, success) com padrão visual
- Tom de voz (como o app "fala" com o usuário)

### tasks/backlog.md

Este é o CORAÇÃO do sistema. Cada task é uma unidade atômica de trabalho que pode ser completada em uma sessão do Claude Code.

Formato:
```markdown
[status] TASK-XXX: Título da task (estimativa em horas) — spec de referência

Status: [ ] pendente, [→] em progresso, [✓] completo, [⏸] pausado/adiado
```

Cada task tem uma SPEC DETALHADA inline com tudo que o agente precisa para executar:

```markdown
[ ] TASK-001: Auth com Google OAuth (3h) — specs/features/01-auth.md
    → Migration:
      • CREATE TABLE users (...)
      • RLS: SELECT public, INSERT/UPDATE auth.uid() = id
    → Componentes:
      • LoginPage: botão Google + email/senha
      • AuthCallback: processa retorno OAuth
    → Server Actions:
      • Criar perfil automaticamente no primeiro login
    → Traduções:
      • auth.login.title, auth.login.googleButton, auth.login.emailLabel...
    → Validação:
      • Login funcional com Google
      • Sessão persiste entre reloads
      • RLS bloqueia acesso a dados de outros users
```

A spec inline da task deve ser TÃO detalhada que o agente consiga executar sem ambiguidade: schema exato, nomes de componentes, nomes de Server Actions, keys de tradução, edge cases, critérios de validação.

### tasks/execution-plan.md

Organiza as tasks em sprints com:
- Diagrama visual de dependências (ASCII)
- Ordem de execução dentro de cada sprint
- Checklist de validação por sprint
- Notas sobre tasks postergadas/bloqueadas

```markdown
## Sprint 1 — Fundação (Auth + Perfil)

Sprint 1 → Sprint 2 → Sprint 3
  Auth      Feed       Interações
  Profile   Posts      Likes/Comments
  Onboard   Image      Share

### Tasks (executar nessa ordem):
1. TASK-001: Setup do projeto + Supabase
2. TASK-002: Auth com Google OAuth
3. TASK-003: Onboarding flow
4. TASK-004: User profile

### Checklist de validação:
- [ ] pnpm build sem erros
- [ ] pnpm type-check zero erros
- [ ] pnpm biome:fix zero warnings
- [ ] Login funcional com Google
- [ ] Onboarding cria pet
- [ ] Perfil exibe dados do OAuth
```

---

## 3. PRINCÍPIOS DO MODELO

1. **Specs ANTES de código** — Nunca comece a codar sem ter a spec da feature escrita.

2. **Tasks atômicas** — Cada task deve ser completável em 1-4 horas por um agente. Se for maior, quebre em sub-tasks.

3. **Spec inline na task** — A spec do backlog.md tem TUDO: DDL, nomes de componentes, keys de tradução. O agente não precisa "adivinhar" nada.

4. **Dependências explícitas** — Toda task lista suas dependências. O agente sabe a ordem.

5. **Validação por sprint** — Cada sprint tem um checklist de validação. Não avança sem passar.

6. **Regras contextuais** — .claude/rules/ carrega regras específicas por domínio, mantendo o CLAUDE.md enxuto.

7. **Docs separados de specs** — specs/ é "o que construir", docs/ é "como funciona o sistema". Specs são consumidas durante build, docs são referência permanente.

8. **Backlog como single source of truth** — Todo trabalho pendente está em tasks/backlog.md. Nada "na cabeça" do dev.

9. **Completed.md como histórico** — Tasks finalizadas migram para completed.md, mantendo o backlog limpo.

10. **CLAUDE.md como índice** — O arquivo raiz é um índice com ponteiros para todos os outros. O agente sabe onde encontrar cada informação.

---

## 4. COMO COMEÇAR

Com base no que eu descrever sobre meu projeto, preciso que você:

1. Crie o `specs/overview.md` completo (visão do produto, personas, fases)
2. Crie uma spec de feature (`specs/features/XX-nome.md`) para CADA feature identificada
3. Crie `specs/technical/architecture.md` com a stack e decisões
4. Crie `specs/technical/database.md` com o schema completo
5. Crie `docs/design-system.md` com a identidade visual
6. Crie `docs/ux-principles.md` com os princípios de UX
7. Crie `tasks/backlog.md` com TODAS as tasks detalhadas
8. Crie `tasks/execution-plan.md` com as sprints organizadas
9. Crie `CLAUDE.md` com tudo que o agente precisa saber
10. Crie `.claude/rules/` com regras contextuais relevantes

Cada arquivo deve ser COMPLETO e DETALHADO — não placeholders. O objetivo é que após essa estruturação, um agente Claude Code consiga executar task por task sem precisar de mais contexto do que está nos arquivos.

---

## 5. MEU PROJETO

[DESCREVA SEU PROJETO AQUI — quanto mais detalhes, melhor:]

- O que é o produto?
- Qual problema resolve?
- Quem é o público-alvo?
- Quais são as features principais?
- Qual stack você quer usar? (ou deixe o agente recomendar)
- Tem preferência de design? (cores, estilo visual)
- Qual é o MVP? O que pode ficar para depois?
- Tem alguma restrição técnica? (orçamento, plataforma, integrações)
```

---

## Dicas de Uso

1. **Substitua a seção 5** com a descrição completa do seu projeto. Quanto mais contexto, melhor o resultado.

2. **Se já tem um docx/pdf com o plano**, anexe o arquivo junto com este prompt e diga: "Use o documento anexo como base para a seção 5."

3. **Se quer que o agente recomende a stack**, diga: "Recomende a melhor stack para este tipo de projeto."

4. **Após a estruturação**, comece uma nova sessão do Claude Code apontando para a pasta do projeto. Ele vai ler o CLAUDE.md automaticamente e você pode começar com "Execute a TASK-001".

5. **Entre sessões**, o agente pode perder contexto. Mas como tudo está nos arquivos .md, basta dizer "Continue de onde parou — leia o backlog e o execution-plan" e ele retoma.
