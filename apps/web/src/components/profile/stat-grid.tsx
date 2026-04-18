import { cn } from '@/lib/utils';
import {
  Award,
  CalendarCheck,
  CalendarHeart,
  CheckCircle2,
  Coins,
  Flame,
  Gamepad2,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ComponentType, SVGProps } from 'react';

export interface ProfileStats {
  total_games: number;
  total_wins: number;
  total_correct: number;
  daily_streak: number;
  max_daily_streak: number;
  points_total: number;
  level: number;
  xp: number;
  login_streak: number;
  max_login_streak: number;
}

type Accent = 'cyan' | 'magenta' | 'yellow' | 'green' | 'orange';

interface StatDef {
  key: keyof ProfileStats;
  labelKey: keyof typeof labelMap;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent: Accent;
}

const labelMap = {
  totalGames: 'totalGames',
  totalWins: 'totalWins',
  totalCorrect: 'totalCorrect',
  dailyStreak: 'dailyStreak',
  maxDailyStreak: 'maxDailyStreak',
  pointsTotal: 'pointsTotal',
  level: 'level',
  xp: 'xp',
  loginStreak: 'loginStreak',
  maxLoginStreak: 'maxLoginStreak',
} as const;

const accentClass: Record<Accent, string> = {
  cyan: 'text-accent-cyan',
  magenta: 'text-accent-magenta',
  yellow: 'text-accent-yellow',
  green: 'text-accent-green',
  orange: 'text-accent-orange',
};

const stats: StatDef[] = [
  { key: 'level', labelKey: 'level', icon: Sparkles, accent: 'magenta' },
  { key: 'xp', labelKey: 'xp', icon: Award, accent: 'magenta' },
  { key: 'total_games', labelKey: 'totalGames', icon: Gamepad2, accent: 'cyan' },
  { key: 'total_wins', labelKey: 'totalWins', icon: Trophy, accent: 'yellow' },
  { key: 'total_correct', labelKey: 'totalCorrect', icon: CheckCircle2, accent: 'green' },
  { key: 'daily_streak', labelKey: 'dailyStreak', icon: Flame, accent: 'orange' },
  { key: 'max_daily_streak', labelKey: 'maxDailyStreak', icon: Flame, accent: 'orange' },
  { key: 'login_streak', labelKey: 'loginStreak', icon: CalendarCheck, accent: 'cyan' },
  { key: 'max_login_streak', labelKey: 'maxLoginStreak', icon: CalendarHeart, accent: 'cyan' },
  { key: 'points_total', labelKey: 'pointsTotal', icon: Coins, accent: 'yellow' },
];

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function StatGrid({ stats: values, locale }: { stats: ProfileStats; locale: string }) {
  const t = useTranslations('profile.stats');
  return (
    <section aria-labelledby="stats-heading" className="flex flex-col gap-3">
      <h2
        id="stats-heading"
        className="text-sm font-semibold uppercase tracking-wider text-text-muted"
      >
        {t('heading')}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ key, labelKey, icon: Icon, accent }) => (
          <div
            key={key}
            className="flex flex-col gap-2 rounded-lg border border-bg-border bg-bg-surface p-3"
          >
            <Icon className={cn('h-4 w-4', accentClass[accent])} aria-hidden="true" />
            <span className="font-[family-name:var(--font-display)] text-2xl font-semibold text-text-primary tabular-nums">
              {formatNumber(values[key], locale)}
            </span>
            <span className="text-xs text-text-secondary">{t(labelKey)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
