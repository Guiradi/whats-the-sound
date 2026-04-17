'use client';

import { cn } from '@/lib/utils';
import type { ChatMessage } from '@wts/shared';
import { useEffect, useRef } from 'react';

interface GameChatProps {
  messages: ChatMessage[];
  myId: string | null;
}

export function GameChat({ messages, myId }: GameChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);

  // Scroll to bottom when message count increases
  useEffect(() => {
    if (messages.length > countRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    countRef.current = messages.length;
  });

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
            <span>{msg.text}</span>
          ) : (
            <span>
              <span className="font-semibold">{msg.authorId === myId ? 'You' : msg.authorId}</span>
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
