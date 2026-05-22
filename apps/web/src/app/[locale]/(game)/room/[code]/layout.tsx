import { type Locale } from '@/i18n/config';
import { APP_BASE_URL } from '@/lib/app-url';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; code: string }>;
}): Promise<Metadata> {
  const { locale, code } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const upperCode = code.toUpperCase();
  const ogPath = `/api/og/room/${upperCode}`;
  // Use the existing roomTitle ("Sala — ...") with the code prepended; avoids
  // adding a new i18n key for what is effectively a decoration.
  const baseTitle = t('roomTitle');
  const title = `${upperCode} · ${baseTitle}`;
  const description = t('roomDescription');
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${APP_BASE_URL}/${locale}/room/${upperCode}`,
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

export default function RoomLayout({ children }: { children: ReactNode }) {
  return children;
}
