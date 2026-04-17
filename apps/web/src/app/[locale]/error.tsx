'use client';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors.boundary');

  useEffect(() => {
    // Report to console for dev; structured reporting can wire up later.
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <AlertTriangle className="h-12 w-12 text-accent-red" aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-text-primary">
          {t('title')}
        </h1>
        <p className="max-w-md text-sm text-text-secondary">{t('description')}</p>
        {error.digest ? (
          <p className="text-xs text-text-muted">{t('ref', { digest: error.digest })}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="primary" onClick={reset}>
          <RefreshCw className="h-4 w-4" />
          {t('tryAgain')}
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">
            <Home className="h-4 w-4" />
            {t('goHome')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
