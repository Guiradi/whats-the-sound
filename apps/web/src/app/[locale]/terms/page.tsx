import { LegalPage } from '@/components/legal/legal-page';
import type { Locale } from '@/i18n/config';
import { readLegalSections } from '@/lib/legal-sections';
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
  return { title: t('termsTitle'), description: t('termsDescription') };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TermsContent />;
}

function TermsContent() {
  const t = useTranslations('legal.terms');
  const sections = readLegalSections(useMessages(), 'terms');
  return <LegalPage title={t('title')} lastUpdated={t('lastUpdated')} sections={sections} />;
}
