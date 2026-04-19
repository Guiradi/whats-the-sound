'use client';

import { LevelBadge } from '@/components/shared/level-badge';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@wts/shared';
import { decodeBotEvent } from '@wts/shared';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef } from 'react';

interface GameChatProps {
  messages: ChatMessage[];
  myId: string | null;
  playerNames?: Map<string, string>;
  playerLevels?: Map<string, number | null>;
}

export function GameChat({ messages, myId, playerNames, playerLevels }: GameChatProps) {
  const t = useTranslations('game.chat');
  const bottomRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);

  useEffect(() => {
    if (messages.length > countRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    countRef.current = messages.length;
  });

  const renderBotText = useCallback(
    (text: string) => {
      const event = decodeBotEvent(text);
      if (!event) return text;
      return t(`bot.${event.key}`, event.params);
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
              <LevelBadge level={playerLevels?.get(msg.authorId) ?? null} className="mr-1" />
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
