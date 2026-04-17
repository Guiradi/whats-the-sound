# Feature: MIDI Catalog & Admin Management

## Fase: 1 — MVP
## Prioridade: P0
## Estimativa: 5 horas
## Depende de: 01-project-setup, 02-midi-engine

## Overview
Sistema de gerenciamento do catálogo de músicas MIDI. Inclui upload, metadata, configuração das fases de revelação por música, categorização e validação. No MVP, a administração é feita via painel simples protegido por auth — não é necessário um CMS completo.

> **Meta MVP revisada:** 30-50 músicas verificadas com licença, em vez das 100 originalmente planejadas. Curar + configurar fases + validar licença para 100 MIDIs é trabalho de semanas, não horas. A infraestrutura de seed/upload é desenhada para suportar 100+; o que foi reduzido é o volume inicial. Pós-MVP, expandir para 100+ conforme fluxo de curadoria e licenciamento amadurece.

> **⚠️ Copyright — cada arquivo do catálogo precisa se enquadrar em UMA das três categorias:**
> 1. **Composição original** — feita pelo projeto, pela comunidade sob termos explícitos, ou encomendada.
> 2. **Domínio público / Creative Commons** — música com direitos expirados (ex: clássicas pré-1928 nos EUA, regras variam por país) ou licença CC que permita uso em produto com ads/monetização.
> 3. **Licença individual** — permissão explícita do detentor dos direitos da composição (não só da gravação — MIDI = composição).
>
> **Antes de subir um MIDI:** registrar em planilha de curadoria (ainda a criar) a fonte, a categoria acima e o link/contrato da licença. Uploads sem essa verificação não devem ser publicados.

## Requisitos Funcionais

### Estrutura do Catálogo
Cada música no catálogo tem:

```typescript
interface MidiEntry {
  id: string;                    // UUID
  title: string;                 // Nome da música
  artist: string;                // Artista/Banda
  category: MidiCategory;        // Categoria
  difficulty: 'easy' | 'medium' | 'hard';
  year?: number;                 // Ano de lançamento (opcional)
  midi_file_url: string;         // URL no Supabase Storage
  accepted_titles: string[];     // Variações aceitas do título
  accepted_artists: string[];    // Variações aceitas do artista
  phases: PhaseConfig;           // Config das 4 fases de revelação
  is_active: boolean;            // Se está disponível para jogo
  play_count: number;            // Quantas vezes foi jogada
  correct_rate: number;          // % de acertos (atualizado automaticamente)
  created_at: string;
  updated_at: string;
}

type MidiCategory =
  | 'rock'
  | 'pop'
  | 'mpb'
  | 'sertanejo'
  | 'games'
  | 'anime'
  | 'classical'
  | 'electronic'
  | 'hiphop'
  | 'random';
```

### Upload & Configuração de MIDI
- Formulário de upload no painel admin:
  1. Upload do arquivo .mid
  2. Preencher: título, artista, categoria, dificuldade, ano
  3. Player de preview: ouvir o MIDI completo
  4. **Configurador de fases:** interface onde o admin define manualmente para cada fase:
     - Quais tracks tocar (lista de tracks do MIDI com checkbox)
     - Beat de início e fim (slider ou input numérico)
     - Preview de cada fase individualmente
  5. Variações de resposta: adicionar variações aceitas (ex: "Smells Like Teen Spirit", "smells like teen spirit", "teen spirit")
  6. Validar e salvar

### Categorias
- 9 categorias fixas (ver enum acima) + "random" (sem categoria fixa)
- Cada música pertence a exatamente 1 categoria
- Distribuição sugerida para o catálogo inicial do MVP (~30-50 músicas):
  - Alvo de 30 (mínimo viável): Rock: 5, Pop: 5, MPB: 3, Sertanejo: 3, Games: 5, Anime: 3, Classical: 2, Electronic: 2, Hip-Hop: 2
  - Alvo de 50: dobra proporcionalmente
  - Meta original (100 músicas) permanece como marco pós-MVP

### API do Catálogo
- `GET /api/catalog/categories` — lista categorias com contagem de músicas
- `GET /api/catalog/random?category=rock&count=10` — retorna N músicas aleatórias de uma categoria (sem respostas)
- `GET /api/catalog/daily` — retorna a música do dia (sem resposta, apenas ID e fase 1)
- `POST /api/catalog/verify` — verifica palpite server-side `{ midiId, guess }` → `{ result: 'correct' | 'hot' | 'warm' | 'artist_match' | 'wrong' }`

### Seed de Dados
- Script de seed para popular as 100 músicas iniciais
- Arquivo JSON com metadata de cada música (título, artista, categoria, fases)
- Comando: `pnpm seed:midis` que lê o JSON e popula o Supabase

## Requisitos Não-Funcionais
- Upload de MIDI < 500KB por arquivo
- Listagem do catálogo com paginação (20 por página)
- Busca por título/artista com full-text search (Supabase FTS)
- Cache de 1h no endpoint de categorias (não muda frequentemente)

## Componentes

### `AdminMidiUpload` (admin only)
- Form multi-step: upload → metadata → fases → variações → review → save

### `PhaseConfigurator` (admin only)
- Interface visual para configurar as 4 fases de revelação
- Preview de cada fase com player
- Seletor de tracks (checkboxes) + range de beats (slider)

### `MidiCatalogList` (admin only)
- Tabela com todas as músicas: título, artista, categoria, dificuldade, play count, correct rate
- Filtros por categoria e dificuldade
- Ações: editar, desativar, preview

## Telas / Fluxos

### Tela: Admin — Catálogo (/admin/catalog)
- **Estado padrão:** Tabela de músicas + botão "Adicionar MIDI"
- **Estado loading:** Skeleton da tabela
- **Acesso:** Protegido por role admin (verificado via Supabase RLS)

### Tela: Admin — Upload (/admin/catalog/new)
- Form multi-step com progress indicator
- Preview de áudio em cada step

## Edge Cases
- **MIDI com 0 tracks:** Rejeitar upload com erro "Arquivo MIDI inválido"
- **MIDI com track única:** Fases 1-3 usam ranges de beats diferentes da mesma track; Fase 4 = track completa
- **Variação de resposta duplicada:** Deduplicar automaticamente
- **Admin tenta desativar música que é o Daily Sound de hoje:** Permitir mas avisar
- **Categoria com 0 músicas ativas:** Não exibir na lista de categorias para jogadores

## Decisões de Design
- **Fases configuradas manualmente:** Automação (ex: "tocar primeiros X beats") não garante qualidade — as notas mais reconhecíveis nem sempre são as primeiras. Curadoria humana é essencial.
- **Variações de resposta manuais:** Levenshtein pega typos, mas variações como "Raul" vs "Raul Seixas" precisam ser adicionadas manualmente.
- **Admin simples no MVP:** Não precisa de CMS completo. Um painel básico protegido por role admin é suficiente para 100 músicas.
