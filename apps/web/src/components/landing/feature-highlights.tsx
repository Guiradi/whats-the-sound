import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Headphones, Sparkles, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

const features = [
  { key: 'multiplayer', icon: Users, color: 'text-accent-cyan' },
  { key: 'daily', icon: CalendarDays, color: 'text-accent-magenta' },
  { key: 'midi', icon: Headphones, color: 'text-accent-yellow' },
  { key: 'xp', icon: Sparkles, color: 'text-accent-green' },
] as const;

export function FeatureHighlights() {
  const t = useTranslations('home.features');

  return (
    <section className="w-full px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-10 text-center font-display text-3xl font-bold">{t('title')}</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feat, i) => (
            <Card key={feat.key}>
              <CardHeader>
                <feat.icon className={`h-6 w-6 ${feat.color}`} />
                <CardTitle>{t(`items.${i}.title`)}</CardTitle>
                <CardDescription>{t(`items.${i}.description`)}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">{t(`items.${i}.body`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
