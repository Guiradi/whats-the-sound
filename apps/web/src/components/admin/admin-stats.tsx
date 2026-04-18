'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { env } from '@/env';
import { Calendar, Gamepad2, Music, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

interface StatsData {
  users: {
    total: number;
    registered: number;
    guests: number;
    admins: number;
  };
  games: {
    total: number;
    active: number;
    finished: number;
    waiting: number;
  };
  daily: {
    totalPlayed: number;
    totalCompleted: number;
  };
  catalog: {
    total: number;
    active: number;
    inactive: number;
    byDifficulty: { easy: number; medium: number; hard: number };
    byCategory: Record<string, { total: number; active: number }>;
  };
}

export function AdminStats() {
  const t = useTranslations('admin.stats');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/admin/stats`, {
        headers: { 'x-user-id': 'admin' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setStats(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['skel-1', 'skel-2', 'skel-3', 'skel-4'].map((id) => (
          <Card key={id} className="animate-pulse">
            <CardHeader>
              <div className="h-4 w-24 rounded bg-bg-surface-hover" />
              <div className="mt-2 h-8 w-16 rounded bg-bg-surface-hover" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return <p className="text-sm text-accent-red">{t('error')}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={Users}
        title={t('players')}
        value={stats.users.total}
        details={[
          { label: t('registered'), value: stats.users.registered },
          { label: t('guests'), value: stats.users.guests },
          { label: t('admins'), value: stats.users.admins },
        ]}
      />
      <StatCard
        icon={Gamepad2}
        title={t('games')}
        value={stats.games.total}
        details={[
          { label: t('gamesActive'), value: stats.games.active },
          { label: t('gamesFinished'), value: stats.games.finished },
          { label: t('gamesWaiting'), value: stats.games.waiting },
        ]}
      />
      <StatCard
        icon={Calendar}
        title={t('daily')}
        value={stats.daily.totalPlayed}
        details={[{ label: t('dailyCompleted'), value: stats.daily.totalCompleted }]}
      />
      <StatCard
        icon={Music}
        title={t('catalog')}
        value={stats.catalog.total}
        details={[
          { label: t('activeSongs'), value: stats.catalog.active },
          { label: t('inactiveSongs'), value: stats.catalog.inactive },
          { label: t('easy'), value: stats.catalog.byDifficulty.easy },
          { label: t('medium'), value: stats.catalog.byDifficulty.medium },
          { label: t('hard'), value: stats.catalog.byDifficulty.hard },
        ]}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  details,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: number;
  details: Array<{ label: string; value: number }>;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent-cyan" />
          <CardTitle className="text-sm font-medium text-text-secondary">{title}</CardTitle>
        </div>
        <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-text-primary">
          {value}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {details.map((d) => (
            <span key={d.label} className="text-xs text-text-muted">
              {d.label}: <span className="text-text-secondary">{d.value}</span>
            </span>
          ))}
        </div>
      </CardHeader>
    </Card>
  );
}
