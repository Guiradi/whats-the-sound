import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { CalendarDays, Flame, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DailyCardProps {
  dailyStreak: number;
}

export function DailyCard({ dailyStreak }: DailyCardProps) {
  const t = useTranslations('home.dashboard.daily');

  return (
    <section
      className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-accent-cyan/30 p-6 shadow-[var(--shadow-glow-cyan)]"
      style={{
        background: 'linear-gradient(135deg, rgba(0,240,255,0.12) 0%, rgba(255,0,170,0.12) 100%)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-1 h-6 w-6 shrink-0 text-accent-cyan" aria-hidden="true" />
          <div>
            <h2 className="font-display text-xl font-bold text-text-primary">{t('title')}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t('description')}</p>
          </div>
        </div>
        {dailyStreak > 0 && (
          <div className="flex items-center gap-1.5 rounded-full border border-accent-orange/40 bg-bg-surface/70 px-3 py-1">
            <Flame className="h-4 w-4 text-accent-orange" aria-hidden="true" />
            <span className="font-mono text-xs font-semibold text-text-primary tabular-nums">
              {t('streak', { count: dailyStreak })}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/daily" className="flex-1">
          <Button variant="primary" size="lg" className="w-full gap-2">
            <Play className="h-5 w-5" />
            {t('playCta')}
          </Button>
        </Link>
        <Link href="/daily/history" className="sm:flex-1">
          <Button variant="secondary" size="lg" className="w-full">
            {t('historyCta')}
          </Button>
        </Link>
      </div>
    </section>
  );
}
