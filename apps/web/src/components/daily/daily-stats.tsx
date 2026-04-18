'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { DailyHistoryEntry } from '@wts/shared';
import { Award, CheckCircle2, Flame, Gamepad2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DailyStatsProps {
  entries: DailyHistoryEntry[];
  currentStreak: number;
  maxStreak: number;
}

export function DailyStats({ entries, currentStreak, maxStreak }: DailyStatsProps) {
  const t = useTranslations('dailyHistory.stats');

  const totalPlayed = entries.length;
  const totalCorrect = entries.filter((e) => e.isCorrect).length;
  const accuracy = totalPlayed > 0 ? Math.round((totalCorrect / totalPlayed) * 100) : 0;

  const stats = [
    { label: t('totalPlayed'), value: totalPlayed, icon: Gamepad2, color: 'text-accent-cyan' },
    { label: t('accuracy'), value: `${accuracy}%`, icon: CheckCircle2, color: 'text-accent-green' },
    { label: t('currentStreak'), value: currentStreak, icon: Flame, color: 'text-accent-orange' },
    { label: t('maxStreak'), value: maxStreak, icon: Award, color: 'text-accent-yellow' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex flex-col items-center gap-1 py-3">
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
            <span className="font-display text-xl font-bold tabular-nums">{stat.value}</span>
            <span className="text-xs text-text-muted">{stat.label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
