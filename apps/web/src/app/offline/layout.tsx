import type { ReactNode } from 'react';
import '@/styles/globals.css';

// Offline fallback must render with zero network (no fonts, no i18n). This layout
// is intentionally minimal and sibling to app/[locale]/layout.tsx.
export default function OfflineLayout({ children }: { children: ReactNode }) {
  return children;
}
