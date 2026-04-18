# Execution Plan — What's the Sound?

## Diagrama de Dependências

```
Sprint 1 (Fundação)          Sprint 2 (Engine+Auth)       Sprint 3 (Multiplayer Core)
┌──────────┐                 ┌──────────┐                 ┌──────────┐
│ TASK-001 │─────────────────│ TASK-005 │─────────────────│ TASK-009 │
│ Monorepo │──┐         ┌───│ MIDI Eng │──┐         ┌───│ Socket   │──┐
└──────────┘  │         │   └──────────┘  │         │   └──────────┘  │
              │         │   ┌──────────┐  │         │   ┌──────────┐  │
┌──────────┐  │         ├───│ TASK-006 │  │         ├───│ TASK-010 │  │
│ TASK-002 │──┤         │   │ Visualiz │  │         │   │ GameLoop │  │
│ Supabase │  │         │   └──────────┘  │         │   └──────────┘  │
└──────────┘  │         │   ┌──────────┐  │         │   ┌──────────┐  │
              │         ├───│ TASK-007 │──┤         ├───│ TASK-011 │  │
┌──────────┐  │         │   │ Auth     │  │         │   │ Guess    │  │
│ TASK-003 │──┤         │   └──────────┘  │         │   └──────────┘  │
│ Design   │  │         │   ┌──────────┐  │         │                  │
└──────────┘  │         └───│ TASK-008 │  │         │                  │
              │             │ Profile  │  │         │                  │
┌──────────┐  │             └──────────┘  │         │                  │
│ TASK-004 │──┘                           │         │                  │
│ PWA      │                              │         │                  │
└──────────┘                              │         │                  │
                                          │         │                  │
Sprint 4 (Frontend Multi)    Sprint 5 (Daily+Polish)     Sprint 6 (Admin+Deploy)
┌──────────┐                 ┌──────────┐                 ┌──────────┐
│ TASK-012 │─────────────────│ TASK-015 │                 │ TASK-021 │
│ Salas/Lo │──┐              │ Daily BE │──┐              │ Admin    │
└──────────┘  │              └──────────┘  │              └──────────┘
┌──────────┐  │              ┌──────────┐  │              ┌──────────┐
│ TASK-013 │──┤              │ TASK-016 │──┤              │ TASK-022 │
│ GameBrd  │  │              │ Daily FE │  │              │ QA Pass  │
└──────────┘  │              └──────────┘  │              └──────────┘
┌──────────┐  │              ┌──────────┐  │              ┌──────────┐
│ TASK-014 │──┘              │ TASK-017 │──┤              │ TASK-023 │
│ Result   │                 │ History  │  │              │ Deploy   │
└──────────┘                 └──────────┘  │              └──────────┘
                             ┌──────────┐  │
                             │ TASK-018 │──┤
                             │ Seed 100 │  │
                             └──────────┘  │
                             ┌──────────┐  │
                             │ TASK-019 │──┤
                             │ OG Image │  │
                             └──────────┘  │
                             ┌──────────┐  │
                             │ TASK-020 │──┘
                             │ Landing  │
                             └──────────┘
```

---

## Sprint 1 — Fundação (Estimativa: 18h)

### Tasks (executar nessa ordem):
1. **TASK-001:** Setup do Monorepo com Turborepo (2h) ✓
2. **TASK-024:** GitHub Actions CI (2h) ✓
3. **TASK-026:** Env Validation + Logger (1h) ✓
4. **TASK-028:** Páginas Legais (Terms + Privacy) (1h) ✓ — pré-requisito de OAuth
5. **TASK-003:** Design System + Tailwind Theme (2h) ✓
6. **TASK-032:** i18n Infrastructure (pt-BR + en) (3.5h) — adicionado pós-solicitação; bloqueia TASK-004 e Sprint 2+
7. **TASK-002:** Setup Supabase + Schema inicial (4.5h)
8. **TASK-004:** PWA Setup com Serwist (2h)

### Dependências:
- TASK-001 é pré-requisito de TODAS as outras tasks
- TASK-024 deve entrar logo após TASK-001 (antes de qualquer merge em main virar rotina)
- TASK-026 pode rodar paralelo a TASK-003 e TASK-004
- TASK-028 bloqueia TASK-002b (config Google OAuth exige URLs de Terms/Privacy)
- TASK-032 depende de TASK-003 (design system) e **bloqueia TASK-004** + toda Sprint 2+ (todas tocam UI)
- TASK-002 pode rodar paralelo a TASK-004 após TASK-032 completar
- TASK-003 e TASK-004 são independentes entre si

### Checklist de validação:
- [ ] `pnpm build` sem erros em ambos apps
- [ ] `pnpm type-check` zero erros
- [ ] `pnpm lint` zero warnings
- [ ] CI rodando em PRs e bloqueando merge quando falha
- [ ] Env validation falha startup com mensagem clara se faltar chave
- [ ] Logger estruturado (Pino) funcionando no server
- [ ] /terms e /privacy acessíveis publicamente
- [ ] Supabase migrations rodaram com sucesso
- [ ] Auth Google/Discord configurado no Supabase
- [ ] Tema dark aplicado com cores corretas
- [ ] Lighthouse PWA score ≥ 90
- [ ] Página "/" renderiza com tema correto

---

## Sprint 2 — MIDI Engine + Auth + Infra Interna (Estimativa: 27h)

### Tasks (executar nessa ordem):
1. **TASK-005:** MIDI Audio Engine com Tone.js (11h) ⚠️ CRITICAL PATH — reestimado de 6h
2. **TASK-006:** Componente AudioVisualizer (3h)
3. **TASK-007:** Auth com Supabase (3h)
4. **TASK-008:** Página de Perfil (2h)
5. **TASK-025:** Error Handling + Boundaries (3h) — adicionado pós-auditoria
6. **TASK-029:** Dev Docs Portal + Admin Middleware (5h) — adicionado (nova feature 09)

### Dependências:
- TASK-005 depende de TASK-001
- TASK-006 depende de TASK-005
- TASK-007 depende de TASK-001 e TASK-002
- TASK-008 depende de TASK-007
- TASK-025 depende de TASK-026 (logger estruturado) — pode rodar em paralelo ao restante
- TASK-029 depende de TASK-007 (role admin) e TASK-003 (design system); middleware criado aqui é pré-requisito de TASK-021
- TASK-005/006 e TASK-007/008/029 podem ser desenvolvidas em paralelo

### Checklist de validação:
- [x] MIDI de teste reproduz corretamente nas 4 fases
- [x] Visualizador reage ao áudio em tempo real
- [x] Fase 1 toca apenas notas especificadas, Fase 4 toca tudo
- [x] Login Google funciona end-to-end
- [x] Login Discord funciona end-to-end
- [x] Guest mode funciona
- [x] Perfil exibe dados e nickname é editável
- [x] Sessão persiste entre reloads

**✅ Sprint 2 smoke test PASSED — 2026-04-17 (Chrome Desktop). Ver `tasks/sprint-2-smoke-test.md` para detalhes e 7 bugs corrigidos inline.**

---

## Sprint 3 — Multiplayer Core (Estimativa: 15h)

### Tasks (executar nessa ordem):
1. **TASK-009:** Socket.io Server + Room Management (4h)
2. **TASK-010:** Game Loop Engine (6h) ⚠️ CRITICAL PATH
3. **TASK-011:** Guess Verification System (3h)
4. **TASK-027:** Rate Limiting (2h) — adicionado pós-auditoria

### Dependências:
- TASK-009 depende de TASK-001 e TASK-002
- TASK-010 depende de TASK-009 e TASK-005
- TASK-011 depende de TASK-010
- TASK-027 depende de TASK-009 e TASK-011 (implementa limits sobre os handlers existentes)

### Checklist de validação:
- [ ] Sala criada com código único de 5 chars
- [ ] 2+ clients conectam na mesma sala via Socket.io
- [ ] Game loop completo funciona: LOBBY → rodadas → GAME_END
- [ ] Pontuação decrescente funciona (1º > 2º > 3º)
- [ ] Guess verification com Levenshtein funciona
- [ ] Feedback "quente/frio" funciona
- [ ] Timer avança fases automaticamente
- [ ] Host desconectando transfere host

---

## Sprint 4 — Frontend Multiplayer (Estimativa: 15h)

### Tasks (executar nessa ordem):
1. **TASK-012:** Tela de Salas + Lobby (4h)
2. **TASK-013:** Tela de Jogo — Game Board (8h) ⚠️ CRITICAL PATH — reestimado de 6h
3. **TASK-014:** Tela de Resultado + Compartilhamento (3h)

### Dependências:
- TASK-012 depende de TASK-009
- TASK-013 depende de TASK-012, TASK-010, TASK-005, TASK-006 **e TASK-018** (seed real necessário para validação end-to-end; sem isso só se testa com mock)
- TASK-014 depende de TASK-013

### Checklist de validação:
- [ ] Criar sala funciona e redireciona para lobby
- [ ] Entrar via código funciona
- [ ] Lista de salas públicas atualiza em tempo real
- [ ] Jogo completo funciona no desktop (3 colunas)
- [ ] Jogo completo funciona no mobile (responsivo)
- [ ] Chat exibe mensagens de jogadores e bot
- [ ] Áudio sincronizado com eventos do server
- [ ] Pódio e ranking final funcionam
- [ ] Compartilhar resultado funciona

**Pendente de smoke manual — ver `tasks/sprint-4-smoke-test.md` (~50 checks, 30-40 min).**
**Nota: áudio não toca com StubMidiProvider (URLs fake). Validação e2e de áudio depende de TASK-018.**

---

## Sprint 5 — Daily Sound + XP + Polish (Estimativa: 24h)

### Tasks (executar nessa ordem):
1. **TASK-015:** Daily Sound — Backend (3h)
2. **TASK-016:** Daily Sound — Frontend (4h)
3. **TASK-017:** Daily Sound — Histórico + Calendário (2h)
4. **TASK-018:** MIDI Catalog Seed (30-50 MIDIs iniciais) (4h) — pode ser paralelo
5. **TASK-030:** XP Engine — Backend (3.5h) — adicionado (nova feature 08)
6. **TASK-031:** XP Engine — Frontend (2.5h) — adicionado (nova feature 08)
7. **TASK-019:** OG Images dinâmicas (2h)
8. **TASK-020:** Landing Page + Home (3h)

### Dependências:
- TASK-015 depende de TASK-005 e TASK-002
- TASK-016 depende de TASK-015 e TASK-006
- TASK-017 depende de TASK-016 e TASK-007
- TASK-018 depende de TASK-002 e TASK-005 (pode rodar paralelo a 015-017)
- TASK-030 depende de TASK-010 (scoring) e TASK-015 (daily submission) — precisa ambos os lados emitindo eventos XP
- TASK-031 depende de TASK-030, TASK-013 (PlayerList/Chat), TASK-014 (Podium) e TASK-016 (DailyResult)
- TASK-019 depende de TASK-016
- TASK-020 depende de TASK-003

### Checklist de validação:
- [ ] Daily Sound: mesma música para todos no mesmo dia
- [ ] Daily Sound: fluxo completo funciona (jogar → resultado → compartilhar)
- [ ] Daily Sound: streak incrementa corretamente
- [ ] Histórico: calendário renderiza com cores corretas
- [ ] 30 músicas seedadas e reproduzíveis
- [ ] OG images renderizam corretamente
- [ ] Landing page responsiva com CTAs funcionais
- [ ] Lighthouse SEO ≥ 90

**Pendente de smoke manual — Sprint 5 code complete, 2026-04-18.**

---

## Sprint 6 — Admin + QA + Deploy (Estimativa: 11h)

### Tasks (executar nessa ordem):
1. **TASK-021:** Admin Panel — Catálogo MIDI (4h) — pode ser paralelo com QA
2. **TASK-022:** QA Pass + Bug Fixes (4h)
3. **TASK-023:** Deploy Production (3h)

### Dependências:
- TASK-021 depende de TASK-006 (phase configurator precisa do player)
- TASK-022 depende de TODAS as tasks anteriores
- TASK-023 depende de TASK-022

### Checklist de validação:
- [ ] Admin: upload e configuração de MIDI funciona
- [ ] QA: zero bugs críticos em todos os fluxos
- [ ] Lighthouse: Performance ≥ 80, PWA ≥ 90, SEO ≥ 90
- [ ] Deploy: site acessível no domínio final
- [ ] Deploy: WebSocket funciona em produção
- [ ] Deploy: OAuth callbacks funcionam com URLs de produção
- [ ] Deploy: PWA instalável em produção
- [ ] CI/CD: push to main → auto-deploy funcionando

---

## Resumo de Estimativas (pós-auditoria + features 08/09)

| Sprint | Descrição                         | Estimativa | Tasks |
|--------|-----------------------------------|-----------|-------|
| 1      | Fundação                          | 18h       | 8     |
| 2      | MIDI Engine + Auth + Infra Interna| 27h       | 6     |
| 3      | Multiplayer Core                  | 15h       | 4     |
| 4      | Frontend Multiplayer              | 15h       | 3     |
| 5      | Daily Sound + XP + Polish         | 24h       | 8     |
| 6      | Admin + QA + Deploy               | 11h       | 3     |
| **Total** | —                              | **~110h** | **32**|

Aumento de 106.5h → 110h com TASK-032 adicionada (Sprint 1):
- TASK-029 Dev Docs Portal (5h, Sprint 2)
- TASK-030 XP Engine Backend (3.5h, Sprint 5)
- TASK-031 XP Engine Frontend (2.5h, Sprint 5)
- TASK-032 i18n Infrastructure (3.5h, Sprint 1)

## Critical Path (revisado)

A sequência mais longa de dependências que define o prazo mínimo do projeto:

```
TASK-001 → TASK-005 → TASK-009 → TASK-010 → TASK-013 → TASK-022 → TASK-023
(2h)       (11h)      (4h)       (6h)       (8h)       (4h)       (3h) = 38h
```

Critical path sobe de 31h para **38h** principalmente por causa do MIDI Engine (TASK-005 de 6h→11h) e do Game Board (TASK-013 de 6h→8h). TASK-002 saiu do critical path porque TASK-005 (dependente só de TASK-001) domina a perna inicial.

Nota: TASK-013 também depende de TASK-018 (seed 30-50 MIDIs). Se TASK-018 não estiver pronta quando TASK-013 chegar no final, adicionar até +4h ao critical path efetivo. Recomendação: começar TASK-018 em paralelo já na Sprint 4.
