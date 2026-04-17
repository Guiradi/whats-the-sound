'use client';

import { cn } from '@/lib/utils';
import type { ChatMessage } from '@wts/shared';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef } from 'react';

interface GameChatProps {
  messages: ChatMessage[];
  myId: string | null;
  playerNames?: Map<string, string>;
}

/**
 * Parse bot message keys. Format: "bot.<key>" or "bot.<key>:{json params}"
 * Returns null if not a bot key (legacy plain text).
 */
function parseBotKey(
  text: string,
): { key: string; params: Record<string, string | number> } | null {
  if (!text.startsWith('bot.')) return null;
  const colonIdx = text.indexOf(':');
  if (colonIdx === -1) {
    return { key: text.slice(4), params: {} };
  }
  try {
    const key = text.slice(4, colonIdx);
    const params = JSON.parse(text.slice(colonIdx + 1)) as Record<string, string | number>;
    return { key, params };
  } catch {
    return null;
  }
}

export function GameChat({ messages, myId, playerNames }: GameChatProps) {
  const t = useTranslations('game.chat');
  const bottomRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);

  // Scroll to bottom when message count increases
  useEffect(() => {
    if (messages.length > countRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    countRef.current = messages.length;
  });

  const renderBotText = useCallback(
    (text: string) => {
      const parsed = parseBotKey(text);
      if (!parsed) return text;
      return t(`bot.${parsed.key}`, parsed.params);
    },
    [t],
  );

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-2 py-1" aria-live="polite">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            'py-0.5 text-sm',
            msg.kind === 'bot' && 'text-accent-cyan',
            msg.kind === 'player' && msg.authorId === myId && 'text-text-primary',
            msg.kind === 'player' && msg.authorId !== myId && 'text-text-secondary',
          )}
        >
          {msg.kind === 'bot' ? (
            <span>{renderBotText(msg.text)}</span>
          ) : (
            <span>
              <span className="font-semibold">
                {msg.authorId === myId
                  ? t('you')
                  : (playerNames?.get(msg.authorId) ?? msg.authorId)}
              </span>
              {': '}
              {msg.text}
            </span>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
