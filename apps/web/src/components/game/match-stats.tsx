'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { RoomPlayer, RoomStateSnapshot } from '@wts/shared';
import { CheckCircle2, Gamepad2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface MatchStatsProps {
  snapshot: RoomStateSnapshot;
  players: RoomPlayer[];
}

export function MatchStats({ snapshot, players }: MatchStatsProps) {
  const t = useTranslations('game.results.stats');
  const totalCorrect = players.reduce((sum, p) => sum + p.correctCount, 0);

  const stats = [
    {
      label: t('rounds'),
      value: snapshot.room.config.maxRounds,
      icon: Gamepad2,
      color: 'text-accent-cyan',
    },
    { label: t('players'), value: players.length, icon: Users, color: 'text-accent-magenta' },
    {
      label: t('totalCorrect'),
      value: totalCorrect,
      icon: CheckCircle2,
      color: 'text-accent-green',
    },
  ];

  return (
    <div className="grid w-full max-w-md grid-cols-3 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="flex flex-col items-center gap-1 p-3">
          <stat.icon className={cn('h-5 w-5', stat.color)} />
          <span className="font-mono text-xl font-bold text-text-primary tabular-nums">
            {stat.value}
          </span>
          <span className="text-center text-xs text-text-muted">{stat.label}</span>
        </Card>
      ))}
    </div>
  );
}
