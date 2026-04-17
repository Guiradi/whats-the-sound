import { LegalPage } from '@/components/legal/legal-page';
import type { Locale } from '@/i18n/config';
import type { Metadata } from 'next';
import { useMessages, useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  return { title: t('privacyTitle'), description: t('privacyDescription') };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PrivacyContent />;
}

function PrivacyContent() {
  const t = useTranslations('legal.privacy');
  const messages = useMessages() as unknown as {
    legal: {
      privacy: {
        sections: Array<{ title: string; body?: string[]; intro?: string; list?: string[] }>;
      };
    };
  };
  return (
    <LegalPage
      title={t('title')}
      lastUpdated={t('lastUpdated')}
      sections={messages.legal.privacy.sections}
    />
  );
}
