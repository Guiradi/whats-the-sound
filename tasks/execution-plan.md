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

## Sprint 1 — Fundação (Estimativa: 8h)

### Tasks (executar nessa ordem):
1. **TASK-001:** Setup do Monorepo com Turborepo (2h)
2. **TASK-002:** Setup Supabase + Schema inicial (2h)
3. **TASK-003:** Design System + Tailwind Theme (2h)
4. **TASK-004:** PWA Setup com Serwist (2h)

### Dependências:
- TASK-001 é pré-requisito de TODAS as outras tasks
- TASK-002 pode rodar paralelo a TASK-003 e TASK-004 (após TASK-001)
- TASK-003 e TASK-004 são independentes entre si

### Checklist de validação:
- [ ] `pnpm build` sem erros em ambos apps
- [ ] `pnpm type-check` zero erros
- [ ] `pnpm lint` zero warnings
- [ ] Supabase migrations rodaram com sucesso
- [ ] Auth Google/Discord configurado no Supabase
- [ ] Tema dark aplicado com cores corretas
- [ ] Lighthouse PWA score ≥ 90
- [ ] Página "/" renderiza com tema correto

---

## Sprint 2 — MIDI Engine + Auth (Estimativa: 14h)

### Tasks (executar nessa ordem):
1. **TASK-005:** MIDI Audio Engine com Tone.js (6h) ⚠️ CRITICAL PATH
2. **TASK-006:** Componente AudioVisualizer (3h)
3. **TASK-007:** Auth com Supabase (3h)
4. **TASK-008:** Página de Perfil (2h)

### Dependências:
- TASK-005 depende de TASK-001
- TASK-006 depende de TASK-005
- TASK-007 depende de TASK-001 e TASK-002
- TASK-008 depende de TASK-007
- TASK-005/006 e TASK-007/008 podem ser desenvolvidas em paralelo

### Checklist de validação:
- [ ] MIDI de teste reproduz corretamente nas 4 fases
- [ ] Visualizador reage ao áudio em tempo real
- [ ] Fase 1 toca apenas notas especificadas, Fase 4 toca tudo
- [ ] Login Google funciona end-to-end
- [ ] Login Discord funciona end-to-end
- [ ] Guest mode funciona
- [ ] Perfil exibe dados e nickname é editável
- [ ] Sessão persiste entre reloads

---

## Sprint 3 — Multiplayer Core (Estimativa: 13h)

### Tasks (executar nessa ordem):
1. **TASK-009:** Socket.io Server + Room Management (4h)
2. **TASK-010:** Game Loop Engine (6h) ⚠️ CRITICAL PATH
3. **TASK-011:** Guess Verification System (3h)

### Dependências:
- TASK-009 depende de TASK-001 e TASK-002
- TASK-010 depende de TASK-009 e TASK-005
- TASK-011 depende de TASK-010

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

## Sprint 4 — Frontend Multiplayer (Estimativa: 13h)

### Tasks (executar nessa ordem):
1. **TASK-012:** Tela de Salas + Lobby (4h)
2. **TASK-013:** Tela de Jogo — Game Board (6h) ⚠️ CRITICAL PATH
3. **TASK-014:** Tela de Resultado + Compartilhamento (3h)

### Dependências:
- TASK-012 depende de TASK-009
- TASK-013 depende de TASK-012, TASK-010, TASK-005, TASK-006
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

---

## Sprint 5 — Daily Sound + Polish (Estimativa: 18h)

### Tasks (executar nessa ordem):
1. **TASK-015:** Daily Sound — Backend (3h)
2. **TASK-016:** Daily Sound — Frontend (4h)
3. **TASK-017:** Daily Sound — Histórico + Calendário (2h)
4. **TASK-018:** MIDI Catalog Seed (100 músicas) (4h) — pode ser paralelo
5. **TASK-019:** OG Images dinâmicas (2h)
6. **TASK-020:** Landing Page + Home (3h)

### Dependências:
- TASK-015 depende de TASK-005 e TASK-002
- TASK-016 depende de TASK-015 e TASK-006
- TASK-017 depende de TASK-016 e TASK-007
- TASK-018 depende de TASK-002 e TASK-005 (pode rodar paralelo a 015-017)
- TASK-019 depende de TASK-016
- TASK-020 depende de TASK-003

### Checklist de validação:
- [ ] Daily Sound: mesma música para todos no mesmo dia
- [ ] Daily Sound: fluxo completo funciona (jogar → resultado → compartilhar)
- [ ] Daily Sound: streak incrementa corretamente
- [ ] Histórico: calendário renderiza com cores corretas
- [ ] 100 músicas seedadas e reproduzíveis
- [ ] OG images renderizam corretamente
- [ ] Landing page responsiva com CTAs funcionais
- [ ] Lighthouse SEO ≥ 90

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

## Resumo de Estimativas

| Sprint | Descrição              | Estimativa | Tasks |
|--------|------------------------|-----------|-------|
| 1      | Fundação               | 8h        | 4     |
| 2      | MIDI Engine + Auth     | 14h       | 4     |
| 3      | Multiplayer Core       | 13h       | 3     |
| 4      | Frontend Multiplayer   | 13h       | 3     |
| 5      | Daily Sound + Polish   | 18h       | 6     |
| 6      | Admin + QA + Deploy    | 11h       | 3     |
| **Total** | —                   | **77h**   | **23**|

## Critical Path

A sequência mais longa de dependências que define o prazo mínimo do projeto:

```
TASK-001 → TASK-005 → TASK-009 → TASK-010 → TASK-013 → TASK-022 → TASK-023
(2h)       (6h)       (4h)       (6h)       (6h)       (4h)       (3h) = 31h
```

O critical path é dominado pela engine MIDI e pelo game loop — são os componentes mais complexos e dos quais tudo depende.
