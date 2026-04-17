'use client';

import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  isGamePhase: boolean;
}

export function ChatInput({ onSend, disabled, isGamePhase }: ChatInputProps) {
  const t = useTranslations('game');
  const [value, setValue] = useState('');

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  }, [value, onSend]);

  return (
    <div className="flex gap-2 border-t border-bg-border p-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder={
          disabled
            ? t('chat.locked')
            : isGamePhase
              ? t('chat.guessPlaceholder')
              : t('chat.placeholder')
        }
        disabled={disabled}
        className="h-9 text-sm"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-cyan text-text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
