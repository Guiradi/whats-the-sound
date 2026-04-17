# Design System — What's the Sound?

## Identidade Visual

**Tema:** Dark Mode Synthwave / Neon Retro
**Inspiração:** Arcades dos anos 80, VHS, neon signs, pixel art — mas com UI moderna e limpa.
**Sensação:** Noite de game show futurista. Energético mas não cansativo. Competitivo mas divertido.

## Paleta de Cores

### Cores Primárias

| Nome            | Hex       | HSL                | Uso                                      |
|-----------------|-----------|--------------------|--------------------------------------------|
| Background      | `#0a0a1a` | 240 33% 7%         | Fundo principal de todas as telas          |
| Surface         | `#12122a` | 240 38% 12%        | Cards, modals, sidebar                     |
| Surface Hover   | `#1a1a3a` | 240 37% 16%        | Hover em cards, itens de lista             |
| Border          | `#2a2a4a` | 240 29% 23%        | Bordas de cards, dividers                  |

### Cores de Acento

| Nome            | Hex       | HSL                | Uso                                      |
|-----------------|-----------|--------------------|--------------------------------------------|
| Cyan (Primary)  | `#00f0ff` | 184 100% 50%       | CTAs, links, highlights, barra de timer    |
| Magenta         | `#ff00aa` | 320 100% 50%       | Acerto, confete, destaque especial         |
| Yellow          | `#ffd700` | 51 100% 50%        | Pontuação, streak, badges, "quente" 🔥     |
| Green           | `#00ff88` | 153 100% 50%       | Acertou, sucesso, online                   |
| Red             | `#ff3366` | 345 100% 60%       | Erro, timer acabando, desconectado         |
| Orange          | `#ff8800` | 32 100% 50%        | "Quente/perto", warnings                   |

### Cores de Texto

| Nome            | Hex       | Uso                                      |
|-----------------|-----------|------------------------------------------|
| Text Primary    | `#f0f0ff` | Texto principal, títulos                  |
| Text Secondary  | `#a0a0cc` | Texto secundário, labels, placeholders    |
| Text Muted      | `#606080` | Texto desabilitado, timestamps            |
| Text on Accent  | `#0a0a1a` | Texto sobre backgrounds de cor accent     |

### CSS Variables

```css
:root {
  /* Background */
  --bg-primary: #0a0a1a;
  --bg-surface: #12122a;
  --bg-surface-hover: #1a1a3a;
  --bg-border: #2a2a4a;

  /* Accent */
  --color-cyan: #00f0ff;
  --color-magenta: #ff00aa;
  --color-yellow: #ffd700;
  --color-green: #00ff88;
  --color-red: #ff3366;
  --color-orange: #ff8800;

  /* Text */
  --text-primary: #f0f0ff;
  --text-secondary: #a0a0cc;
  --text-muted: #606080;

  /* Glow effects */
  --glow-cyan: 0 0 20px rgba(0, 240, 255, 0.3);
  --glow-magenta: 0 0 20px rgba(255, 0, 170, 0.3);
  --glow-yellow: 0 0 20px rgba(255, 215, 0, 0.3);
}
```

### Tailwind Config (extend)

```typescript
// tailwind.config.ts
{
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a1a',
          surface: '#12122a',
          'surface-hover': '#1a1a3a',
          border: '#2a2a4a',
        },
        accent: {
          cyan: '#00f0ff',
          magenta: '#ff00aa',
          yellow: '#ffd700',
          green: '#00ff88',
          red: '#ff3366',
          orange: '#ff8800',
        },
        text: {
          primary: '#f0f0ff',
          secondary: '#a0a0cc',
          muted: '#606080',
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 240, 255, 0.3)',
        'glow-magenta': '0 0 20px rgba(255, 0, 170, 0.3)',
        'glow-yellow': '0 0 20px rgba(255, 215, 0, 0.3)',
      },
    },
  },
}
```

## Tipografia

### Font Families

| Uso              | Font                | Fallback           | Peso          |
|------------------|---------------------|--------------------|---------------|
| Branding/Logo    | Space Grotesk       | system-ui          | 700 Bold      |
| Headings         | Space Grotesk       | system-ui          | 600 Semibold  |
| Body             | Inter                | system-ui          | 400 Regular   |
| Code/Monospace   | JetBrains Mono      | monospace          | 400 Regular   |
| Scores/Numbers   | Space Grotesk       | system-ui          | 700 Bold      |

### Type Scale

| Nível         | Size (rem) | Size (px) | Line Height | Weight   | Uso                          |
|---------------|-----------|-----------|-------------|----------|-------------------------------|
| Display       | 3.0       | 48        | 1.1         | 700      | Resultado final, pódio        |
| H1            | 2.25      | 36        | 1.2         | 700      | Título de página              |
| H2            | 1.5       | 24        | 1.3         | 600      | Seções, "Rodada 3 de 10"      |
| H3            | 1.25      | 20        | 1.4         | 600      | Sub-seções, nomes de sala     |
| Body Large    | 1.125     | 18        | 1.5         | 400      | Texto principal destacado      |
| Body          | 1.0       | 16        | 1.5         | 400      | Texto padrão                  |
| Body Small    | 0.875     | 14        | 1.5         | 400      | Labels, captions              |
| Caption       | 0.75      | 12        | 1.4         | 400      | Timestamps, metadata          |
| Score         | 1.5       | 24        | 1.0         | 700      | Pontuação no placar           |

## Espaçamento

### Ritmo Base: 4px

| Token   | Value | Uso                              |
|---------|-------|----------------------------------|
| space-1 | 4px   | Padding interno mínimo           |
| space-2 | 8px   | Gap entre ícone e texto          |
| space-3 | 12px  | Padding de inputs                |
| space-4 | 16px  | Padding de cards, gap de listas  |
| space-5 | 20px  | Margem entre seções pequenas     |
| space-6 | 24px  | Padding de modals                |
| space-8 | 32px  | Margem entre seções grandes      |
| space-10| 40px  | Margem de topo/fundo de página   |
| space-12| 48px  | Separação entre blocos maiores   |
| space-16| 64px  | Padding de hero sections         |

## Raios de Borda

| Token       | Value  | Uso                         |
|-------------|--------|-----------------------------|
| radius-sm   | 4px    | Badges, tags                |
| radius-md   | 8px    | Inputs, buttons             |
| radius-lg   | 12px   | Cards, modals               |
| radius-xl   | 16px   | Cards grandes, containers   |
| radius-full | 9999px | Avatares, pills             |

## Sombras

| Token       | Value                                    | Uso                  |
|-------------|------------------------------------------|----------------------|
| shadow-sm   | 0 1px 2px rgba(0,0,0,0.3)               | Inputs, buttons      |
| shadow-md   | 0 4px 12px rgba(0,0,0,0.4)              | Cards                |
| shadow-lg   | 0 8px 24px rgba(0,0,0,0.5)              | Modals, dropdowns    |
| shadow-glow | Varia por cor (ver glow effects acima)   | CTAs, highlights     |

## Componentes Base

### Button

```
Variantes:
- Primary:   bg cyan, text dark, glow-cyan on hover
- Secondary: bg surface, border, text primary, border-cyan on hover
- Ghost:     bg transparent, text secondary, text primary on hover
- Danger:    bg red, text white

Tamanhos:
- sm: h-8 px-3 text-sm radius-md
- md: h-10 px-4 text-base radius-md
- lg: h-12 px-6 text-lg radius-md

Estados:
- Default → Hover (glow + lighten) → Active (scale 0.98) → Disabled (opacity 0.5)
- Loading: spinner substituindo texto
```

### Input

```
- bg surface, border border, text primary
- Focus: border cyan, glow-cyan sutil
- Error: border red
- Placeholder: text muted
- Tamanho padrão: h-10 px-3 radius-md
```

### Card

```
- bg surface, radius-lg, border sutil (1px border)
- Hover: bg surface-hover, shadow-md
- Padding: space-4
- Variante highlight: border cyan, glow-cyan sutil
```

### Avatar

```
- Sizes: sm (32px), md (40px), lg (56px), xl (80px)
- Shape: radius-full
- Border: 2px solid border
- Online indicator: 8px green dot, bottom-right
- Fallback: iniciais em bg com cor derivada do hash do nickname
```

### Toast/Notification

```
- bg surface, border-left 4px (cor varia: cyan info, green success, red error, yellow warning)
- Posição: top-right (desktop), top-center (mobile)
- Duração: 3s (auto-dismiss)
- Animação: slide-in from right
```

### Modal

```
- Overlay: bg black/60, backdrop-blur-sm
- Container: bg surface, radius-xl, shadow-lg, max-w-md
- Padding: space-6
- Animação: fade-in + scale-up (100ms)
```

## Tabela de Uso Rápido

| Elemento              | Background    | Texto          | Borda        | Destaque       |
|-----------------------|---------------|----------------|--------------|----------------|
| Página                | bg-primary    | text-primary   | —            | —              |
| Card                  | bg-surface    | text-primary   | border       | —              |
| Botão principal       | accent-cyan   | bg-primary     | —            | glow-cyan      |
| Input                 | bg-surface    | text-primary   | border       | accent-cyan    |
| Chat (mensagem)       | transparent   | text-primary   | —            | —              |
| Chat (bot message)    | bg-surface    | accent-cyan    | border       | —              |
| Chat (acerto)         | bg-surface    | accent-green   | accent-green | glow-green     |
| Chat (quente)         | bg-surface    | accent-orange  | —            | —              |
| Placar (nome)         | transparent   | text-primary   | —            | —              |
| Placar (pontuação)    | transparent   | accent-yellow  | —            | —              |
| Timer (normal)        | —             | accent-cyan    | —            | —              |
| Timer (urgente)       | —             | accent-red     | —            | glow-red       |
| Badge de streak       | accent-yellow | bg-primary     | —            | glow-yellow    |

## Breakpoints (Mobile-First)

| Nome    | Min Width | Uso                                |
|---------|-----------|-------------------------------------|
| mobile  | 0px       | Layout padrão (1 coluna)            |
| tablet  | 640px     | Ajustes de padding, 2 colunas       |
| desktop | 1024px    | Layout 3 colunas (game board)       |
| wide    | 1280px    | Max-width container, mais espaço    |

## Animações

| Nome                  | Duração | Easing              | Uso                              |
|-----------------------|---------|---------------------|----------------------------------|
| fade-in               | 150ms   | ease-out            | Modals, toasts                   |
| slide-up              | 200ms   | ease-out            | Chat messages, score updates     |
| scale-pop             | 300ms   | spring (0.5, 0.8)   | Acerto, confete, badge earned    |
| pulse-glow            | 1.5s    | ease-in-out (loop)  | Timer urgente, streak badge      |
| shake                 | 400ms   | ease-in-out         | Erro, input inválido             |
| confetti              | 2s      | linear              | Primeiro acerto, fim de jogo     |
| countdown             | 1s      | linear (steps)      | 3, 2, 1 entre rodadas           |

## Iconografia

- Biblioteca: **Lucide React** (consistente, leve, MIT)
- Tamanho padrão: 20px (body), 16px (small), 24px (heading)
- Stroke width: 2px
- Cor: herda do texto (currentColor)

### Ícones Chave
- Play: `Play` / Pause: `Pause` / Replay: `RotateCcw`
- Volume: `Volume2` / Mute: `VolumeX`
- Timer: `Clock`
- Star: `Star` / Trophy: `Trophy`
- Users: `Users` / User: `User`
- Send (chat): `Send`
- Copy: `Copy` / Share: `Share2`
- Settings: `Settings` / Menu: `Menu`
- Check: `Check` / X: `X`
- Fire (streak): `Flame`
