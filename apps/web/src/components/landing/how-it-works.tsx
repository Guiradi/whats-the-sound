import { Headphones, MessageSquare, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';

const steps = [
  { key: 'listen', icon: Headphones, color: 'text-accent-cyan' },
  { key: 'guess', icon: MessageSquare, color: 'text-accent-magenta' },
  { key: 'compete', icon: Trophy, color: 'text-accent-yellow' },
] as const;

export function HowItWorks() {
  const t = useTranslations('home.howItWorks');

  return (
    <section className="w-full bg-bg-surface/50 px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-10 text-center font-display text-3xl font-bold">{t('title')}</h2>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.key} className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-surface ring-1 ring-bg-border">
                <step.icon className={`h-8 w-8 ${step.color}`} />
              </div>
              <span className="text-sm font-bold text-text-muted">
                {t('stepLabel', { n: i + 1 })}
              </span>
              <h3 className="font-display text-lg font-bold">{t(`steps.${i}.title`)}</h3>
              <p className="text-sm text-text-secondary">{t(`steps.${i}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
