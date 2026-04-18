import { TestPlaySandbox } from '@/components/admin/test-play-sandbox';
import type { Locale } from '@/i18n/config';
import { setRequestLocale } from 'next-intl/server';

export default async function AdminTestPlayPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <TestPlaySandbox catalogId={id} />;
}
