import type { Locale } from '@/i18n/config';
import { APP_BASE_URL } from '@/lib/app-url';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

function dayNumberFromDate(): number {
  // Mirror getDayNumber in apps/server/src/services/daily-service.ts so the
  // OG image route is hit with a stable per-day number for cache locality.
  const epoch = new Date('2026-04-01').getTime();
  const target = new Date(new Date().toISOString().slice(0, 10)).getTime();
  return Math.floor((target - epoch) / (24 * 60 * 60 * 1000)) + 1;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const dayNumber = dayNumberFromDate();
  const ogPath = `/api/og/daily/${dayNumber}?locale=${locale}`;
  const title = t('dailyTitle');
  const description = t('dailyDescription');
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${APP_BASE_URL}/${locale}/daily`,
      images: [{ url: ogPath, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogPath],
    },
  };
}

export default function DailyLayout({ children }: { children: ReactNode }) {
  return children;
}
