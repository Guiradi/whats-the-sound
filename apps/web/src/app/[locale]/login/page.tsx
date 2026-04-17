import { LoginForm } from '@/components/auth/login-form';
import { HashDebugLogger } from '@/components/auth/hash-debug-logger';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  return {
    title: t('loginTitle'),
    description: t('loginDescription'),
  };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next, error } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'auth.login' });

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-accent-cyan"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToHome')}
          </Link>
          <div className="rounded-xl border border-bg-border bg-bg-surface p-6 shadow-lg">
            <div className="mb-6">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-text-primary">
                {t('title')}
              </h1>
              <p className="mt-1 text-sm text-text-secondary">{t('subtitle')}</p>
            </div>
            {error ? (
              <div
                role="alert"
                className="mb-4 rounded-md border border-accent-red/40 bg-accent-red/10 px-3 py-2 text-sm text-accent-red"
              >
                {t('error')}
              </div>
            ) : null}
            <LoginForm next={next} />
            <HashDebugLogger />
          </div>
        </div>
      </main>
      <footer className="flex justify-center px-6 py-6">
        <LocaleSwitcher />
      </footer>
    </div>
  );
}
