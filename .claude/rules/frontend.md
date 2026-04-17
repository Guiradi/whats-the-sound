---
paths:
  - "apps/web/src/app/**"
  - "apps/web/src/components/**"
---

# Frontend Rules — What's the Sound?

## Components
- Function components only, named exports (default export only for pages)
- Props via interface, not type alias: `interface GameBoardProps { ... }`
- Destructure props in function signature
- One component per file (except small helper components)

## Styling
- Tailwind CSS exclusively — no inline styles, no CSS modules
- Use design system tokens from docs/design-system.md
- Use cn() utility for conditional classes
- Mobile-first: base styles for mobile, md: for tablet, lg: for desktop
- Dark mode is default — no light mode styles needed

## Server vs Client Components
- Default is Server Component — do NOT add "use client" unless required
- Use "use client" only for: hooks, event handlers, browser APIs
- Keep client boundaries as small as possible

## State Management
- Server state: React Server Components + Supabase queries
- Client state: React hooks (useState, useReducer)
- Socket state: custom hooks (useRoom, useSocket)
- No external state library in MVP

## Accessibility
- All interactive elements: visible focus styles (outline cyan)
- Images: always alt text
- Buttons: aria-label if no visible text
- aria-live="polite" for chat messages and score updates
- Respect prefers-reduced-motion

## Performance
- next/image for all images
- next/font for Google Fonts
- Lazy load heavy components (AudioVisualizer, PhaseConfigurator)
- Avoid layout shifts — explicit width/height or aspect-ratio
