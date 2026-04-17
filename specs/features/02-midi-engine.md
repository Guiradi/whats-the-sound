# Feature: MIDI Audio Engine & Progressive Reveal

## Fase: 1 — MVP
## Prioridade: P0
## Estimativa: 8 horas
## Depende de: 01-project-setup

## Overview
O coração do jogo. Engine que carrega arquivos MIDI, interpreta-os via Tone.js com soundfonts, e implementa o sistema de revelação progressiva em 4 fases. Cada fase expõe mais camadas sonoras da música, criando tensão crescente. Esta engine é compartilhada entre o modo multiplayer e o modo diário.

## Requisitos Funcionais

### MIDI Parser & Loader
- Carregar arquivos MIDI (.mid) do Supabase Storage
- Parsear MIDI usando @tonejs/midi para extrair:
  - Tracks individuais (melodia, harmonia, baixo, bateria)
  - Notas com timing, duração e velocidade
  - Tempo (BPM) e time signature
  - Metadata (nome, instrumento por track)
- Normalizar todos os MIDIs para um formato interno padronizado

### Soundfont Integration
- Usar soundfonts GM (General MIDI) via Tone.js Sampler
- Preload dos soundfonts mais comuns no service worker
- Fallback para oscillator básico se soundfont não carregar
- Suporte a pelo menos: Piano, Guitar, Bass, Strings, Drums

**Estratégia de soundfonts (pós-auditoria):**

- **Orçamento total em cache:** máximo de **20 MB** somando todos os soundfonts. Acima disso, service worker pode ser evictado silenciosamente em aparelhos com pouca memória.
- **Set default (sempre precached):** Piano acústico (~2 MB). É o instrumento que mais aparece e o fallback visual "sempre funciona".
- **Sets lazy (baixados no primeiro uso):** Guitar, Bass, Strings, Drums. Quando `MidiPlayer.loadMidi()` detecta um program change / track que requer um instrumento não-carregado, faz fetch sob demanda e armazena em cache.
- **Fallback em cascata:** (1) soundfont do instrumento correto → (2) piano já carregado → (3) `Tone.PolySynth` como último recurso. Logar qual caminho foi usado.
- **Versionamento de cache:** chave do cache entry inclui hash da versão do arquivo (ex: `sf-piano-<hash8>.sf2`). Nova release faz bust sem invalidar cache inteiro. Service worker remove soundfonts com chaves antigas no activate.
- **Fonte:** usar biblioteca leve (ex: `sgossner/VCSL` compactado ou FatBoy) ao invés de soundfonts GM completos de 50+ MB.

### Autoplay Mobile (Safari/iOS) e `Tone.start()`

Safari e Chrome mobile bloqueiam qualquer áudio até o primeiro gesto do usuário na página. `Tone.js` expõe `Tone.start()` que resolve a promise do `AudioContext.resume()` mas precisa ser chamado dentro de um handler de gesto.

**Fluxo obrigatório:**

1. Na entrada de `/room/[code]` ou `/daily`, renderizar overlay cheio "🎵 Toque para começar" enquanto `Tone.context.state !== 'running'`.
2. No click/tap do overlay, chamar `await Tone.start()` e `setAudioReady(true)`. Só depois remover o overlay.
3. Se o host inicia o round antes do usuário resolver o overlay, bufferizar eventos `phase_start` e disparar `Tone.Transport.start()` só após `audioReady === true`. Informar o usuário via toast "Iniciando áudio..." se ficar mais de 2s em buffer.
4. Em reconexão Socket.io, o estado `audioReady` já está resolvido (não precisa overlay de novo).

**Teste obrigatório em Sprint 2:** validar em Chrome Android, Safari iOS ≥15, Firefox Android, Chrome/Firefox/Safari desktop. Incluir screenshot/gif de cada no PR.

### Sistema de Revelação Progressiva (4 Fases)

Cada música MIDI tem metadata definindo como as fases são divididas:

```typescript
interface MidiRevealConfig {
  id: string;
  title: string;
  artist: string;
  category: MidiCategory;
  bpm: number;
  phases: {
    phase1: {
      tracks: number[];      // índices das tracks a tocar
      startBeat: number;     // beat de início
      endBeat: number;       // beat de fim
      description: string;   // ex: "3 primeiras notas da melodia"
    };
    phase2: {
      tracks: number[];
      startBeat: number;
      endBeat: number;
      description: string;   // ex: "Melodia do primeiro verso"
    };
    phase3: {
      tracks: number[];
      startBeat: number;
      endBeat: number;
      description: string;   // ex: "Melodia + harmonia"
    };
    phase4: {
      tracks: number[];
      startBeat: number;
      endBeat: number;
      description: string;   // ex: "Música completa"
    };
  };
  acceptedAnswers: string[];  // variações aceitas do título
  acceptedArtists: string[]; // variações aceitas do artista
}
```

### Fase 1 — "Poucas Notas"
- Toca apenas a track de melodia principal
- Apenas 3-5 notas iniciais (ou primeiros 2-4 beats)
- Sem harmonia, sem ritmo, sem acompanhamento
- Duração: 2-5 segundos

### Fase 2 — "Melodia Estendida"
- Mesma track de melodia, mas com mais notas (8-16 notas, ~primeiro verso ou refrão)
- Ainda sem acompanhamento
- Duração: 5-10 segundos

### Fase 3 — "Melodia + Harmonia"
- Adiciona tracks de acompanhamento (acordes, baixo)
- Trecho mais longo, incluindo transições
- Duração: 10-15 segundos

### Fase 4 — "Música Completa"
- Todas as tracks ativas
- Reproduz a música MIDI inteira (ou um trecho longo reconhecível)
- Duração: 15-30 segundos

### Playback Controls
- `play(midiId: string, phase: 1|2|3|4)` — toca a fase especificada
- `stop()` — para a reprodução
- `replay()` — repete a fase atual
- `isPlaying: boolean` — estado de reprodução
- `currentPhase: number` — fase sendo tocada
- Botão de replay permitido (jogador pode ouvir de novo a fase atual)

### MIDI Catalog Service
- Endpoint REST: `GET /api/midis` — lista todas as músicas (id, title sem resposta, category)
- Endpoint REST: `GET /api/midis/daily` — retorna o MIDI do dia
- Endpoint REST: `GET /api/midis/:id/phase/:phase` — retorna dados da fase (server-side, para evitar que o client veja todas as fases de uma vez)
- As respostas (title, artist) NUNCA são enviadas ao client antes do fim da rodada

## Requisitos Não-Funcionais
- Latência de playback < 100ms após trigger
- Preload da fase seguinte enquanto a atual está tocando
- Funcionar em todos os browsers modernos (Chrome, Firefox, Safari, Edge)
- Mobile: funcionar sem autoplay restrictions (user gesture required para primeiro play)
- Tamanho máximo de um arquivo MIDI: 500KB
- Soundfonts cacheados no service worker para uso offline

## Componentes

### `MidiPlayer` (hook: `useMidiPlayer`)
```typescript
interface UseMidiPlayer {
  loadMidi: (midiId: string) => Promise<void>;
  play: (phase: 1|2|3|4) => Promise<void>;
  stop: () => void;
  replay: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  currentPhase: number;
  progress: number; // 0-1, progresso da reprodução atual
}
```

### `AudioVisualizer`
- Componente visual que mostra barras de frequência durante playback
- Recebe dados do Tone.js analyser node
- Animação suave com requestAnimationFrame
- Responsivo (ocupa largura disponível)

## Telas / Fluxos
- Nenhuma tela standalone — este módulo é consumido pelas telas de jogo

## Edge Cases
- **Safari iOS autoplay:** Precisa de user gesture antes do primeiro play. Mostrar botão "Toque para começar" no início da primeira rodada.
- **MIDI corrompido:** Se o parser falhar, pular a música e logar erro. Ter música fallback.
- **Soundfont não carregou:** Usar oscillator/synth básico do Tone.js como fallback.
- **Usuário com volume no mudo:** Mostrar indicador visual "🔇 Seu volume está no mudo" detectando via AudioContext.
- **Conexão lenta:** Preload das fases em background. Mostrar skeleton/loading se fase não estiver pronta.
- **Tab em background:** Pausar reprodução quando tab perde foco (Page Visibility API).

## Decisões de Design
- **Tone.js** ao invés de Web MIDI API direta: Tone.js abstrai complexidade de scheduling, suporta soundfonts, e tem analyser para visualização.
- **Fases definidas por metadata** (não calculadas automaticamente): Cada MIDI tem curadoria humana definindo o que cada fase mostra. Isso garante qualidade — a fase 1 sempre terá as notas mais reconhecíveis.
- **Server controla revelação:** O client nunca recebe os dados de todas as fases de uma vez. Cada fase é solicitada ao server quando necessário, impedindo cheating via DevTools.
- **@tonejs/midi** para parsing: biblioteca oficial do Tone.js para parsing de MIDI files, garante compatibilidade total.
