# Feature: Authentication & User Profile

## Fase: 1 — MVP
## Prioridade: P0
## Estimativa: 4 horas
## Depende de: 01-project-setup

## Overview
Sistema de autenticação via Supabase Auth com providers sociais (Google e Discord). O jogo permite jogar sem conta (guest mode com nickname temporário), mas cadastro é necessário para salvar progresso, ranking e Daily Sound streak. Perfil básico com avatar, nickname e stats.

## Requisitos Funcionais

### Guest Mode (sem cadastro)
- Jogador pode entrar em salas multiplayer apenas informando um nickname
- Nickname é salvo no localStorage para persistir entre sessões
- Guest pode jogar o Daily Sound mas NÃO salva streak/histórico
- Banner discreto incentivando cadastro: "Crie uma conta para salvar seu progresso"
- Guest NÃO aparece no ranking global

### Auth Social (Supabase Auth)
- Login via Google OAuth 2.0
- Login via Discord OAuth 2.0
- Fluxo: Botão "Entrar com Google/Discord" → redirect OAuth → callback → criar/atualizar perfil → redirect para home
- Sessão persistente via cookies (Supabase SSR helper)
- Logout funcional com limpeza de sessão

### User Profile
- Campos:
  - `id` (UUID, gerado pelo Supabase Auth)
  - `nickname` (único, 3-20 chars, alfanumérico + underscores)
  - `avatar_url` (do provider OAuth ou custom futuramente)
  - `created_at`
  - `total_games` (partidas multiplayer jogadas)
  - `total_wins` (1º lugar em partidas)
  - `total_correct` (acertos totais)
  - `daily_streak` (dias consecutivos no Daily Sound)
  - `max_daily_streak` (record de streak)
  - `points_total` (pontos acumulados lifetime)
- Auto-criação no primeiro login (trigger do Supabase ou Server Action)
- Nickname padrão: primeiro nome do OAuth profile

### Profile Page
- Exibe avatar, nickname, e stats básicas
- Botão para editar nickname
- Validação de nickname: único, sem palavrões (lista básica), 3-20 chars
- Botão de logout

## Requisitos Não-Funcionais
- Login completo em < 3 cliques (botão → OAuth → redirect)
- Sessão expira em 30 dias (refresh token)
- Rate limit em tentativas de edição de nickname: 3 por hora
- Avatar carregado com lazy loading e placeholder

## Componentes

### `LoginModal`
- Modal com botões "Entrar com Google" e "Entrar com Discord"
- Ou input de nickname para guest mode
- Contexto de quando aparece: ao tentar salvar progresso, acessar ranking, ou voluntariamente

### `UserAvatar`
- Props: `src: string`, `nickname: string`, `size: 'sm' | 'md' | 'lg'`
- Fallback: iniciais do nickname em círculo colorido (cor baseada no hash do nickname)

### `ProfileCard`
- Exibe avatar, nickname, stats principais
- Versão compacta (para sidebar/ranking) e completa (para página de perfil)

### `NicknameInput`
- Input com validação em tempo real
- Debounce de 500ms para check de unicidade
- Feedback visual: ✓ disponível, ✗ já em uso, ✗ inválido

## Telas / Fluxos

### Tela: Login (/login)
- **Estado padrão:** Dois botões grandes (Google, Discord) + divider "ou" + input de nickname para guest
- **Estado loading:** Spinner no botão clicado
- **Estado erro:** Toast com mensagem "Erro ao fazer login. Tente novamente."
- **Após login:** Redirect para "/" ou para a sala que o usuário estava tentando entrar

### Tela: Profile (/profile)
- **Estado logado:** Avatar, nickname editável, grid de stats, botão logout
- **Estado guest:** Mensagem "Crie uma conta para ver seu perfil" + botão login
- **Estado loading:** Skeleton do profile card
- **Estado erro:** Toast com retry

## Edge Cases
- **Nickname já em uso:** Sugerir alternativas (ex: "João" → "João_123", "João_WTS")
- **OAuth falha:** Mostrar toast de erro e permitir retry. Não travar o fluxo.
- **Guest tenta ação restrita:** Mostrar LoginModal contextual ("Crie uma conta para salvar seu streak!")
- **Dois dispositivos:** Sessão funciona em múltiplos dispositivos simultaneamente (Supabase gerencia)
- **Avatar do provider é null:** Usar fallback de iniciais
- **Nickname com caracteres especiais/emojis:** Rejeitar, permitir apenas [a-zA-Z0-9_]
- **Conta duplicada (Google + Discord com mesmo email):** Supabase linka automaticamente por email

## Decisões de Design
- **Guest mode** é essencial: a fricção de criar conta mata a conversão em jogos casuais. O jogador precisa experimentar antes de se comprometer.
- **Google + Discord** como providers: Google cobre público geral, Discord cobre gamers/streamers. São os dois providers com maior overlap com o público-alvo.
- **Supabase Auth** ao invés de Auth.js/NextAuth: já estamos usando Supabase para DB e Storage, unificar reduz complexidade.
- **Nickname único** ao invés de tag numérica (ex: João#1234): mais simples e memorável.
