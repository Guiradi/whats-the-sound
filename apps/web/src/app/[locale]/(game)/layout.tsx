import { AudioContextProvider } from '@/lib/midi/audio-context';
import type { ReactNode } from 'react';

export default function GameLayout({ children }: { children: ReactNode }) {
  return <AudioContextProvider>{children}</AudioContextProvider>;
}
