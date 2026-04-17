'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { env } from '@/env';
import { useRouter } from '@/i18n/navigation';
import type { RoomStateSnapshot } from '@wts/shared';
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

const POLL_INTERVAL_MS = 5000;

export function RoomList() {
  const t = useTranslations('room');
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomStateSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchRooms() {
      try {
        const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/rooms`);
        if (res.ok && active) {
          const data = (await res.json()) as RoomStateSnapshot[];
          setRooms(data);
        }
      } catch {
        // Silently ignore fetch errors; list stays stale
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchRooms();
    const interval = setInterval(fetchRooms, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleJoin = useCallback(
    (code: string) => {
      router.push(`/room/${code}`);
    },
    [router],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-20 animate-pulse rounded-lg border border-bg-border bg-bg-surface" />
        <div className="h-20 animate-pulse rounded-lg border border-bg-border bg-bg-surface" />
        <div className="h-20 animate-pulse rounded-lg border border-bg-border bg-bg-surface" />
      </div>
    );
  }

  if (rooms.length === 0) {
    return <p className="py-8 text-center text-sm text-text-muted">{t('list.empty')}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {rooms.map((room) => (
        <Card key={room.room.code} className="flex items-center gap-4 p-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-accent-cyan">{room.room.code}</span>
              <Badge variant="default">{t(`categories.${room.room.config.category}`)}</Badge>
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-text-muted">
              <Users className="h-3.5 w-3.5" />
              {t('list.players', {
                current: room.players.length,
                max: room.room.config.maxPlayers,
              })}
            </div>
          </div>
          <Button size="sm" onClick={() => handleJoin(room.room.code)}>
            {t('list.join')}
          </Button>
        </Card>
      ))}
    </div>
  );
}
